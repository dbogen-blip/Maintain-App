// Entry point for the React app.
// CSS import order matters: index.css must come before theme.css so that
// base resets and font imports are in place before design tokens (CSS custom
// properties) are declared. Reversing the order causes undefined variables
// and a dark background flash on load.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
