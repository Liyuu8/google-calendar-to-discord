import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');
const GOOGLE_REFRESH_TOKEN = defineSecret('GOOGLE_REFRESH_TOKEN');
const DISCORD_WEBHOOK_URL = defineSecret('DISCORD_WEBHOOK_URL');

export const notifyDiscordBeforeEvent = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Tokyo',
    secrets: [
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      DISCORD_WEBHOOK_URL,
    ],
  },
  async () => {
    const now = Date.now();
    const fiveMinutesLater = now + 5 * 60 * 1000;
    const windowStart = new Date(now).toISOString();
    const windowEnd = new Date(fiveMinutesLater).toISOString();

    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID.value(),
      GOOGLE_CLIENT_SECRET.value()
    );
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN.value() });
    const calendar = google.calendar({ version: 'v3', auth });

    const calendarListRes = await calendar.calendarList.list({
      maxResults: 50,
    });
    const notifiedEventKeys = new Set<string>();

    for (const calendarItem of calendarListRes.data.items ?? []) {
      if (!calendarItem.id) continue;

      const res = await calendar.events.list({
        calendarId: calendarItem.id,
        timeMin: windowStart,
        timeMax: windowEnd,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });

      for (const event of res.data.items ?? []) {
        if (!event.start?.dateTime || !event.id) continue;
        const eventStartAt = new Date(event.start.dateTime).getTime();
        const startBoundary = new Date(now).getTime();
        const endBoundary = new Date(fiveMinutesLater).getTime();
        if (
          Number.isNaN(eventStartAt) ||
          eventStartAt < startBoundary ||
          eventStartAt >= endBoundary
        )
          continue;

        const eventKey = `${calendarItem.id}:${event.id}:${event.start.dateTime}`;
        if (notifiedEventKeys.has(eventKey)) continue;
        notifiedEventKeys.add(eventKey);

        const startAtLabel = formatJst(
          event.start.dateTime ?? event.start.date
        );
        const endAtLabel = formatJst(event.end?.dateTime ?? event.end?.date);

        await fetch(DISCORD_WEBHOOK_URL.value(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title: 'まもなく予定が始まります🔔',
                color: hexColorToDiscordInt(calendarItem.backgroundColor),
                fields: [
                  {
                    name: 'カレンダー',
                    value: calendarItem.summary ?? calendarItem.id,
                  },
                  {
                    name: 'タイトル',
                    value: event.summary ?? '（未設定）',
                  },
                  {
                    name: '開始',
                    value: startAtLabel,
                  },
                  {
                    name: '終了',
                    value: endAtLabel,
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
  }
);

const formatJst = (value?: string | null): string => {
  if (!value) return '（未設定）';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '（未設定）';

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const hexColorToDiscordInt = (color?: string | null): number => {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return 0x4285f4;

  return parseInt(color.slice(1), 16);
};
