export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { action } = req.body;

    // ── Google Calendar: Get busy times ──────────────────────────────────
    if (action === 'getBusy') {
      const accessToken = await getGoogleAccessToken();
      const { date } = req.body;
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: `${date}T00:00:00-04:00`,
          timeMax: `${date}T23:59:59-04:00`,
          timeZone: 'America/New_York',
          items: [{ id: 'primary' }],
        }),
      });
      const calData = await calRes.json();
      return res.status(200).json({ busy: calData.calendars?.primary?.busy || [] });
    }

    // ── Google Calendar: Create event ────────────────────────────────────
    if (action === 'createEvent') {
      const accessToken = await getGoogleAccessToken();
      const { event } = req.body;
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const calData = await calRes.json();
      await sendEmailViaResend(
        'jwlegacyrealty@gmail.com',
        `New Booking — ${event.summary}`,
        `A new session has been booked!\n\n${event.description}\n\nDate/Time: ${event.start.dateTime}\n\nThis has been added to your Google Calendar automatically.`
      );
      return res.status(200).json(calData);
    }

    // ── Mailchimp: Add contact ────────────────────────────────────────────
    if (action === 'addToMailchimp') {
      const { name, email, phone, level, goal, tags } = req.body;
      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ');
      const server = process.env.MAILCHIMP_SERVER;
      const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
      const apiKey = process.env.MAILCHIMP_API_KEY;

      console.log('Mailchimp attempt:', { server, audienceId, email, tags });

      const mcRes = await fetch(
        `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `apikey ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
            merge_fields: {
              FNAME: firstName,
              LNAME: lastName,
              PHONE: phone || '',
            },
            tags: tags || ['Tennis'],
          }),
        }
      );
      const mcData = await mcRes.json();
      console.log('Mailchimp response:', JSON.stringify(mcData));
      return res.status(200).json({ success: true, mailchimp: mcData });
    }

    // ── Email: Send via Resend ────────────────────────────────────────────
    if (action === 'sendEmail') {
      const { to, subject, body } = req.body;
      await sendEmailViaResend(to, subject, body);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getGoogleAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  return data.access_token;
}

async function sendEmailViaResend(to, subject, body) {
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Court Pro <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: body,
    }),
  });
  const emailData = await emailRes.json();
  console.log('Resend response:', JSON.stringify(emailData));
  return emailData;
}
