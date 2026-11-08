import React from 'react';
import { APP_STORE_URL, isInsideApp } from '../utils/appStore';

/** A link to the iPhone app, shown only on the website. */
const AppStoreLink = () => (
  isInsideApp() ? null : (
    <a className="app-store-link" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
      <span className="app-store-link-kicker">Play every day on iPhone</span>
      <span className="app-store-link-title">Get Droid on the App Store</span>
    </a>
  )
);

export default AppStoreLink;
