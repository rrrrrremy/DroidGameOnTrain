// Sharing a result from the iOS app: the native share sheet (Messages,
// WhatsApp, Copy...). Same interface as src/utils/share.js, the web
// version; the sync script points the game at this file instead.
//
// Resolves to 'shared', 'copied' or 'cancelled'.

import { Share } from '@capacitor/share';
import { copyText, isNative } from './ios';

export const shareText = async (text) => {
  if (isNative()) {
    try {
      await Share.share({ text, dialogTitle: 'Share your Droid' });
      return 'shared';
    } catch (error) {
      // The plugin rejects with "Share canceled" when the sheet is dismissed.
      if (/cancel/i.test(error?.message || '')) return 'cancelled';
    }
  }
  await copyText(text);
  return 'copied';
};
