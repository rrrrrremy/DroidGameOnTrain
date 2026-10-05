import { LocalNotifications } from '@capacitor/local-notifications';
import {
  getReminderSetting,
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

beforeEach(() => {
  localStorage.clear();
  // CRA resets mock implementations before each test, so set them here.
  LocalNotifications.cancel.mockResolvedValue(undefined);
  LocalNotifications.schedule.mockResolvedValue(undefined);
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 5, 9, 0)); // 9 am, 5 Oct
});

afterEach(() => jest.useRealTimers());

describe('setReminderSetting', () => {
  test('asks for permission and turns on when granted', async () => {
    LocalNotifications.checkPermissions.mockResolvedValue({ display: 'prompt' });
    LocalNotifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    expect(await setReminderSetting(true)).toBe('on');
    expect(getReminderSetting()).toBe('on');
  });

  test('stays off when permission is refused', async () => {
    LocalNotifications.checkPermissions.mockResolvedValue({ display: 'denied' });
    LocalNotifications.requestPermissions.mockResolvedValue({ display: 'denied' });
    expect(await setReminderSetting(true)).toBe('denied');
    expect(getReminderSetting()).toBe('off');
  });

  test('turning off cancels everything', async () => {
    localStorage.setItem('droid_reminders', 'on');
    expect(await setReminderSetting(false)).toBe('off');
    expect(LocalNotifications.cancel).toHaveBeenCalled();
  });
});

describe('refreshReminders', () => {
  test('schedules nothing while off', async () => {
    await refreshReminders({ playedToday: false, streak: 3 });
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  test('unplayed today: a reminder at 6 pm today naming the streak, then a week of plain ones', async () => {
    localStorage.setItem('droid_reminders', 'on');
    await refreshReminders({ playedToday: false, streak: 4 });
    const n = scheduled();
    expect(n).toHaveLength(8);
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 5, 18, 0));
    expect(n[0].title).toBe('Keep your 4-day streak');
    expect(n[1].title).toBe("Today's Droid is ready");
  });

  test('played today: nothing today, and tomorrow names the streak', async () => {
    localStorage.setItem('droid_reminders', 'on');
    await refreshReminders({ playedToday: true, streak: 5 });
    const n = scheduled();
    expect(n).toHaveLength(7);
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 6, 18, 0));
    expect(n[0].title).toBe('Keep your 5-day streak');
  });

  test('after 6 pm unplayed: no reminder in the past, and the streak is not promised', async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 20, 0));
    localStorage.setItem('droid_reminders', 'on');
    await refreshReminders({ playedToday: false, streak: 4 });
    const n = scheduled();
    expect(n[0].schedule.at).toEqual(new Date(2026, 9, 6, 18, 0));
    expect(n[0].title).toBe("Today's Droid is ready");
  });
});
