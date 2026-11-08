/** The iPhone app on the App Store, and whether to advertise it here. */
export const APP_STORE_URL = 'https://apps.apple.com/app/droid/id6801041521';

/** True inside the iOS app, where pointing at the App Store makes no sense. */
export const isInsideApp = () =>
  typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
