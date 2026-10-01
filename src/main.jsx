import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import './index.css';
import theme from './theme/muiTheme';
import App from './App.jsx';

// enableCssLayer puts MUI's styles in the `mui` cascade layer, declared in
// index.css BEFORE Tailwind's `utilities` layer — so Tailwind classes that
// pages already pass (className="mb-4", "w-full", …) still win over MUI
// defaults, and inline `style` props win over both.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </StrictMode>
);
