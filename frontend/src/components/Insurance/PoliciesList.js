import React, { useState, useEffect } from 'react';
import { getPolicies } from '../../services/api';

function PoliciesList() {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filter, searchTerm, policies]);

  const fetchPolicies = async () => {
    try {
      const response = await getPolicies();
      console.log('✅ Policies loaded from blockchain:', response.data);
      setPolicies(response.data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...policies];

    if (filter !== 'all') {
      filtered = filtered.filter(policy => policy.status === filter.toUpperCase());
    }

    if (searchTerm) {
      filtered = filtered.filter(policy => {
        const policyNumber = policy.policyNumber || policy.policy_number || '';
        const patientName = policy.patientName || policy.patient_name || '';
        const did = policy.did || '';
        
        return (
          policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          did.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredPolicies(filtered);
  };

  const formatAmount = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0' : num.toLocaleString('en-IN');
  };

  const formatDate = (dateString) => {
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

  if (loading) {
    return <div className="loading">Loading policies from blockchain...</div>;
  }

  return (
    <div className="policies-list">
      <h2>Insurance Policies</h2>
      <p className="subtitle">Manage all policies issued by your company (blockchain-filtered)</p>

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
            ✅ Active ({policies.filter(p => p.status === 'ACTIVE').length})
          </button>
          <button 
            className={filter === 'expired' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('expired')}
          >
            ⏰ Expired ({policies.filter(p => p.status === 'EXPIRED').length})
          </button>
          <button 
            className={filter === 'cancelled' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('cancelled')}
          >
            ❌ Cancelled ({policies.filter(p => p.status === 'CANCELLED').length})
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by policy #, patient name, or DID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredPolicies.length === 0 ? (
        <div className="empty-state">
          <p>
            {filter === 'all'
              ? 'No policies found. Create your first policy to get started!'
              : `No ${filter} policies found.`}
          </p>
        </div>
      ) : (
        <div className="policies-grid">
          {filteredPolicies.map((policy) => {
            // Handle both naming conventions (blockchain returns camelCase)
            const policyNumber = policy.policyNumber || policy.policy_number;
            const patientName = policy.patientName || policy.patient_name;
            const policyType = policy.policyType || policy.policy_type;
            const coverageAmount = policy.coverageAmount || policy.coverage_amount;
            const premium = policy.premium;
            const durationMonths = policy.durationMonths || policy.duration_months || policy.durationmonths;
            const insuranceCompany = policy.insuranceCompany || policy.insurance_company || policy.insurancecompany;
            const status = policy.status;
            const createdAt = policy.createdAt || policy.created_at || policy.createdat;
            const expiryDate = policy.expiryDate || policy.expiry_date || policy.expirydate;

            return (
              <div key={policy.id} className="policy-card">
                <div className="policy-header">
                  <div>
                    <h4>Policy #{policyNumber || 'N/A'}</h4>
                    <span className="policy-type">{policyType || 'N/A'}</span>
                  </div>
                  <span className={`status-badge ${
                    status === 'ACTIVE' ? 'success' : 
                    status === 'EXPIRED' ? 'warning' : 
                    'error'
                  }`}>
                    {status === 'ACTIVE' && '✅ '}
                    {status === 'EXPIRED' && '⏰ '}
                    {status === 'CANCELLED' && '❌ '}
                    {status || 'UNKNOWN'}
                  </span>
                </div>

                <div className="policy-details">
                  <div className="detail-row">
                    <span>Patient:</span>
                    <strong>{patientName || 'Unknown'}</strong>
                  </div>

                  <div className="detail-row">
                    <span>DID:</span>
                    <code className="did-code">{policy.did || 'N/A'}</code>
                  </div>

                  <div className="detail-row highlight">
                    <span>Coverage Amount:</span>
                    <strong className="amount">₹{formatAmount(coverageAmount)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Monthly Premium:</span>
                    <strong>₹{formatAmount(premium)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Duration:</span>
                    <span>{durationMonths || 0} months</span>
                  </div>

                  <div className="detail-row">
                    <span>Insurance Company:</span>
                    <span>{insuranceCompany || 'Unknown'}</span>
                  </div>

                  <div className="detail-row">
                    <span>Created:</span>
                    <span>{formatDate(createdAt)}</span>
                  </div>

                  {expiryDate && (
                    <div className="detail-row">
                      <span>Expiry Date:</span>
                      <span>{formatDate(expiryDate)}</span>
                    </div>
                  )}
                </div>

                {status === 'ACTIVE' && (
                  <div className="active-notice">
                    ✅ This policy is active and hospitals can file claims against it.
                  </div>
                )}

                {status === 'EXPIRED' && (
                  <div className="expired-notice">
                    ⏰ This policy has expired. No new claims can be filed.
                  </div>
                )}

                <div className="blockchain-info">
                  <small>🔗 Permanently stored on blockchain - View wallet: {policy.createdBy?.substring(0, 10)}...</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="summary-box">
        <h4>📊 Policies Summary</h4>
        <div className="summary-stats">
          <div>
            <strong>{policies.length}</strong>
            <span>Total Policies</span>
          </div>
          <div>
            <strong>{policies.filter(p => p.status === 'ACTIVE').length}</strong>
            <span>Active Policies</span>
          </div>
          <div>
            <strong>{policies.filter(p => p.status === 'EXPIRED').length}</strong>
            <span>Expired Policies</span>
          </div>
          <div>
            <strong>{policies.filter(p => p.status === 'CANCELLED').length}</strong>
            <span>Cancelled Policies</span>
          </div>
          <div>
            <strong>₹{formatAmount(
              policies
                .filter(p => p.status === 'ACTIVE')
                .reduce((sum, p) => {
                  const amount = p.coverageAmount || p.coverage_amount;
                  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
                  return sum + (isNaN(num) ? 0 : num);
                }, 0)
            )}</strong>
            <span>Total Active Coverage</span>
          </div>
          <div>
            <strong>₹{formatAmount(
              policies
                .filter(p => p.status === 'ACTIVE')
                .reduce((sum, p) => {
                  const amount = p.premium;
                  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
                  return sum + (isNaN(num) ? 0 : num);
                }, 0)
            )}</strong>
            <span>Total Monthly Premium</span>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>🔗 Blockchain Data Privacy</h4>
        <ul>
          <li>✅ You only see policies YOU created (filtered by your wallet address)</li>
          <li>✅ All policy data is stored permanently on blockchain</li>
          <li>✅ Patients can view their policies using their DID</li>
          <li>✅ Hospitals can see ACTIVE policies for claim submission</li>
          <li>✅ No other insurance company can see your policies</li>
        </ul>
      </div>

      <div className="info-box">
        <h4>💡 Policy Management Tips</h4>
        <ul>
          <li>📄 <strong>Create Policies:</strong> Use "Create Policy" to issue new policies for patients with verified SSI identities</li>
          <li>⏰ <strong>Monitor Expiry:</strong> Policies expire after their duration period - renew them before expiry</li>
          <li>📋 <strong>Track Claims:</strong> View all claims filed against your policies in "Claims Management"</li>
          <li>✅ <strong>Active Status:</strong> Only ACTIVE policies can have new claims filed against them</li>
          <li>🔗 <strong>Blockchain Verification:</strong> All policies are immutable and auditable on blockchain</li>
        </ul>
      </div>
    </div>
  );
}

export default PoliciesList;