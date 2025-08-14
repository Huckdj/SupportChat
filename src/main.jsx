import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CheckMail from './checkmail.jsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

createRoot(document.getElementById('root')).render(
  <Router>
    <Routes>
      {/* Trang mặc định */}
      <Route path="/" element={<App />} />

      {/* Trang khác */}
      <Route path="/checkmail" element={<CheckMail />} />
    </Routes>
  </Router>
)
