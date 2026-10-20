import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/courier-prime/400.css';
import '@fontsource/nanum-myeongjo/400.css';
import './styles.css';
import { Writer } from './features/writer/Writer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Writer />
  </StrictMode>,
);

// Offline shell + install support. Production only: in dev the SW would cache Vite's unbundled modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker registration failed:', err));
  });
}
