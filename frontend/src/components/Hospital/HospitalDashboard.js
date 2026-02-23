import React, { useState, useEffect } from 'react';
import { getAnalytics, getClaims } from '../../services/api';

function HospitalDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, claimsRes] = await Promise.all([
        getAnalytics(),
        getClaims()
      ]);
      setAnalytics(analyticsRes.data);
      // Get last 5 claims
      setRecentClaims(claimsRes.data.slice(-5).reverse());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    // Handle both string and number types safely
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(numAmount) ? '0' : numAmount.toLocaleString('en-IN');
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h2>Hospital Dashboard</h2>
      <p className="subtitle">Welcome to your hospital portal</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{analytics?.total_claims_submitted || 0}</h3>
            <p>Total Claims Submitted</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{analytics?.approved_claims || 0}</h3>
            <p>Approved Claims</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{analytics?.pending_claims || 0}</h3>
            <p>Pending Review</p>
          </div>
        </div>

        <div className="stat-card error">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>{analytics?.rejected_claims || 0}</h3>
            <p>Rejected Claims</p>
          </div>
        </div>

        <div className="stat-card fraud">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{analytics?.flagged_claims || 0}</h3>
            <p>Flagged by AI</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>₹{formatAmount(analytics?.total_claim_amount || 0)}</h3>
            <p>Total Claim Amount</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => window.location.href = '/hospital/submit-claim'}>
            📝 Submit New Claim
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/hospital/claims'}>
            📋 View All Claims
          </button>
          <button className="action-btn" onClick={() => fetchData()}>
            🔄 Refresh Dashboard
          </button>
        </div>
      </div>

      {recentClaims.length > 0 && (
        <div className="recent-activity">
          <h3>Recent Claims</h3>
          <div className="activity-list">
            {recentClaims.map((claim) => (
              <div key={claim.id} className="activity-item">
                <div className="activity-icon">
                  {claim.status === 'APPROVED' ? '✅' : 
                   claim.status === 'REJECTED' ? '❌' : '⏳'}
                </div>
                <div className="activity-details">
                  <strong>{claim.claim_number}</strong>
                  <p>{claim.patient_name} - ₹{formatAmount(claim.amount)}</p>
                  <small>
                    {claim.claim_type} • {new Date(claim.submitted_at).toLocaleDateString()} • 
                    AI Score: {(claim.fraud_score * 100).toFixed(1)}%
                  </small>
                </div>
                <div className="activity-status">
                  <span className={`status-badge ${
                    claim.status === 'APPROVED' ? 'success' : 
                    claim.status === 'REJECTED' ? 'error' : 'pending'
                  }`}>
                    {claim.status}
                  </span>
                  {claim.is_fraudulent && (
                    <span className="fraud-flag" title="Flagged as potentially fraudulent">⚠️</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="info-box">
        <h4>ℹ️ As a Hospital, you can:</h4>
        <ul>
          <li>✅ Search for patients by their SSI Identity (DID)</li>
          <li>✅ View patient's active insurance policies</li>
          <li>✅ Submit claims on behalf of patients</li>
          <li>✅ AI automatically analyzes claims for fraud detection</li>
          <li>✅ Track claim approval/rejection status in real-time</li>
          <li>✅ View transaction details on blockchain</li>
        </ul>
        <p className="note">
          💡 All claims are recorded on the blockchain for transparency and are analyzed by AI in real-time. 
          The AI fraud detection system helps prevent fraudulent claims and speeds up legitimate claim processing.
        </p>
      </div>

      {analytics && (
        <div className="analytics-summary">
          <h4>📊 Performance Metrics</h4>
          <div className="metrics-grid">
            <div className="metric">
              <span>Approval Rate:</span>
              <strong>
                {analytics.total_claims_submitted > 0 
                  ? ((analytics.approved_claims / analytics.total_claims_submitted) * 100).toFixed(1)
                  : 0}%
              </strong>
            </div>
            <div className="metric">
              <span>Avg Fraud Score:</span>
              <strong>
                {analytics.average_fraud_score 
                  ? (analytics.average_fraud_score * 100).toFixed(1) + '%'
                  : 'N/A'}
              </strong>
            </div>
            <div className="metric">
              <span>Flagged Rate:</span>
              <strong>
                {analytics.total_claims_submitted > 0 
                  ? ((analytics.flagged_claims / analytics.total_claims_submitted) * 100).toFixed(1)
                  : 0}%
              </strong>
            </div>
            <div className="metric">
              <span>Approved Amount:</span>
              <strong>₹{formatAmount(analytics.approved_amount || 0)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalDashboard;