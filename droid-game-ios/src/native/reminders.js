// Daily reminder notifications for the iOS app.
//
// Local notifications, scheduled by the app on the phone: no server, no
// account. Same interface as src/utils/reminders.js (the web version, which
// does nothing); the sync script points the game at this file instead.
//
// A scheduled notification cannot check at fire time whether the player
// has played, so the app re-plans the coming week every time it opens or a
// daily round ends: one reminder a day at REMINDER_HOUR, skipping today once
// today is played. If the app goes unopened for a week, the reminders stop
// rather than nag.

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './ios';

const SETTING_KEY = 'droid_reminders';
const REMINDER_HOUR = 18; // 6 pm, local time
const DAYS_AHEAD = 7;
// Our notification ids, one per day ahead. Kept clear of anything else.
const IDS = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => 7100 + i);

export const remindersSupported = () => isNative();

export const getReminderSetting = () => {
  try {
    return localStorage.getItem(SETTING_KEY) === 'on' ? 'on' : 'off';
  } catch {
    return 'off';
  }
};

const store = (value) => {
  try {
    localStorage.setItem(SETTING_KEY, value);
  } catch {
    // Without storage the setting lasts for this session only.
  }
};

const cancelAll = () =>
  LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) }).catch(() => {});

/**
 * Turn reminders on or off. Turning on asks iOS for permission the first
 * time; if the player has refused it, resolves 'denied' and stays off.
 */
export const setReminderSetting = async (on) => {
  if (!remindersSupported()) return 'off';
  if (!on) {
    store('off');
    await cancelAll();
    return 'off';
  }
  try {
    let { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
    if (display !== 'granted') {
      store('off');
      return 'denied';
    }
  } catch {
    return 'off';
  }
  store('on');
  return 'on';
};

const at = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
};

/**
 * Plan the next week's reminders.
 *   playedToday   today's daily is finished or forfeited
 *   streak        the current streak (alive through yesterday or today)
 */
export const refreshReminders = async ({ playedToday, streak }) => {
  if (!remindersSupported()) return;
  await cancelAll();
  if (getReminderSetting() !== 'on') return;

  const now = new Date();
  const notifications = [];
  for (let day = 0; day <= DAYS_AHEAD; day += 1) {
    if (day === 0 && (playedToday || at(0) <= now)) continue;
    const first = notifications.length === 0;
    // Only the next reminder can know the streak: by tomorrow it is one
    // longer if they play today, so today's count only fits today, and a
    // played-today count fits tomorrow.
    const streakNow = first && streak > 0 && (day === 0 || (day === 1 && playedToday))
      ? streak
      : 0;
    notifications.push({
      id: IDS[day],
      title: streakNow > 0 ? `Keep your ${streakNow}-day streak` : "Today's Droid is ready",
      body: streakNow > 0
        ? "Today's Droid is waiting. Six words, six minutes."
        : 'Six words. Six minutes. Sick Droids.',
      schedule: { at: at(day), allowWhileIdle: true },
    });
  }
  if (notifications.length === 0) return;
  await LocalNotifications.schedule({ notifications }).catch(() => {});
};
