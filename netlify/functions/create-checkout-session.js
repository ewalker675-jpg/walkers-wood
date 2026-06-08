const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { product, productPrice, stacking, delivery, deliveryMiles, total, customer } = data;

    // Build line items
    const lineItems = [];

    // Main product
    lineItems.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: product,
          description: 'Premium hardwood firewood — oak, ash & cherry',
        },
        unit_amount: Math.round(productPrice * 100), // Stripe uses pence
      },
      quantity: 1,
    });

    // Stacking add-on
    if (stacking > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Log stacking service',
            description: 'Neatly stacked in your chosen location',
          },
          unit_amount: Math.round(stacking * 100),
        },
        quantity: 1,
      });
    }

    // Kindling add-on
    if (data.kindlingBags > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Large bag of kindling',
            description: 'Perfect for starting your fire quickly',
          },
          unit_amount: 800, // £8 per bag
        },
        quantity: data.kindlingBags,
      });
    }

    // Delivery charge
    if (delivery > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Delivery charge',
            description: deliveryMiles + ' miles from WR6 6DT',
          },
          unit_amount: Math.round(delivery * 100),
        },
        quantity: 1,
      });
    }

    // Build metadata for Ed's order notification
    const metadata = {
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_postcode: customer.postcode,
      delivery_date: customer.deliveryDate,
      delivery_miles: String(deliveryMiles),
      w3w: customer.w3w || '',
      drop_note: customer.dropNote || '',
      product_ordered: product,
      stacking_added: String(stacking > 0),
      kindling_qty: String(data.kindlingBags || 0),
      delivery_charge: String(delivery),
      total_price: String(total)
    };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customer.email,
      line_items: lineItems,
      metadata: metadata,
      success_url: event.headers.origin + '/firewood.html?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: event.headers.origin + '/firewood.html?payment=cancelled',
      // Send receipt email automatically
      payment_intent_data: {
        receipt_email: customer.email,
        metadata: metadata,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' }),
    };
  }
};
