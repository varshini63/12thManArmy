import React, { useState, useEffect } from 'react';
import { getAnalytics, getMyIdentity } from '../../services/api';

function PatientDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, identityRes] = await Promise.all([
        getAnalytics(),
        getMyIdentity().catch(() => null)
      ]);
      setAnalytics(analyticsRes.data);
      if (identityRes) setIdentity(identityRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Patient Dashboard</h2>
      <p className="subtitle">Welcome to your blockchain-powered insurance portal</p>

      {!identity && (
        <div className="warning-box">
          <h4>⚠️ Identity Required</h4>
          <p>You haven't created your SSI Identity yet! Create one to access all features.</p>
          <button onClick={() => window.location.href = '/patient/identity'}>
            🆔 Create Identity Now
          </button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{analytics?.total_policies || 0}</h3>
            <p>Total Policies</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{analytics?.active_policies || 0}</h3>
            <p>Active Policies</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{analytics?.total_claims || 0}</h3>
            <p>Total Claims</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{analytics?.pending_claims || 0}</h3>
            <p>Pending Claims</p>
          </div>
        </div>
      </div>

      {identity && (
        <div className="info-card verified">
          <h3>🆔 Your Blockchain Identity</h3>
          <div className="identity-summary">
            <div className="detail-row">
              <span>Name:</span>
              <strong>{identity.name}</strong>
            </div>
            <div className="detail-row">
              <span>Email:</span>
              <span>{identity.email}</span>
            </div>
            <div className="detail-row">
              <span>Decentralized Identifier (DID):</span>
              <code className="did-value">{identity.did}</code>
            </div>
            <div className="detail-row">
              <span>Wallet Address:</span>
              <code className="key-value">{identity.wallet_address}</code>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <span className="status-badge success">✓ Verified on Blockchain</span>
            </div>
          </div>
          <button 
            className="secondary-btn"
            onClick={() => window.location.href = '/patient/identity'}
          >
            View Full Identity Details
          </button>
        </div>
      )}

      {identity && analytics && (
        <div className="summary-cards">
          <div className="summary-card">
            <h4>💰 Financial Overview</h4>
            <div className="summary-stats">
              <div className="stat-item">
                <span>Total Coverage</span>
                <strong>₹{(analytics.total_coverage || 0).toLocaleString()}</strong>
              </div>
              <div className="stat-item">
                <span>Approved Claims</span>
                <strong>₹{(analytics.approved_amount || 0).toLocaleString()}</strong>
              </div>
              <div className="stat-item">
                <span>Pending Claims</span>
                <strong>₹{(analytics.pending_amount || 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h4>📊 Claim Statistics</h4>
            <div className="summary-stats">
              <div className="stat-item">
                <span>Approval Rate</span>
                <strong>
                  {analytics.total_claims > 0 
                    ? Math.round((analytics.approved_claims / analytics.total_claims) * 100) 
                    : 0}%
                </strong>
              </div>
              <div className="stat-item">
                <span>Average Claim</span>
                <strong>
                  ₹{analytics.total_claims > 0 
                    ? Math.round(analytics.approved_amount / analytics.approved_claims).toLocaleString() 
                    : 0}
                </strong>
              </div>
              <div className="stat-item">
                <span>Processing Time</span>
                <strong>{analytics.avg_processing_days || 0} days</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          {!identity && (
            <button 
              className="action-btn primary"
              onClick={() => window.location.href = '/patient/identity'}
            >
              🆔 Create Identity
            </button>
          )}
          <button 
            className="action-btn"
            onClick={() => window.location.href = '/patient/policies'}
          >
            📄 View Policies
          </button>
          <button 
            className="action-btn"
            onClick={() => window.location.href = '/patient/claims'}
          >
            📋 View Claims
          </button>
          {identity && (
            <button 
              className="action-btn"
              onClick={() => window.location.href = '/patient/identity'}
            >
              🔍 Verify Identity
            </button>
          )}
        </div>
      </div>

      <div className="info-box">
        <h4>ℹ️ What You Can Do</h4>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">🆔</span>
            <div>
              <strong>Create SSI Identity</strong>
              <p>Generate a blockchain-verified decentralized identity (DID) stored permanently on Ethereum</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📄</span>
            <div>
              <strong>View Policies</strong>
              <p>Track all insurance policies issued to your DID by insurance companies</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <div>
              <strong>Monitor Claims</strong>
              <p>View real-time status of claims filed by hospitals using AI fraud detection</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <div>
              <strong>Verify Identity</strong>
              <p>Verify your identity on-chain anytime to prove authenticity</p>
            </div>
          </div>
        </div>
      </div>

      {!identity && (
        <div className="cta-box">
          <h3>🚀 Get Started</h3>
          <p>Create your Self-Sovereign Identity to unlock all features:</p>
          <ul>
            <li>✅ Blockchain-verified identity that you control</li>
            <li>✅ Insurance companies can issue policies to your DID</li>
            <li>✅ Hospitals can file claims on your behalf</li>
            <li>✅ Transparent, immutable record of all transactions</li>
            <li>✅ No central authority controls your data</li>
          </ul>
          <button 
            className="cta-button"
            onClick={() => window.location.href = '/patient/identity'}
          >
            Create Identity Now →
          </button>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;