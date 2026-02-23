import React, { useState, useEffect } from 'react';
import { getClaims, getMyIdentity } from '../../services/api';

function PatientClaims() {
  const [claims, setClaims] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filteredClaims, setFilteredClaims] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, claims]);

  const fetchData = async () => {
    try {
      const [claimsRes, identityRes] = await Promise.all([
        getClaims(),
        getMyIdentity().catch(() => null)
      ]);
      
      // Backend already filters claims by patient's DID
      console.log('✅ Patient claims (filtered by DID):', claimsRes.data);
      setClaims(claimsRes.data);
      
      if (identityRes) setIdentity(identityRes.data);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredClaims(claims);
    } else {
      setFilteredClaims(claims.filter(c => c.status === filter.toUpperCase()));
    }
  };

  const getRiskColor = (score) => {
    if (score < 0.3) return '#10b981';
    if (score < 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskLabel = (score) => {
    if (score < 0.3) return 'Low Risk';
    if (score < 0.6) return 'Medium Risk';
    return 'High Risk';
  };

  if (loading) {
    return <div className="loading">Loading claims from blockchain...</div>;
  }

  if (!identity) {
    return (
      <div className="patient-claims">
        <h2>My Insurance Claims</h2>
        <div className="warning-box">
          <p>⚠️ Please create your SSI Identity first to view claims</p>
          <button onClick={() => window.location.href = '/patient/identity'}>
            🆔 Create Identity Now
          </button>
        </div>

        <div className="info-box">
          <h4>Why do I need an SSI Identity?</h4>
          <p>
            Your Self-Sovereign Identity (SSI) is required to track insurance claims. 
            Hospitals file claims on your behalf using your DID, and all claim history is linked to your identity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-claims">
      <h2>My Insurance Claims</h2>
      <p className="subtitle">All claims filed by hospitals on your behalf (linked to DID: {identity.did})</p>

      <div className="controls-bar">
        <div className="filters">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({claims.length})
          </button>
          <button 
            className={filter === 'pending' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('pending')}
          >
            ⏳ Pending ({claims.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            className={filter === 'approved' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('approved')}
          >
            ✅ Approved ({claims.filter(c => c.status === 'APPROVED').length})
          </button>
          <button 
            className={filter === 'rejected' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('rejected')}
          >
            ❌ Rejected ({claims.filter(c => c.status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {filteredClaims.length === 0 ? (
        <div className="empty-state">
          <p>
            {filter === 'all'
              ? 'No claims found. Claims will appear here when hospitals file them on your behalf using your DID.'
              : `No ${filter} claims found.`}
          </p>
        </div>
      ) : (
        <div className="claims-grid">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="claim-card">
              <div className="claim-header">
                <div>
                  <h4>Claim #{claim.claimNumber}</h4>
                  <span className="claim-type">{claim.claimType}</span>
                </div>
                <span className={`status-badge ${
                  claim.status === 'APPROVED' ? 'success' : 
                  claim.status === 'REJECTED' ? 'error' : 
                  'pending'
                }`}>
                  {claim.status === 'APPROVED' && '✅ '}
                  {claim.status === 'REJECTED' && '❌ '}
                  {claim.status === 'PENDING' && '⏳ '}
                  {claim.status}
                </span>
              </div>

              <div className="claim-details">
                <div className="detail-row highlight">
                  <span>Claim Amount:</span>
                  <strong className="amount">₹{claim.amount.toLocaleString()}</strong>
                </div>

                <div className="detail-row">
                  <span>Policy Number:</span>
                  <strong>{claim.policyNumber}</strong>
                </div>

                <div className="detail-row">
                  <span>Hospital:</span>
                  <span>{claim.hospitalName}</span>
                </div>

                <div className="detail-row">
                  <span>Diagnosis:</span>
                  <span>{claim.diagnosis}</span>
                </div>

                <div className="detail-row">
                  <span>AI Fraud Detection:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: getRiskColor(claim.fraudScore) }}>
                      {(claim.fraudScore * 100).toFixed(1)}%
                    </strong>
                    <span style={{ 
                      fontSize: '0.85em', 
                      color: getRiskColor(claim.fraudScore),
                      fontWeight: '500'
                    }}>
                      ({getRiskLabel(claim.fraudScore)})
                    </span>
                  </div>
                </div>

                <div className="detail-row description">
                  <span>Description:</span>
                  <p>{claim.description}</p>
                </div>

                <div className="detail-row">
                  <span>Submitted:</span>
                  <span>{new Date(claim.submittedAt).toLocaleString()}</span>
                </div>

                {claim.processedAt && (
                  <div className="detail-row">
                    <span>{claim.status === 'APPROVED' ? 'Approved' : 'Rejected'}:</span>
                    <span>{new Date(claim.processedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {claim.isFraudulent && claim.status === 'PENDING' && (
                <div className="fraud-alert">
                  ⚠️ <strong>Flagged for Review:</strong> This claim has been flagged by AI due to unusual patterns and requires manual verification.
                </div>
              )}

              {claim.status === 'APPROVED' && (
                <div className="approval-notice">
                  ✅ This claim has been approved and payment will be processed shortly.
                </div>
              )}

              <div className="blockchain-info">
                <small>🔗 Data stored on blockchain - immutable and transparent</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="summary-box">
        <h4>📊 Claims Summary</h4>
        <div className="summary-stats">
          <div>
            <strong>{claims.length}</strong> Total Claims
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'APPROVED').length}</strong> Approved
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'PENDING').length}</strong> Pending
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'REJECTED').length}</strong> Rejected
          </div>
          <div>
            <strong>₹{claims
              .filter(c => c.status === 'APPROVED')
              .reduce((sum, c) => sum + c.amount, 0)
              .toLocaleString()}</strong> Total Approved
          </div>
          <div>
            <strong>₹{claims
              .filter(c => c.status === 'PENDING')
              .reduce((sum, c) => sum + c.amount, 0)
              .toLocaleString()}</strong> Pending Amount
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>ℹ️ About Your Claims</h4>
        <ul>
          <li>🏥 Claims are filed by hospitals on your behalf using your DID</li>
          <li>🤖 AI fraud detection analyzes each claim for suspicious patterns</li>
          <li>⚡ Low-risk claims are processed faster</li>
          <li>🔍 High-risk claims undergo manual verification</li>
          <li>✅ Approved claims are paid directly to the hospital</li>
          <li>🔗 All data is stored permanently on blockchain</li>
        </ul>
      </div>
    </div>
  );
}

export default PatientClaims;