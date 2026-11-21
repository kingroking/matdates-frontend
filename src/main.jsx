window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem("__md_chunk_reloaded")) {
    sessionStorage.setItem("__md_chunk_reloaded", "1");
    window.location.reload();
  }
});
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
