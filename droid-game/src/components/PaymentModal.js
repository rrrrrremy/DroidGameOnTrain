import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createGameInvoice, GAME_PRICE_SATS } from '../utils/lightning';

const PaymentModal = ({ onPaid, onCancel }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    createGameInvoice()
      .then(setInvoice)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable — user can copy from the text field
    }
  };

  return (
    <div className="payment-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
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

        {invoice && (
          <>
            <a
              className="payment-qr-wrap"
              href={`lightning:${invoice}`}
              title="Tap to open in Lightning wallet"
              aria-label="Lightning invoice QR code — tap to open in wallet app"
            >
              <QRCodeSVG
                value={`lightning:${invoice}`}
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
              <button className="button primary" onClick={onPaid}>
                I've Paid →
              </button>
            </div>
          </>
        )}

        <button className="payment-cancel-link" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default PaymentModal;
