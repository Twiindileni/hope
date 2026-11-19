import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteProvider } from './lib/SiteContext.jsx';
import Home from './pages/Home.jsx';
import './styles/site.css';

const Admin = lazy(() => import('./pages/admin/Admin.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SiteProvider><Home /></SiteProvider>} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="boot"><img src="/images/crest-sm.png" alt="" /></div>}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="*" element={<SiteProvider><Home /></SiteProvider>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
