import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { action } = req.body;

    // ── Redis helpers ─────────────────────────────────────────────────────
    async function redisGet(key) {
      const r = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      const d = await r.json();
      if (d.result === null || d.result === undefined) return null;
      let val = d.result;
      // Parse repeatedly: Upstash may return double-encoded JSON strings
      for (let i = 0; i < 5 && typeof val === 'string'; i++) {
        try { val = JSON.parse(val); } catch { break; }
      }
      // Unwrap legacy { value: ... } wrapper if present, then parse again
      for (let i = 0; i < 5; i++) {
        if (val && typeof val === 'object' && !Array.isArray(val) && 'value' in val && Object.keys(val).length === 1) {
          val = val.value;
          while (typeof val === 'string') {
            try { val = JSON.parse(val); } catch { break; }
          }
        } else {
          break;
        }
      }
      return val;
    }

    async function redisSet(key, value) {
      // Store as a single JSON string via the path form so reads round-trip cleanly
      await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
      });
    }

    // ── Save lead ─────────────────────────────────────────────────────────
    if (action === 'saveLead') {
      const { lead } = req.body;
      const existing = await redisGet(`lead:${lead.email.toLowerCase()}`);
      if (!existing) await redisSet(`lead:${lead.email.toLowerCase()}`, lead);
      return res.status(200).json({ success: true });
    }

    // ── Get lead ──────────────────────────────────────────────────────────
    if (action === 'getLead') {
      const { email } = req.body;
      const lead = await redisGet(`lead:${email.toLowerCase()}`);
      return res.status(200).json({ lead });
    }

    // ── Save booking ──────────────────────────────────────────────────────
    if (action === 'saveBooking') {
      const { booking } = req.body;
      const email = booking.customer.email.toLowerCase();
      const existing = await redisGet(`bookings:${email}`);
      const list = Array.isArray(existing) ? existing : [];
      list.push(booking);
      await redisSet(`bookings:${email}`, list);
      return res.status(200).json({ success: true });
    }

    // ── Get bookings ──────────────────────────────────────────────────────
    if (action === 'getBookings') {
      const { email } = req.body;
      const bookings = await redisGet(`bookings:${email.toLowerCase()}`);
      return res.status(200).json({ bookings: Array.isArray(bookings) ? bookings : [] });
    }

    // ── Get all leads (admin) ─────────────────────────────────────────────
    if (action === 'getAllLeads') {
      const r = await fetch(`${process.env.KV_REST_API_URL}/keys/lead:*`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      const d = await r.json();
      const keys = d.result || [];
      const leads = await Promise.all(keys.map(k => redisGet(k)));
      return res.status(200).json({ leads: leads.filter(Boolean) });
    }

    // ── Get all bookings (admin) ──────────────────────────────────────────
    if (action === 'getAllBookings') {
      const r = await fetch(`${process.env.KV_REST_API_URL}/keys/bookings:*`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      const d = await r.json();
      const keys = d.result || [];
      const all = await Promise.all(keys.map(k => redisGet(k)));
      const bookings = all.flat().filter(Boolean);
      return res.status(200).json({ bookings });
    }

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
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
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
      return res.status(200).json({ ...calData, eventId: calData.id });
    }

    // ── Google Calendar: Delete event ────────────────────────────────────
    if (action === 'deleteEvent') {
      const { eventId } = req.body;
      if (!eventId) return res.status(200).json({ success: false, reason: 'no eventId' });
      const accessToken = await getGoogleAccessToken();
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      return res.status(200).json({ success: true });
    }

    // ── Delete a booking from Redis ──────────────────────────────────────
    if (action === 'deleteBooking') {
      const { email, date, slotValue } = req.body;
      const key = `bookings:${email.toLowerCase()}`;
      const existing = await redisGet(key);
      const list = Array.isArray(existing) ? existing : [];
      const filtered = list.filter(b => !(b.date === date && b.slot?.value === slotValue));
      await redisSet(key, filtered);
      return res.status(200).json({ success: true, remaining: filtered.length });
    }

    // ── Mailchimp: Add/update contact ─────────────────────────────────────
    if (action === 'addToMailchimp') {
      const { name, email, phone, tags } = req.body;
      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ');
      const server = process.env.MAILCHIMP_SERVER;
      const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
      const apiKey = process.env.MAILCHIMP_API_KEY;
      const authHeader = 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64');
      const emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

      const mcRes = await fetch(
        `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members/${emailHash}`,
        {
          method: 'PUT',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_address: email,
            status_if_new: 'subscribed',
            status: 'subscribed',
            merge_fields: { FNAME: firstName, LNAME: lastName, PHONE: phone || '' },
          }),
        }
      );
      const mcData = await mcRes.json();
      console.log('Mailchimp upsert:', JSON.stringify(mcData));

      if (tags && tags.length > 0) {
        await new Promise(r => setTimeout(r, 1500));
        await fetch(
          `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members/${emailHash}/tags`,
          {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: tags.map(t => ({ name: t, status: 'active' })) }),
          }
        );
      }
      return res.status(200).json({ success: true });
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
