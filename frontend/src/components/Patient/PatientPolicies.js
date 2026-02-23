import React, { useState, useEffect } from 'react';
import { getPolicies, getMyIdentity } from '../../services/api';

function PatientPolicies() {
  const [policies, setPolicies] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filteredPolicies, setFilteredPolicies] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, policies]);

  const fetchData = async () => {
    try {
      const [policiesRes, identityRes] = await Promise.all([
        getPolicies(),
        getMyIdentity().catch(() => null)
      ]);
      setPolicies(policiesRes.data);
      if (identityRes) setIdentity(identityRes.data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredPolicies(policies);
    } else {
      setFilteredPolicies(policies.filter(p => p.status === filter.toUpperCase()));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    return `₹${numAmount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return <div className="loading">Loading policies...</div>;
  }

  if (!identity) {
    return (
      <div className="patient-policies">
        <h2>My Insurance Policies</h2>
        <div className="warning-box">
          <p>⚠️ Please create your SSI Identity first to view policies</p>
          <button onClick={() => window.location.href = '/patient/identity'}>
            🆔 Create Identity Now
          </button>
        </div>
        
        <div className="info-box">
          <h4>Why do I need an SSI Identity?</h4>
          <p>
            Your Self-Sovereign Identity (SSI) is required to link insurance policies to you. 
            Once created, insurance companies can issue policies directly to your blockchain-verified identity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-policies">
      <h2>My Insurance Policies</h2>
      <p className="subtitle">View all insurance policies linked to your DID</p>

      <div className="controls-bar">
        <div className="filters">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({policies.length})
          </button>
          <button 
            className={filter === 'active' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('active')}
          >
            Active ({policies.filter(p => p.status === 'ACTIVE').length})
          </button>
          <button 
            className={filter === 'expired' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('expired')}
          >
            Expired ({policies.filter(p => p.status === 'EXPIRED').length})
          </button>
        </div>
      </div>

      {filteredPolicies.length === 0 ? (
        <div className="empty-state">
          <p>
            {filter === 'all' 
              ? 'No policies found. Contact an insurance company to get a policy issued to your DID.' 
              : `No ${filter} policies found.`}
          </p>
        </div>
      ) : (
        <div className="policies-grid">
          {filteredPolicies.map((policy) => (
            <div key={policy.id} className="policy-card">
              <div className="policy-header">
                <div>
                  <h3>{policy.policyType || policy.policy_type || 'Health Insurance'}</h3>
                  <span className="policy-number">#{policy.policyNumber || policy.policy_number}</span>
                </div>
                <span className={`status-badge ${
                  policy.status === 'ACTIVE' ? 'success' : 'error'
                }`}>
                  {policy.status}
                </span>
              </div>

              <div className="policy-details">
                <div className="detail-row highlight">
                  <span>Coverage Amount:</span>
                  <strong className="amount">{formatCurrency(policy.coverageAmount || policy.coverage_amount)}</strong>
                </div>

                <div className="detail-row">
                  <span>Monthly Premium:</span>
                  <strong>{formatCurrency(policy.premium)}</strong>
                </div>

                <div className="detail-row">
                  <span>Insurance Company:</span>
                  <span>{policy.insuranceCompany || policy.insurance_company || 'Insurance Provider'}</span>
                </div>

                <div className="detail-row">
                  <span>Policy Duration:</span>
                  <span>{policy.durationMonths || policy.duration_months || 12} months</span>
                </div>

                <div className="detail-row">
                  <span>Issue Date:</span>
                  <span>{formatDate(policy.createdAt || policy.created_at)}</span>
                </div>

                {(policy.expiryDate || policy.expiry_date) && (
                  <div className="detail-row">
                    <span>Expiry Date:</span>
                    <span>{formatDate(policy.expiryDate || policy.expiry_date)}</span>
                  </div>
                )}
              </div>

              <div className="policy-footer">
                <small>Linked to DID: {identity.did.substring(0, 20)}...</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="summary-box">
        <h4>📊 Policy Summary</h4>
        <div className="summary-stats">
          <div>
            <strong>{policies.length}</strong> Total Policies
          </div>
          <div>
            <strong>{policies.filter(p => p.status === 'ACTIVE').length}</strong> Active
          </div>
          <div>
            <strong>{formatCurrency(
              policies
                .filter(p => p.status === 'ACTIVE')
                .reduce((sum, p) => {
                  const amount = p.coverageAmount || p.coverage_amount || 0;
                  return sum + (typeof amount === 'string' ? parseInt(amount) : amount);
                }, 0)
            )}</strong> Total Coverage
          </div>
          <div>
            <strong>{formatCurrency(
              policies
                .filter(p => p.status === 'ACTIVE')
                .reduce((sum, p) => {
                  const premium = p.premium || 0;
                  return sum + (typeof premium === 'string' ? parseInt(premium) : premium);
                }, 0)
            )}</strong> Monthly Premium
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>ℹ️ About Your Policies</h4>
        <ul>
          <li>✅ All policies are linked to your blockchain-verified DID</li>
          <li>✅ Insurance companies issue policies directly to your identity</li>
          <li>✅ Claims can be filed by hospitals using your policy number</li>
          <li>✅ Policy data is stored securely and immutably on blockchain</li>
          <li>✅ You can verify policy authenticity anytime</li>
        </ul>
      </div>
    </div>
  );
}

export default PatientPolicies;