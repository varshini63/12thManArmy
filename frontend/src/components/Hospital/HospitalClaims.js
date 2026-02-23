import React, { useState, useEffect } from 'react';
import { getClaims } from '../../services/api';

function HospitalClaims() {
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filter, searchTerm, claims]);

  const fetchClaims = async () => {
    try {
      const response = await getClaims();
      // Backend already filters claims submitted by THIS hospital
      console.log('✅ Hospital claims (filtered by submitter):', response.data);
      setClaims(response.data);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...claims];

    if (filter !== 'all') {
      filtered = filtered.filter(claim => claim.status === filter.toUpperCase());
    }

    if (searchTerm) {
      filtered = filtered.filter(claim => 
        claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.policyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClaims(filtered);
  };

  const formatAmount = (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(numAmount) ? '0' : numAmount.toLocaleString('en-IN');
  };

  if (loading) return <div className="loading">Loading claims from blockchain...</div>;

  return (
    <div className="hospital-claims">
      <h2>My Submitted Claims</h2>
      <p className="subtitle">View and track claims submitted by YOUR hospital (blockchain-filtered)</p>

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
            Pending ({claims.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            className={filter === 'approved' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('approved')}
          >
            Approved ({claims.filter(c => c.status === 'APPROVED').length})
          </button>
          <button 
            className={filter === 'rejected' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({claims.filter(c => c.status === 'REJECTED').length})
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by patient, claim #, or policy #"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredClaims.length === 0 ? (
        <div className="empty-state">
          <p>
            {filter === 'all'
              ? 'No claims found. Claims submitted by your hospital will appear here.'
              : `No ${filter} claims found.`}
          </p>
        </div>
      ) : (
        <div className="claims-grid">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="claim-card">
              <div className="claim-header">
                <div>
                  <h4>{claim.claimNumber}</h4>
                  <span className="claim-type">{claim.claimType}</span>
                </div>
                <span className={`status-badge ${
                  claim.status === 'APPROVED' ? 'success' : 
                  claim.status === 'REJECTED' ? 'error' : 
                  'pending'
                }`}>
                  {claim.status}
                </span>
              </div>

              <div className="claim-details">
                <div className="detail-row">
                  <span>Patient:</span>
                  <strong>{claim.patientName}</strong>
                </div>
                <div className="detail-row">
                  <span>Policy Number:</span>
                  <span>{claim.policyNumber}</span>
                </div>
                <div className="detail-row">
                  <span>Claim Amount:</span>
                  <strong>₹{formatAmount(claim.amount)}</strong>
                </div>
                <div className="detail-row">
                  <span>Diagnosis:</span>
                  <span>{claim.diagnosis}</span>
                </div>
                <div className="detail-row description">
                  <span>Description:</span>
                  <p>{claim.description || 'No description provided'}</p>
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

              {claim.status === 'PENDING' && (
                <div className="pending-note">
                  ⏳ Your claim is under review by the insurance company. AI is analyzing for fraud detection.
                </div>
              )}

              {claim.status === 'APPROVED' && (
                <div className="success-note">
                  ✅ Claim approved! Amount will be processed for payment.
                </div>
              )}

              {claim.status === 'REJECTED' && (
                <div className="error-note">
                  ❌ Claim was rejected by insurance company.
                </div>
              )}

              <div className="blockchain-info">
                <small>🔗 Stored on blockchain - immutable record</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="summary-box">
        <h4>Claims Summary (Your Submissions)</h4>
        <div className="summary-stats">
          <div>
            <span>Total Submitted:</span>
            <strong>{claims.length}</strong>
          </div>
          <div>
            <span>Approved:</span>
            <strong>{claims.filter(c => c.status === 'APPROVED').length}</strong>
          </div>
          <div>
            <span>Pending:</span>
            <strong>{claims.filter(c => c.status === 'PENDING').length}</strong>
          </div>
          <div>
            <span>Rejected:</span>
            <strong>{claims.filter(c => c.status === 'REJECTED').length}</strong>
          </div>
          <div>
            <span>Total Amount:</span>
            <strong>₹{formatAmount(claims.reduce((sum, c) => {
              const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount;
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0))}</strong>
          </div>
          <div>
            <span>Approval Rate:</span>
            <strong>
              {claims.length > 0 
                ? ((claims.filter(c => c.status === 'APPROVED').length / claims.length) * 100).toFixed(1)
                : 0}%
            </strong>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>ℹ️ About Claim Status</h4>
        <ul>
          <li><strong>Pending:</strong> Claim is under review by insurance company with AI fraud analysis</li>
          <li><strong>Approved:</strong> Claim passed all checks and payment will be processed</li>
          <li><strong>Rejected:</strong> Claim was denied by insurance company</li>
          <li>🔒 <strong>Privacy:</strong> You only see claims YOU submitted (blockchain-verified)</li>
          <li>🤖 <strong>AI Analysis:</strong> Fraud scores are visible only to insurance companies</li>
        </ul>
      </div>
    </div>
  );
}

export default HospitalClaims;