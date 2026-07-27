// Thin wrapper around the Capacitor plugins used by the iOS build.
//
// Every helper degrades gracefully when the app runs in a plain browser
// (`npm start`), so the same source tree still works on the web.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = () => Capacitor.isNativePlatform();

/** Copy text using the native pasteboard on iOS, the web clipboard elsewhere. */
export const copyText = async (text) => {
  if (isNative()) {
    await Clipboard.write({ string: text });
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
};

/** Short tap feedback — used when placing or picking up a tile. */
export const tapFeedback = () => {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

/** Success / failure feedback for turn validation. */
export const resultFeedback = (ok) => {
  if (!isNative()) return;
  Haptics.notification({
    type: ok ? NotificationType.Success : NotificationType.Error,
  }).catch(() => {});
};

/**
 * Pull the `?g=` share token out of a URL, whether it arrived as a web URL
 * (https://…/?g=abc) or through the custom scheme (droid://play?g=abc).
 */
export const shareTokenFromUrl = (url) => {
  if (!url) return null;
  const match = /[?&]g=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Listen for the app being opened via a droid:// or universal link.
 * Returns a cleanup function. No-op outside the native shell.
 */
export const onShareLinkOpened = (handler) => {
  if (!isNative()) return () => {};

  const registration = App.addListener('appUrlOpen', ({ url }) => {
    const token = shareTokenFromUrl(url);
    if (token) handler(token);
  });

  // The launch URL fires before listeners are attached on a cold start.
  App.getLaunchUrl()
    .then((result) => {
      const token = shareTokenFromUrl(result && result.url);
      if (token) handler(token);
    })
    .catch(() => {});

  return () => {
    registration.then((r) => r.remove()).catch(() => {});
  };
};

/** One-time native chrome setup: dark status bar over the black game board. */
export const initNativeShell = () => {
  if (!isNative()) return;
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
};
