import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  createGameInvoice,
  checkInvoicePaid,
  GAME_PRICE_SATS,
  INVOICE_STALE_MS,
} from '../utils/lightning';

const POLL_INTERVAL_MS = 3000;

// WebLN is injected by browser wallets (Alby extension and friends). Inside
// the iOS app it never exists, so everything WebLN quietly disappears there.
const hasWebLN = () => typeof window !== 'undefined' && !!window.webln;

const PaymentModal = ({ onPaid, onCancel }) => {
  const [invoice, setInvoice] = useState(null); // { pr, verifyUrl, createdAt }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [preimage, setPreimage] = useState(null);
  const [expired, setExpired] = useState(false);
  const [weblnBusy, setWeblnBusy] = useState(false);

  const requestInvoice = useCallback(() => {
    setLoading(true);
    setError(null);
    setExpired(false);
    setInvoice(null);
    createGameInvoice()
      .then((result) => {
        if (!result.verifyUrl) {
          throw new Error('Payment server does not support verification. Please try again later.');
        }
        setInvoice(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { requestInvoice(); }, [requestInvoice]);

  // Poll the node until the invoice settles
  useEffect(() => {
    if (!invoice || paid || expired) return;
    const id = setInterval(async () => {
      try {
        const result = await checkInvoicePaid(invoice.verifyUrl, invoice.pr);
        if (result.settled) {
          setPreimage(result.preimage);
          setPaid(true);
        }
      } catch {
        // transient network error — keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [invoice, paid, expired]);

  // A stale invoice can no longer be paid; stop the spinner and say so
  // instead of waiting forever on a payment that cannot arrive.
  useEffect(() => {
    if (!invoice || paid) return;
    const remaining = invoice.createdAt + INVOICE_STALE_MS - Date.now();
    const t = setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => clearTimeout(t);
  }, [invoice, paid]);

  // Brief success flash, then unlock the game
  useEffect(() => {
    if (!paid) return;
    const t = setTimeout(onPaid, 1800);
    return () => clearTimeout(t);
  }, [paid, onPaid]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoice.pr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable — user can copy from the text field
    }
  };

  // One-tap payment through the injected wallet. Settlement is still
  // confirmed by the verify polling — the wallet's word is not proof.
  const handleWebLN = async () => {
    setWeblnBusy(true);
    try {
      await window.webln.enable();
      await window.webln.sendPayment(invoice.pr);
    } catch {
      // user declined or wallet failed — the QR flow is still on screen
    } finally {
      setWeblnBusy(false);
    }
  };

  return (
    <div className="payment-overlay" onClick={(e) => e.target === e.currentTarget && !paid && onCancel()}>
      <div className="payment-modal">
        <div className="payment-header">
          <span className="payment-lightning-icon">⚡</span>
          <div>
            <strong className="payment-title">Play Any Shape</strong>
            <small className="payment-subtitle">{GAME_PRICE_SATS.toLocaleString()} sats · one game</small>
          </div>
        </div>

        {loading && (
          <div className="payment-loading-wrap">
            <div className="spinner" />
            <span>Creating invoice…</span>
          </div>
        )}

        {error && (
          <div className="payment-error-wrap">
            <p className="payment-error-text">{error}</p>
            <button className="button secondary" onClick={onCancel}>Go back</button>
          </div>
        )}

        {invoice && paid && (
          <div className="payment-success-wrap">
            <span className="payment-success-icon">✓</span>
            <strong>Payment received!</strong>
            {preimage && (
              <small className="payment-proof" title={preimage}>
                proof {preimage.slice(0, 8)}…{preimage.slice(-8)}
              </small>
            )}
            <small>Starting your game…</small>
          </div>
        )}

        {invoice && !paid && expired && (
          <div className="payment-error-wrap">
            <p className="payment-error-text">
              That invoice has expired without being paid.
            </p>
            <button className="button" onClick={requestInvoice}>New Invoice</button>
          </div>
        )}

        {invoice && !paid && !expired && (
          <>
            <a
              className="payment-qr-wrap"
              href={`lightning:${invoice.pr}`}
              title="Tap to open in Lightning wallet"
              aria-label="Lightning invoice QR code — tap to open in wallet app"
            >
              {/* Uppercase bech32 packs into the QR's alphanumeric mode:
                  fewer, larger modules, quicker scans. */}
              <QRCodeSVG
                value={`lightning:${invoice.pr.toUpperCase()}`}
                size={192}
                bgColor="#f4f4f5"
                fgColor="#111213"
                level="M"
              />
            </a>
            <p className="payment-scan-hint">Scan with any Lightning wallet · or tap to open yours</p>

            <div className="payment-actions">
              {hasWebLN() && (
                <button className="button" onClick={handleWebLN} disabled={weblnBusy}>
                  {weblnBusy ? 'Check your wallet…' : '⚡ Pay in Browser'}
                </button>
              )}
              <button className="button secondary" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy Invoice'}
              </button>
            </div>

            <div className="payment-waiting">
              <div className="spinner payment-waiting-spinner" />
              <span>Waiting for payment…</span>
            </div>
          </>
        )}

        {!paid && !loading && (
          <button className="payment-cancel-link" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
