import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Bot, Boxes, ChevronDown, CircleHelp, Clock3, Globe2, LayoutDashboard, Menu, Search, Settings2, Sparkles, Waypoints } from 'lucide-react';
import { api } from './lib/api.js';
const Overview = lazy(() => import('./pages/Overview.jsx'));
const Audit = lazy(() => import('./pages/Audit.jsx'));
const Meta = lazy(() => import('./pages/Meta.jsx'));
const Sitemap = lazy(() => import('./pages/Sitemap.jsx'));
const Robots = lazy(() => import('./pages/Robots.jsx'));
const Schema = lazy(() => import('./pages/Schema.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/audit', label: 'Website audit', icon: Search },
  { to: '/meta', label: 'Meta generator', icon: Sparkles },
  { to: '/sitemap', label: 'Sitemap generator', icon: Waypoints },
  { to: '/robots', label: 'Robots.txt generator', icon: Bot },
  { to: '/schema', label: 'Schema generator', icon: Boxes },
  { to: '/history', label: 'Audit history', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];
const titles = { '/': ['Overview', 'Your website’s search health at a glance'], '/audit': ['Website audit', 'Find technical SEO issues on any public website'], '/meta': ['Meta generator', 'Create, validate, and preview your search metadata'], '/sitemap': ['Sitemap generator', 'Build a standards based XML sitemap'], '/robots': ['Robots.txt generator', 'Define crawler access rules for your website'], '/schema': ['Schema generator', 'Create structured data for search engines'], '/history': ['Audit history', 'Review and compare previous website audits'], '/settings': ['Settings', 'Configure your SEO Studio workspace'] };

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [serviceState, setServiceState] = useState('checking');
  const location = useLocation();
  const navigate = useNavigate();
  const [title, subtitle] = titles[location.pathname] || titles['/'];
  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => { let active = true; const check = () => api.get('/health').then(() => active && setServiceState('online')).catch(() => active && setServiceState('offline')); check(); const timer = setInterval(check, 30_000); return () => { active = false; clearInterval(timer); }; }, []);
  return <div className={`app-shell ${collapsed ? 'nav-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={19} strokeWidth={2.4} /></div><span className="brand-word">SEO<span className="brand-light"> Studio</span></span><button className="sidebar-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}><ChevronDown size={15} /></button></div>
      <div className="workspace"><div className="workspace-icon"><Globe2 size={16} /></div><div className="workspace-text"><strong>My workspace</strong><span>Personal workspace</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} title={collapsed ? label : undefined} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="usage-card"><div className="usage-head"><span>Report storage</span><span>SQLite</span></div><p>Audit history is saved on this server and survives restarts.</p><NavLink to="/history" className="storage-link">View audit history <ArrowUpRight size={13} /></NavLink></div><div className="profile-row"><div className="avatar">A</div><div className="profile-name"><strong>Ankan Mondal</strong><span>Personal workspace</span></div><button aria-label="Account menu" onClick={() => setProfileOpen((value) => !value)}><ChevronDown size={15} /></button>{profileOpen&&<div className="profile-menu"><strong>Ankan Mondal</strong><span>Personal workspace</span><button onClick={()=>{navigate('/settings');setProfileOpen(false);}}>Workspace settings <Settings2 size={14}/></button></div>}</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="crumb"><span>SEO Studio</span><span className="crumb-slash">/</span><strong>{title}</strong></div></div><div className="topbar-actions"><div className={`status-pill ${serviceState}`}><i /> {serviceState === 'online' ? 'API connected' : serviceState === 'offline' ? 'API unavailable' : 'Checking API'}</div><a className="icon-button" title="SEO toolkit documentation" aria-label="SEO toolkit documentation" href="https://www.npmjs.com/package/@ankan_/seo-toolkit" target="_blank" rel="noreferrer"><CircleHelp size={17} /></a><div className="top-avatar">A</div></div></header>
      <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR WEBSITE’S SEO COMMAND CENTER</div><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions"><div className="date-chip"><Clock3 size={14} /> {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date())}</div></div></div><Suspense fallback={<div className="panel loading-panel">Loading workspace…</div>}><Outlet /></Suspense></div>
      <footer className="app-footer"><span>SEO Studio <i>·</i> Powered by <b>@ankan_/seo-toolkit</b></span><span>Made for better search visibility <span className="footer-spark">✳</span></span></footer>
    </main>
  </div>;
}

export default function App() { return <Routes><Route element={<Shell />}><Route index element={<Overview />} /><Route path="audit" element={<Audit />} /><Route path="meta" element={<Meta />} /><Route path="sitemap" element={<Sitemap />} /><Route path="robots" element={<Robots />} /><Route path="schema" element={<Schema />} /><Route path="history" element={<History />} /><Route path="settings" element={<Settings />} /></Route><Route path="*" element={<Overview />} /></Routes>; }
