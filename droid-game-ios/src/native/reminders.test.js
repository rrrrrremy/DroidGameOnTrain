import { LocalNotifications } from '@capacitor/local-notifications';
import {
  getReminderSetting,
  getReminderPermission,
  setReminderSetting,
  refreshReminders,
} from './reminders';

jest.mock('./ios', () => ({ isNative: () => true }));
jest.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    cancel: jest.fn(),
    schedule: jest.fn(),
  },
}));

const scheduled = () => LocalNotifications.schedule.mock.calls.at(-1)?.[0].notifications ?? [];
const permission = (display) => LocalNotifications.checkPermissions.mockResolvedValue({ display });

beforeEach(() => {
  localStorage.clear();
  // CRA resets mock implementations before each test, so set them here.
  LocalNotifications.cancel.mockResolvedValue(undefined);
  LocalNotifications.schedule.mockResolvedValue(undefined);
  permission('granted');
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 5, 9, 0)); // 9 am, 5 Oct
});

afterEach(() => jest.useRealTimers());

describe('the setting', () => {
  test('is on until the player turns it off', () => {
    expect(getReminderSetting()).toBe('on');
    localStorage.setItem('droid_reminders', 'off');
    expect(getReminderSetting()).toBe('off');
  });

  test('reports permission, treating anything unasked as prompt', async () => {
    permission('prompt-with-rationale');
    expect(await getReminderPermission()).toBe('prompt');
    permission('denied');
    expect(await getReminderPermission()).toBe('denied');
  });

  test('turning on asks for permission and reports a refusal, staying on', async () => {
    localStorage.setItem('droid_reminders', 'off');
    permission('prompt');
    LocalNotifications.requestPermissions.mockResolvedValue({ display: 'denied' });
    expect(await setReminderSetting(true)).toBe('denied');
    expect(getReminderSetting()).toBe('on');
  });

  test('turning off cancels everything', async () => {
    expect(await setReminderSetting(false)).toBe('off');
    expect(getReminderSetting()).toBe('off');
    expect(LocalNotifications.cancel).toHaveBeenCalled();
  });
});

describe('refreshReminders', () => {
  test('schedules nothing once turned off', async () => {
    localStorage.setItem('droid_reminders', 'off');
    await refreshReminders({ playedToday: false, streak: 3 });
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  test('never prompts on an ordinary refresh', async () => {
    permission('prompt');
    await refreshReminders({ playedToday: false, streak: 0 });
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  test('asks once after a round, and schedules when allowed', async () => {
    permission('prompt');
    LocalNotifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    await refreshReminders({ playedToday: true, streak: 1, askIfNeeded: true });
    expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    expect(scheduled()).toHaveLength(7);
  });

  test('schedules nothing when permission was refused', async () => {
    permission('denied');
    await refreshReminders({ playedToday: false, streak: 2, askIfNeeded: true });
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  test('unplayed today: a reminder at 6 pm today naming the streak, then a week of plain ones', async () => {
    await refreshReminders({ playedToday: false, streak: 4 });
    const n = scheduled();
    expect(n).toHaveLength(8);
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 5, 18, 0));
    expect(n[0].title).toBe('Keep your 4-day streak');
    expect(n[1].title).toBe("Today's Droid is ready");
  });

  test('played today: nothing today, and tomorrow names the streak', async () => {
    await refreshReminders({ playedToday: true, streak: 5 });
    const n = scheduled();
    expect(n).toHaveLength(7);
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 6, 18, 0));
    expect(n[0].title).toBe('Keep your 5-day streak');
  });

  test('after 6 pm unplayed: no reminder in the past, and the streak is not promised', async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 20, 0));
    await refreshReminders({ playedToday: false, streak: 4 });
    const n = scheduled();
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 6, 18, 0));
    expect(n[0].title).toBe("Today's Droid is ready");
  });
});
