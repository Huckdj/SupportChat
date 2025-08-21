import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CheckMail from './checkmail.jsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CheckMail2 from './checkmail2.jsx';
createRoot(document.getElementById('root')).render(
  <Router>
    <Routes>
      {/* Trang mặc định */}
      <Route path="/" element={<App />} />

      {/* Trang khác */}
      <Route path="/checkmail" element={<CheckMail />} />
      <Route path="/checkmail2" element={<CheckMail2 />} />
    </Routes>
  </Router>
)
