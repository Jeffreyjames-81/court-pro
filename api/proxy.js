export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Step 1: Get fresh access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      console.error('Token error:', JSON.stringify(tokenData));
      return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
    }

    const { action, date, event } = req.body;

    // Step 2: Get busy times OR create event
    if (action === 'getBusy') {
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin: `${date}T00:00:00-04:00`,
            timeMax: `${date}T23:59:59-04:00`,
            timeZone: 'America/New_York',
            items: [{ id: 'primary' }],
          }),
        }
      );
      const calData = await calRes.json();
      const busy = calData.calendars?.primary?.busy || [];
      return res.status(200).json({ busy });
    }

    if (action === 'createEvent') {
      const calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
      const calData = await calRes.json();
      return res.status(200).json(calData);
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
