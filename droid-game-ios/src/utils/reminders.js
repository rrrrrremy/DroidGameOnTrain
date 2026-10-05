/**
 * Daily reminder notifications - the web version, which has none.
 *
 * Reminders are local notifications scheduled by the iOS app itself (no
 * server). A browser can only notify through web push, which needs a push
 * server and barely works on iPhone Safari, so the website offers no
 * reminder and hides its settings. The iOS sync points the game at
 * native/reminders.js, which implements this same interface.
 */

/** Whether this build can send reminders at all. */
export const remindersSupported = () => false;

/** 'on' or 'off'. */
export const getReminderSetting = () => 'off';

/** 'granted', 'denied', 'prompt' (not asked yet) or 'unsupported'. */
export const getReminderPermission = async () => 'unsupported';

/** Turn reminders on or off. Resolves to the setting actually in force. */
export const setReminderSetting = async () => 'off';

/** Re-plan the coming week's reminders after a round or on opening. */
export const refreshReminders = async () => {};
