const LIGHTNING_ADDRESS = 'friendlysky737215@getalby.com';
export const GAME_PRICE_SATS = 1000;

export async function createGameInvoice() {
  const [user, domain] = LIGHTNING_ADDRESS.split('@');

  const metaRes = await fetch(`https://${domain}/.well-known/lnurlp/${user}`);
  if (!metaRes.ok) throw new Error('Cannot reach payment server. Check your connection.');
  const meta = await metaRes.json();
  if (meta.status === 'ERROR') throw new Error(meta.reason || 'Payment server error');

  const msats = GAME_PRICE_SATS * 1000;
  if (msats < meta.minSendable || msats > meta.maxSendable) {
    throw new Error('Payment amount outside allowed range');
  }

  const sep = meta.callback.includes('?') ? '&' : '?';
  const invoiceRes = await fetch(`${meta.callback}${sep}amount=${msats}`);
  if (!invoiceRes.ok) throw new Error('Failed to create invoice');
  const data = await invoiceRes.json();
  if (data.status === 'ERROR') throw new Error(data.reason || 'Invoice error');

  return data.pr;
}
