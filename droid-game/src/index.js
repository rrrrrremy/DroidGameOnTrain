import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.css';
import DroidGame from './components/DroidGame';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DroidGame />
  </React.StrictMode>
);
