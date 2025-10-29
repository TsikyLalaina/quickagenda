import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Share from './Share.jsx'
import { ThemeModeProvider } from './theme.jsx'

function Root() {
  return (
    <ThemeModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/s/:code" element={<Share />} />
        </Routes>
      </BrowserRouter>
    </ThemeModeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
