import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/assets/css/styles.css'
import App from './App.jsx'

// Material UI dependencies
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';


// Setting up tailwind for Material UI

import { StyledEngineProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      {/* <GlobalStyles styles="@layer, theme, base, mui, components, utilities;" /> */}
      {/* <GlobalStyles styles="@layer mui, theme, base, components, utilities;" /> */}
      <App />
    </StyledEngineProvider>
  </StrictMode>,
)
