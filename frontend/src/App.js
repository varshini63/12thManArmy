import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Patient Components
import PatientDashboard from './components/Patient/PatientDashboard';
import PatientIdentity from './components/Patient/PatientIdentity';
import PatientPolicies from './components/Patient/PatientPolicies';
import PatientClaims from './components/Patient/PatientClaims';

// Hospital Components
import HospitalDashboard from './components/Hospital/HospitalDashboard';
import HospitalClaimSubmission from './components/Hospital/HospitalClaimSubmission';
import HospitalClaims from './components/Hospital/HospitalClaims';

// Insurance Components
import InsuranceDashboard from './components/Insurance/InsuranceDashboard';
import PolicyCreation from './components/Insurance/PolicyCreation';
import ClaimsManagement from './components/Insurance/ClaimsManagement';
import FederatedLearning from './components/Insurance/FederatedLearning';
import InsuranceAnalytics from './components/Insurance/InsuranceAnalytics';

// Admin Components
import AdminDashboard from './components/Admin/AdminDashboard';
import BlockchainExplorer from './components/Admin/BlockchainExplorer';

import { checkSession, logout } from './services/api';
import { initWeb3 } from './services/blockchain';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkUserSession();
    initializeWeb3();
  }, []);

  const checkUserSession = async () => {
    try {
      const response = await checkSession();
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeWeb3 = async () => {
    const result = await initWeb3();
    setIsConnected(result.success);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-brand">
              <h1>🛡️ Insurance Fraud Detection</h1>
              <p className="nav-subtitle">
                {user.role === 'patient' && 'Patient Portal'}
                {user.role === 'hospital' && 'Hospital Portal'}
                {user.role === 'insurance' && 'Insurance Company Portal'}
                {user.role === 'admin' && 'Admin Portal'}
              </p>
            </div>
            <div className="nav-status">
              <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
                Blockchain: {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="user-info">
                <span className="user-role">{user.role.toUpperCase()}</span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="main-container">
          {user.role === 'patient' && <PatientRoutes />}
          {user.role === 'hospital' && <HospitalRoutes />}
          {user.role === 'insurance' && <InsuranceRoutes />}
          {user.role === 'admin' && <AdminRoutes />}
        </div>

        <footer className="footer">
          <p>Insurance Fraud Detection System - Blockchain + AI + FL + SSI</p>
          <p>Logged in as: {user.name} ({user.role})</p>
        </footer>
      </div>
    </Router>
  );
}

// Patient Routes
function PatientRoutes() {
  return (
    <>
      <aside className="sidebar">
        <ul className="nav-menu">
          <li><a href="/patient/dashboard">📊 Dashboard</a></li>
          <li><a href="/patient/identity">🆔 My Identity</a></li>
          <li><a href="/patient/policies">📄 My Policies</a></li>
          <li><a href="/patient/claims">📋 My Claims</a></li>
        </ul>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/identity" element={<PatientIdentity />} />
          <Route path="/patient/policies" element={<PatientPolicies />} />
          <Route path="/patient/claims" element={<PatientClaims />} />
          <Route path="*" element={<Navigate to="/patient/dashboard" />} />
        </Routes>
      </main>
    </>
  );
}

// Hospital Routes
function HospitalRoutes() {
  return (
    <>
      <aside className="sidebar">
        <ul className="nav-menu">
          <li><a href="/hospital/dashboard">📊 Dashboard</a></li>
          <li><a href="/hospital/submit-claim">📝 Submit Claim</a></li>
          <li><a href="/hospital/claims">📋 My Claims</a></li>
        </ul>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
          <Route path="/hospital/submit-claim" element={<HospitalClaimSubmission />} />
          <Route path="/hospital/claims" element={<HospitalClaims />} />
          <Route path="*" element={<Navigate to="/hospital/dashboard" />} />
        </Routes>
      </main>
    </>
  );
}

// Insurance Routes
function InsuranceRoutes() {
  return (
    <>
      <aside className="sidebar">
        <ul className="nav-menu">
          <li><a href="/insurance/dashboard">📊 Dashboard</a></li>
          <li><a href="/insurance/create-policy">📄 Create Policy</a></li>
          <li><a href="/insurance/claims">📋 Manage Claims</a></li>
          <li><a href="/insurance/federated-learning">🤖 Federated Learning</a></li>
          <li><a href="/insurance/analytics">📈 Analytics</a></li>
        </ul>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/insurance/dashboard" element={<InsuranceDashboard />} />
          <Route path="/insurance/create-policy" element={<PolicyCreation />} />
          <Route path="/insurance/claims" element={<ClaimsManagement />} />
          <Route path="/insurance/federated-learning" element={<FederatedLearning />} />
          <Route path="/insurance/analytics" element={<InsuranceAnalytics />} />
          <Route path="*" element={<Navigate to="/insurance/dashboard" />} />
        </Routes>
      </main>
    </>
  );
}

// Admin Routes
function AdminRoutes() {
  return (
    <>
      <aside className="sidebar">
        <ul className="nav-menu">
          <li><a href="/admin/dashboard">📊 Dashboard</a></li>
          <li><a href="/admin/blockchain">⛓️ Blockchain Explorer</a></li>
        </ul>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/blockchain" element={<BlockchainExplorer />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </main>
    </>
  );
}

export default App;