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
//
// On by default: the setting only reads 'off' once the player turns it off
// in Settings. iOS still needs the player's permission, which the game asks
// for after their first finished daily (refreshReminders with askIfNeeded),
// when a reminder makes sense, rather than as a cold prompt on first launch.
// Reminders actually go out when the setting is on AND permission is granted.

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
    return localStorage.getItem(SETTING_KEY) === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
};

/** 'granted', 'denied', 'prompt' (not asked yet) or 'unsupported'. */
export const getReminderPermission = async () => {
  if (!remindersSupported()) return 'unsupported';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' || display === 'denied' ? display : 'prompt';
  } catch {
    return 'unsupported';
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
 * Turn reminders on or off. Turning on asks iOS for permission if it has
 * not been asked yet. If permission is refused, resolves 'denied': the
 * setting stays on, so allowing notifications later in iOS Settings is
 * enough to start them, with no second trip to the switch.
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
    store('on');
    if (display !== 'granted') return 'denied';
  } catch {
    return 'off';
  }
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
 *   askIfNeeded   ask iOS for permission if never asked (after a daily
 *                 round); otherwise a refresh never shows a prompt
 */
export const refreshReminders = async ({ playedToday, streak, askIfNeeded = false }) => {
  if (!remindersSupported()) return;
  await cancelAll();
  if (getReminderSetting() !== 'on') return;

  let permission = await getReminderPermission();
  if (permission === 'prompt' && askIfNeeded) {
    try {
      ({ display: permission } = await LocalNotifications.requestPermissions());
    } catch {
      return;
    }
  }
  if (permission !== 'granted') return;

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
