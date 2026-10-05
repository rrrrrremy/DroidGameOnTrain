import React from 'react';
import { CloseIcon } from './Icons';

/**
 * Settings, opened from the gear on the home screen. For now it holds the
 * daily reminder, which only the iOS app can send, so the gear is shown
 * only where reminders are supported.
 *
 * The switch shows what will actually happen: on only when the setting is
 * on and iOS allows notifications.
 */
const SettingsSheet = ({ reminderSetting, permission, note, onToggleReminder, onClose }) => {
  const on = reminderSetting === 'on' && permission !== 'denied';
  const blocked = reminderSetting === 'on' && permission === 'denied';

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <strong>Settings</strong>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </header>

        <div className="settings-row">
          <span className="settings-row-copy">
            <strong>Daily reminder</strong>
            <small>6 pm, only on days you haven't played</small>
          </span>
          <button
            className={`settings-switch${on ? ' is-on' : ''}`}
            role="switch"
            aria-checked={on}
            aria-label="Daily reminder"
            onClick={onToggleReminder}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        {(note || blocked) && (
          <p className="settings-note">
            {note || 'Notifications are off for Droid. Turn them on in the Settings app, under Notifications > Droid.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsSheet;
