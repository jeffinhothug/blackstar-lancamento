import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SubmissionForm from './components/SubmissionForm';
import { AdminRoot } from './components/AdminDashboard';
import NotificationTester from './components/NotificationTester';
import { ReloadPrompt } from './components/ReloadPrompt';

const LegacyRedirect = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    if (window.location.hash) {
      const path = window.location.hash.replace(/^#/, '');
      if (path) {
        navigate(path, { replace: true });
      }
    }
  }, [navigate]);
  return null;
};

function App() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check if app is running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      window.location.search.includes('mode=standalone');

    if (isStandalone && window.location.pathname === '/') {
      console.log('Modo Standalone detectado - Redirecionando para Admin');
      navigate('/admin', { replace: true }); // Redireciona para o painel se for PWA
    }

    // Global PWA Install Prompt Capture
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event for later use
      window.deferredPrompt = e;
      console.log('beforeinstallprompt captured globally');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<SubmissionForm />} />
      <Route path="/pwa-test" element={<NotificationTester />} />
      <Route path="/admin/*" element={<AdminRoot />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <LegacyRedirect />
      <ReloadPrompt />
      <App />
    </BrowserRouter>
  );
}