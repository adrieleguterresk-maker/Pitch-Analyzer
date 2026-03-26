import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import UploadView from './views/UploadView';
import AnalysisView from './views/AnalysisView';
import HistoryView from './views/HistoryView';
import './index.css';

/* ── Theme Context ──────────────────────────────────────────────────────────── */
export const ThemeContext = createContext({ dark: true, toggle: () => {} });

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Nav ────────────────────────────────────────────────────────────────────── */
function Nav() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <nav className="nav">
      <div className="nav-logo">
        <img
          src="/logo-white.png"
          alt="Bethel Educação"
          style={{ height: 36, width: 'auto', objectFit: 'contain' }}
        />
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
          Upload
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Histórico
        </NavLink>
        <button
          onClick={toggle}
          className="theme-toggle"
          title={dark ? 'Modo claro' : 'Modo escuro'}
          aria-label="Alternar tema"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ── App ─────────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app-wrapper">
          <Nav />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<UploadView />} />
              <Route path="/analysis/:id" element={<AnalysisView />} />
              <Route path="/history" element={<HistoryView />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
