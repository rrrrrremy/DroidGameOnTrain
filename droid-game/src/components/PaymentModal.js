import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createGameInvoice, checkInvoicePaid, GAME_PRICE_SATS } from '../utils/lightning';

const POLL_INTERVAL_MS = 3000;

const PaymentModal = ({ onPaid, onCancel }) => {
  const [invoice, setInvoice] = useState(null); // { pr, verifyUrl }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
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

  // Poll Alby until the invoice settles
  useEffect(() => {
    if (!invoice || paid) return;
    const id = setInterval(async () => {
      try {
        if (await checkInvoicePaid(invoice.verifyUrl)) {
          setPaid(true);
        }
      } catch {
        // transient network error — keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [invoice, paid]);

  // Brief success flash, then unlock the game
  useEffect(() => {
    if (!paid) return;
    const t = setTimeout(onPaid, 1400);
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
            <small>Starting your game…</small>
          </div>
        )}

        {invoice && !paid && (
          <>
            <a
              className="payment-qr-wrap"
              href={`lightning:${invoice.pr}`}
              title="Tap to open in Lightning wallet"
              aria-label="Lightning invoice QR code — tap to open in wallet app"
            >
              <QRCodeSVG
                value={`lightning:${invoice.pr}`}
                size={192}
                bgColor="#f4f4f5"
                fgColor="#111213"
                level="M"
              />
            </a>
            <p className="payment-scan-hint">Scan with any Lightning wallet · or tap to open yours</p>

            <div className="payment-actions">
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
