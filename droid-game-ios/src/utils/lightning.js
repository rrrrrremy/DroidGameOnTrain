// Lightning pay-per-game over LNURL-pay (LUD-16 lightning address) with
// LUD-21 verify. The app is a static client with no backend, so the whole
// flow is two HTTPS endpoints served by whatever stack fronts the address:
//
//   1. https://<host>/.well-known/lnurlp/<name>   -> pay params + callback
//   2. <callback>?amount=<msats>                  -> { pr, verify }
//
// The verify URL is then polled until the invoice settles. The preimage it
// returns is the cryptographic receipt for the payment. Anything speaking
// these two endpoints works here — currently an Alby-fronted address whose
// funds land on our own Alby Hub node.

// Changing this constant is the entire wallet migration. The modal fails
// loudly if the new address's callback offers no LUD-21 verify URL.
export const LIGHTNING_ADDRESS = 'friendlysky737215@getalby.com';

export const GAME_PRICE_SATS = 100;

// LNURL invoices are short-lived. After this long the QR on screen may be
// for an invoice the node will no longer accept, so the UI offers a fresh
// one instead of waiting forever on a payment that can never arrive.
export const INVOICE_STALE_MS = 10 * 60 * 1000;

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

  // LUD-21: without a verify URL, settlement cannot be confirmed client-side.
  return { pr: data.pr, verifyUrl: data.verify || null, createdAt: Date.now() };
}

/**
 * Poll the LUD-21 verify endpoint. Resolves to `{ settled, preimage }`;
 * the preimage is only present once the invoice has settled.
 */
export async function checkInvoicePaid(verifyUrl, expectedPr) {
  const res = await fetch(verifyUrl);
  if (!res.ok) return { settled: false, preimage: null };
  const data = await res.json();
  if (data.status === 'ERROR') return { settled: false, preimage: null };

  // The endpoint echoes which invoice it is reporting on. If it names a
  // different one, this answer proves nothing about ours.
  if (data.pr && expectedPr && data.pr !== expectedPr) {
    return { settled: false, preimage: null };
  }

  return { settled: data.settled === true, preimage: data.preimage || null };
}
