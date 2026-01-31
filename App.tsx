import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SubmissionForm from './components/SubmissionForm';
import { AdminRoot } from './components/AdminDashboard';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SubmissionForm />} />
        <Route path="/admin/*" element={<AdminRoot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;