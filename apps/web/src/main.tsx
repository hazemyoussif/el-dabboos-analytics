import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';
import { ThemeProvider } from './presentation/ThemeProvider.tsx';
const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && window.location.pathname === '/dev/visualization-lab') {
  void import('./dev/VisualizationLab.tsx').then(({ default: VisualizationLab }) => root.render(<React.StrictMode><ThemeProvider><VisualizationLab /></ThemeProvider></React.StrictMode>));
} else {
  root.render(<React.StrictMode><ThemeProvider><App /></ThemeProvider></React.StrictMode>);
}
