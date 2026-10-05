import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthenticationGate } from './auth/AuthenticationGate.tsx';
import './styles.css';
import { ThemeProvider } from './presentation/ThemeProvider.tsx';
const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && window.location.pathname === '/dev/visualization-lab') {
  void import('./dev/VisualizationLab.tsx').then(({ default: VisualizationLab }) => root.render(<React.StrictMode><ThemeProvider><VisualizationLab /></ThemeProvider></React.StrictMode>));
} else {
  root.render(<React.StrictMode><ThemeProvider><AuthenticationGate /></ThemeProvider></React.StrictMode>);
}
