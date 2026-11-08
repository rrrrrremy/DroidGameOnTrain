import { InAppReview } from '@capacitor-community/in-app-review';
import { App } from '@capacitor/app';
import { maybeAskForReview } from './review';

jest.mock('./ios', () => ({ isNative: () => true }));
jest.mock('@capacitor-community/in-app-review', () => ({
  InAppReview: { requestReview: jest.fn() },
}));
jest.mock('@capacitor/app', () => ({ App: { getInfo: jest.fn() } }));

beforeEach(() => {
  localStorage.clear();
  InAppReview.requestReview.mockResolvedValue(undefined);
  App.getInfo.mockResolvedValue({ version: '1.6' });
  // Skip the short pause before the prompt.
  jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());
});

afterEach(() => jest.restoreAllMocks());

const ask = (args) => maybeAskForReview(args);

test('asks after a solved daily from the third one on', async () => {
  expect(await ask({ solved: true, played: 3 })).toBe(true);
  expect(InAppReview.requestReview).toHaveBeenCalledTimes(1);
});

test('never asks after an unsolved daily or too early', async () => {
  expect(await ask({ solved: false, played: 10 })).toBe(false);
  expect(await ask({ solved: true, played: 2 })).toBe(false);
  expect(InAppReview.requestReview).not.toHaveBeenCalled();
});

test('asks at most once per app version', async () => {
  await ask({ solved: true, played: 3 });
  expect(await ask({ solved: true, played: 4 })).toBe(false);
  App.getInfo.mockResolvedValue({ version: '1.7' });
  expect(await ask({ solved: true, played: 5 })).toBe(true);
  expect(InAppReview.requestReview).toHaveBeenCalledTimes(2);
});
