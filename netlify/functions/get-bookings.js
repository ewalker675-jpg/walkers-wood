exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const response = await fetch('https://kvdb.io/c0de4b8c-843e-4b77-ba6e-7113e2126091/?prefix=booking_count_');
    if (!response.ok) {
      throw new Error('KVdb query failed');
    }
    const data = await response.json();
    
    // Map prefix array to a clean key-value object
    // KVdb lists keys as [ ["booking_count_YYYY-MM-DD", "value"], ... ]
    const bookings = {};
    if (Array.isArray(data)) {
      data.forEach(([key, val]) => {
        const dateStr = key.replace('booking_count_', '');
        bookings[dateStr] = parseInt(val) || 0;
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(bookings)
    };
  } catch (err) {
    console.error('get-bookings error:', err);
    // Return empty bookings on error so user can still select dates
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    };
  }
};
