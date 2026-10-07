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
