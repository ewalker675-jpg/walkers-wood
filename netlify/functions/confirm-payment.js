const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const twilio = require('twilio');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { session_id } = JSON.parse(event.body);
    if (!session_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
    }

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Session not paid' }) };
    }

    const metadata = session.metadata || {};
    const deliveryDate = metadata.delivery_date;
    if (!deliveryDate) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing delivery date' }) };
    }

    // Check if session has already been processed in KV store
    let alreadyProcessed = false;
    try {
      const processedRes = await fetch(`https://kvdb.io/c0de4b8c-843e-4b77-ba6e-7113e2126091/processed_session_${session_id}`);
      if (processedRes.ok) {
        const text = await processedRes.text();
        if (text === 'true') {
          alreadyProcessed = true;
        }
      }
    } catch (kvErr) {
      console.error('KV get processed session error:', kvErr);
    }

    if (alreadyProcessed) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, alreadyProcessed: true })
      };
    }

    // Mark session as processed in KV
    try {
      await fetch(`https://kvdb.io/c0de4b8c-843e-4b77-ba6e-7113e2126091/processed_session_${session_id}`, {
        method: 'PUT',
        body: 'true'
      });
    } catch (kvErr) {
      console.error('KV put processed session error:', kvErr);
    }

    // Increment booking count for the delivery date in KV
    try {
      await fetch(`https://kvdb.io/c0de4b8c-843e-4b77-ba6e-7113e2126091/booking_count_${deliveryDate}/+`, {
        method: 'POST',
        body: '1'
      });
    } catch (kvErr) {
      console.error('KV increment booking error:', kvErr);
    }

    // Prepare notification variables
    const customerName = metadata.customer_name || 'Customer';
    const customerPhone = metadata.customer_phone || '';
    const customerEmail = session.customer_details?.email || session.customer_email || '';
    const deliveryAddress = `${metadata.customer_address || ''}, ${metadata.customer_postcode || ''}`;
    const w3w = metadata.w3w || 'None provided';
    const dropNote = metadata.drop_note || 'None provided';
    const productOrdered = metadata.product_ordered || '';
    const stackingAdded = metadata.stacking_added === 'true';
    const kindlingQty = parseInt(metadata.kindling_qty) || 0;
    const deliveryMiles = parseFloat(metadata.delivery_miles) || 0;
    const deliveryCharge = parseFloat(metadata.delivery_charge) || 0;
    const totalPrice = parseFloat(metadata.total_price) || 0;

    // Build notifications bodies
    const emailSubject = `New Walkers Wood Order — ${customerName} — ${deliveryDate}`;
    const emailHtml = `
      <h2>New Walkers Wood Order Confirmed</h2>
      <p>An order has been placed and payment has been confirmed via Stripe.</p>
      <hr />
      <h3>Customer Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${customerName}</li>
        <li><strong>Email:</strong> ${customerEmail}</li>
        <li><strong>Phone:</strong> ${customerPhone}</li>
      </ul>
      <h3>Delivery Details:</h3>
      <ul>
        <li><strong>Address:</strong> ${deliveryAddress}</li>
        <li><strong>What3Words:</strong> ${w3w}</li>
        <li><strong>Drop-off Instructions:</strong> ${dropNote}</li>
        <li><strong>Preferred Delivery Date:</strong> ${deliveryDate}</li>
        <li><strong>Distance:</strong> ${deliveryMiles} miles</li>
      </ul>
      <h3>Order Items:</h3>
      <ul>
        <li><strong>Product:</strong> ${productOrdered}</li>
        <li><strong>Log Stacking:</strong> ${stackingAdded ? `Yes (Stacking — ${productOrdered.split(' ')[0]})` : 'No'}</li>
        <li><strong>Kindling:</strong> ${kindlingQty > 0 ? `Yes (Kindling x${kindlingQty})` : 'No'}</li>
      </ul>
      <h3>Payment Summary:</h3>
      <ul>
        <li><strong>Delivery Charge:</strong> ${deliveryCharge === 0 ? 'FREE' : `£${deliveryCharge.toFixed(2)}`}</li>
        <li><strong>Total Paid:</strong> £${totalPrice.toFixed(2)} (inc VAT)</li>
      </ul>
    `;

    // Concise SMS body
    const smsBody = `New order: ${customerName}, ${productOrdered}${stackingAdded ? ' + stacking' : ''}${kindlingQty > 0 ? ` + kindling x${kindlingQty}` : ''}, delivery ${deliveryDate}. Address: ${deliveryAddress}. Phone: ${customerPhone}. Total: £${totalPrice.toFixed(2)}. Check email for full details.`;

    let emailSent = false;
    let smsSent = false;
    let emailErr = null;
    let smsErr = null;

    // Send Email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Walkers Wood Website" <${process.env.SMTP_USER}>`,
          to: 'edwardwalkerfarms@gmail.com',
          subject: emailSubject,
          html: emailHtml,
        });
        emailSent = true;
      } catch (err) {
        console.error('Email sending failed:', err);
        emailErr = err.message;
      }
    } else {
      console.log('--- MOCK EMAIL NOTIFICATION ---');
      console.log('Subject:', emailSubject);
      console.log('Body:', emailHtml);
      console.log('--------------------------------');
      emailSent = true; // Count mock as sent for logic fallback, but flag env warning
    }

    // Send SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: smsBody,
          from: process.env.TWILIO_FROM_NUMBER,
          to: '07583338879' // Ed's phone number
        });
        smsSent = true;
      } catch (err) {
        console.error('SMS sending failed:', err);
        smsErr = err.message;
      }
    } else {
      console.log('--- MOCK SMS NOTIFICATION ---');
      console.log('To: 07583 338879');
      console.log('Body:', smsBody);
      console.log('------------------------------');
      smsSent = true; // Count mock as sent for logic fallback
    }

    const notificationFailed = !emailSent || !smsSent || !process.env.SMTP_USER || !process.env.TWILIO_ACCOUNT_SID;
    const warningMsg = [];
    if (!process.env.SMTP_USER) warningMsg.push('SMTP credentials missing');
    else if (!emailSent) warningMsg.push(`Email error: ${emailErr}`);
    if (!process.env.TWILIO_ACCOUNT_SID) warningMsg.push('Twilio credentials missing');
    else if (!smsSent) warningMsg.push(`SMS error: ${smsErr}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        notificationFailed: notificationFailed,
        warning: warningMsg.join(', ')
      })
    };

  } catch (err) {
    console.error('confirm-payment error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
