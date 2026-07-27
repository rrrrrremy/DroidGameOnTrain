import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.css';
import './styles/ios.css';
import DroidGame from './components/DroidGame';
import { initNativeShell } from './native/ios';

initNativeShell();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DroidGame />
  </React.StrictMode>
);
