import React, { useState, useEffect } from 'react';
import { getAnalytics, getPolicies, getClaims, getFLStatus } from '../../services/api';

function InsuranceDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [flStatus, setFLStatus] = useState(null);
  const [recentPolicies, setRecentPolicies] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, policiesRes, claimsRes, flRes] = await Promise.all([
        getAnalytics(),
        getPolicies(),
        getClaims(),
        getFLStatus()
      ]);
      
      console.log('📊 Dashboard data loaded:');
      console.log('  - Policies:', policiesRes.data);
      console.log('  - Claims:', claimsRes.data);
      console.log('  - Analytics:', analyticsRes.data);
      
      setAnalytics(analyticsRes.data);
      setFLStatus(flRes.data);
      setRecentPolicies(policiesRes.data.slice(-5).reverse());
      setRecentClaims(claimsRes.data.slice(-5).reverse());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely get policy field (handles both snake_case and camelCase)
  const getPolicyField = (policy, field) => {
    // Map of field names (prefer camelCase from blockchain, fallback to snake_case)
    const fieldMap = {
      policyNumber: policy.policyNumber || policy.policy_number,
      patientName: policy.patientName || policy.patient_name,
      policyType: policy.policyType || policy.policy_type,
      coverageAmount: policy.coverageAmount || policy.coverage_amount,
      premium: policy.premium,
      status: policy.status,
      insuranceCompany: policy.insuranceCompany || policy.insurance_company,
      durationMonths: policy.durationMonths || policy.duration_months
    };
    return fieldMap[field];
  };

  // Helper function to safely get claim field
  const getClaimField = (claim, field) => {
    const fieldMap = {
      claimNumber: claim.claimNumber || claim.claim_number,
      patientName: claim.patientName || claim.patient_name,
      amount: claim.amount,
      hospitalName: claim.hospitalName || claim.hospital_name,
      fraudScore: claim.fraudScore || claim.fraud_score,
      status: claim.status,
      claimType: claim.claimType || claim.claim_type
    };
    return fieldMap[field];
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Insurance Company Dashboard</h2>
      <p className="subtitle">Comprehensive insurance management and fraud detection powered by AI & blockchain</p>

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
            <p>Pending Review</p>
          </div>
        </div>

        <div className="stat-card fraud">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{analytics?.fraudulent_claims || 0}</h3>
            <p>Fraudulent Claims</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{analytics?.fraud_rate?.toFixed(1) || 0}%</h3>
            <p>Fraud Detection Rate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h3>{(flStatus?.global_accuracy * 100)?.toFixed(1) || 0}%</h3>
            <p>AI Model Accuracy</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>{flStatus?.rounds_completed || 0}</h3>
            <p>FL Training Rounds</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.location.href = '/insurance/create-policy'}>
            📄 Create Policy
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/insurance/claims'}>
            📋 Manage Claims
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/insurance/federated-learning'}>
            🤖 Train AI Model
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/insurance/analytics'}>
            📈 View Analytics
          </button>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <h3>📋 Recent Policies</h3>
          {recentPolicies.length === 0 ? (
            <p className="empty-state-small">No policies created yet. Create your first policy to get started!</p>
          ) : (
            <div className="mini-list">
              {recentPolicies.map((policy) => {
                // Use helper function to get fields
                const policyNumber = getPolicyField(policy, 'policyNumber');
                const patientName = getPolicyField(policy, 'patientName');
                const policyType = getPolicyField(policy, 'policyType');
                const coverageAmount = getPolicyField(policy, 'coverageAmount');
                const status = getPolicyField(policy, 'status');

                return (
                  <div key={policy.id} className="mini-item">
                    <div>
                      <strong>#{policyNumber || 'N/A'}</strong>
                      <p>{patientName || 'Unknown'} - {policyType || 'N/A'}</p>
                      <small>
                        ₹{typeof coverageAmount === 'string' 
                          ? parseInt(coverageAmount).toLocaleString() 
                          : (coverageAmount || 0).toLocaleString()} coverage
                      </small>
                    </div>
                    <span className={`status-badge ${status === 'ACTIVE' ? 'success' : 'error'}`}>
                      {status === 'ACTIVE' ? '✅' : '❌'} {status || 'UNKNOWN'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <button 
            className="view-all-btn"
            onClick={() => window.location.href = '/insurance/policies'}
          >
            View All Policies →
          </button>
        </div>

        <div className="info-card">
          <h3>📊 Recent Claims</h3>
          {recentClaims.length === 0 ? (
            <p className="empty-state-small">No claims submitted yet. Claims will appear here when hospitals file them.</p>
          ) : (
            <div className="mini-list">
              {recentClaims.map((claim) => {
                const claimNumber = getClaimField(claim, 'claimNumber');
                const amount = getClaimField(claim, 'amount');
                const hospitalName = getClaimField(claim, 'hospitalName');
                const fraudScore = getClaimField(claim, 'fraudScore');
                const status = getClaimField(claim, 'status');

                return (
                  <div key={claim.id} className="mini-item">
                    <div>
                      <strong>#{claimNumber || 'N/A'}</strong>
                      <p>
                        ₹{typeof amount === 'string'
                          ? parseInt(amount).toLocaleString()
                          : (amount || 0).toLocaleString()} - {hospitalName || 'Unknown'}
                      </p>
                      <small>Risk: {((fraudScore || 0) * 100).toFixed(1)}%</small>
                    </div>
                    <span className={`status-badge ${
                      status === 'APPROVED' ? 'success' : 
                      status === 'REJECTED' ? 'error' : 'pending'
                    }`}>
                      {status === 'APPROVED' && '✅ '}
                      {status === 'REJECTED' && '❌ '}
                      {status === 'PENDING' && '⏳ '}
                      {status || 'UNKNOWN'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <button 
            className="view-all-btn"
            onClick={() => window.location.href = '/insurance/claims'}
          >
            View All Claims →
          </button>
        </div>
      </div>

      {flStatus && (
        <div className="fl-summary-card">
          <h3>🤖 Federated Learning Status</h3>
          <div className="fl-summary-content">
            <div className="fl-stat">
              <span className="fl-label">Global Model Accuracy:</span>
              <strong className="fl-value success">{((flStatus.global_accuracy || 0) * 100).toFixed(2)}%</strong>
            </div>
            <div className="fl-stat">
              <span className="fl-label">Training Rounds Completed:</span>
              <strong className="fl-value">{flStatus.rounds_completed || 0}</strong>
            </div>
            <div className="fl-stat">
              <span className="fl-label">Active Nodes:</span>
              <strong className="fl-value">{flStatus.active_nodes || 0}/{flStatus.total_nodes || 0}</strong>
            </div>
            <div className="fl-stat">
              <span className="fl-label">Total Training Samples:</span>
              <strong className="fl-value">{(flStatus.total_training_samples || 0).toLocaleString()}</strong>
            </div>
          </div>
          <button 
            className="primary-btn"
            onClick={() => window.location.href = '/insurance/federated-learning'}
          >
            🚀 Start New Training Round
          </button>
        </div>
      )}

      <div className="info-box">
        <h4>🛡️ Insurance Company Capabilities</h4>
        <div className="capabilities-grid">
          <div className="capability-item">
            <span className="capability-icon">📄</span>
            <div>
              <strong>Policy Management</strong>
              <p>Create and manage insurance policies for patients with blockchain-verified identities</p>
            </div>
          </div>
          <div className="capability-item">
            <span className="capability-icon">📋</span>
            <div>
              <strong>Claims Processing</strong>
              <p>Review and process claims submitted by hospitals with AI-powered fraud detection</p>
            </div>
          </div>
          <div className="capability-item">
            <span className="capability-icon">✅</span>
            <div>
              <strong>Approve/Reject Claims</strong>
              <p>Make decisions based on AI fraud analysis, recorded permanently on blockchain</p>
            </div>
          </div>
          <div className="capability-item">
            <span className="capability-icon">🤖</span>
            <div>
              <strong>AI Model Training</strong>
              <p>Train fraud detection models using Federated Learning for continuous improvement</p>
            </div>
          </div>
          <div className="capability-item">
            <span className="capability-icon">📈</span>
            <div>
              <strong>Analytics & Insights</strong>
              <p>View comprehensive analytics, fraud statistics, and business intelligence</p>
            </div>
          </div>
          <div className="capability-item">
            <span className="capability-icon">⛓️</span>
            <div>
              <strong>Blockchain Verification</strong>
              <p>Access immutable blockchain records for complete transparency and audit trails</p>
            </div>
          </div>
        </div>
      </div>

      <div className="benefits-box">
        <h4>✨ System Benefits</h4>
        <div className="benefits-grid">
          <div className="benefit-item">
            <span>🔐</span>
            <strong>Blockchain Security</strong>
            <p>All transactions permanently recorded on Ethereum</p>
          </div>
          <div className="benefit-item">
            <span>🤖</span>
            <strong>AI Fraud Detection</strong>
            <p>Real-time fraud scoring with {(flStatus?.global_accuracy * 100 || 0).toFixed(1)}% accuracy</p>
          </div>
          <div className="benefit-item">
            <span>🔒</span>
            <strong>Privacy Preserved</strong>
            <p>Federated learning without sharing patient data</p>
          </div>
          <div className="benefit-item">
            <span>⚡</span>
            <strong>Fast Processing</strong>
            <p>Instant claim decisions with blockchain verification</p>
          </div>
          <div className="benefit-item">
            <span>💰</span>
            <strong>Cost Savings</strong>
            <p>Prevent fraud losses and reduce operational costs</p>
          </div>
          <div className="benefit-item">
            <span>📊</span>
            <strong>Data-Driven</strong>
            <p>Comprehensive analytics for informed decisions</p>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>💡 Getting Started</h4>
        <ol>
          <li>
            <strong>Create Policies:</strong> Issue policies to patients with verified SSI identities. 
            Each policy is recorded on blockchain with MetaMask confirmation.
          </li>
          <li>
            <strong>Review Claims:</strong> When hospitals file claims, review them in the Claims Management section. 
            AI provides fraud risk scores to assist your decisions.
          </li>
          <li>
            <strong>Make Decisions:</strong> Approve or reject claims based on AI analysis and your judgment. 
            Each decision is permanently recorded on blockchain.
          </li>
          <li>
            <strong>Train AI Model:</strong> Regularly train the fraud detection model using Federated Learning. 
            This improves accuracy without compromising patient privacy.
          </li>
          <li>
            <strong>Monitor Analytics:</strong> Track fraud rates, claim patterns, and business metrics 
            in the Analytics dashboard for data-driven insights.
          </li>
        </ol>
        <p className="note">
          💡 <strong>Tip:</strong> All blockchain transactions require MetaMask confirmation and small gas fees. 
          Keep your wallet funded and connected for seamless operations.
        </p>
      </div>
    </div>
  );
}

export default InsuranceDashboard;