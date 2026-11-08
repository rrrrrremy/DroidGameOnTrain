/**
 * Sharing a result - the web version. Uses the browser's share sheet where
 * there is one (phones, Safari, Edge) and copies to the clipboard elsewhere.
 * The iOS sync points the game at native/share.js, which has this same
 * interface and uses the native share sheet.
 *
 * Resolves to 'shared', 'copied' or 'cancelled'.
 */
const copy = async (text) => {
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

export const shareText = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Some desktop browsers expose share() but refuse it; fall through.
    }
  }
  await copy(text);
  return 'copied';
};
