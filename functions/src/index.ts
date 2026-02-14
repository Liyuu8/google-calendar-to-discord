import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { google } from 'googleapis';

const GOOGLE_CALENDAR_ID = defineString('GOOGLE_CALENDAR_ID', {
  default: 'primary',
});
const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');
const GOOGLE_REFRESH_TOKEN = defineSecret('GOOGLE_REFRESH_TOKEN');
const DISCORD_WEBHOOK_URL = defineSecret('DISCORD_WEBHOOK_URL');

export const notifyDiscordBeforeEvent = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Tokyo',
    secrets: [
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      DISCORD_WEBHOOK_URL,
    ],
  },
  async () => {
    const oneMinuteLater = Date.now() + 60 * 1000;
    const windowStart = new Date(oneMinuteLater - 30 * 1000).toISOString();
    const windowEnd = new Date(oneMinuteLater + 30 * 1000).toISOString();

    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID.value(),
      GOOGLE_CLIENT_SECRET.value()
    );
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN.value() });
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID.value(),
      timeMin: windowStart,
      timeMax: windowEnd,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    for (const event of res.data.items ?? []) {
      if (!event.start?.dateTime || !event.id) continue;

      await fetch(DISCORD_WEBHOOK_URL.value(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: 'まもなく予定が始まります🔔',
              color: 0x4285f4,
              fields: [
                {
                  name: 'タイトル',
                  value: event.summary ?? '（未設定）',
                },
                {
                  name: '場所',
                  value: event.location ?? '（未設定）',
                },
              ],
              timestamp: new Date().toISOString(),
              url: event.htmlLink,
            },
          ],
        }),
      });
    }
  }
);
