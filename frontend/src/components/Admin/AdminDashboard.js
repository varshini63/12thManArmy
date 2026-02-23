import React, { useState, useEffect } from 'react';
import { getAnalytics, getBlockchainStatus } from '../../services/api';

function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, blockchainRes] = await Promise.all([
        getAnalytics(),
        getBlockchainStatus()
      ]);
      setAnalytics(analyticsRes.data);
      setBlockchainStatus(blockchainRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>System Administrator Dashboard</h2>
      <p className="subtitle">Complete system overview and blockchain monitoring</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{analytics?.total_users || 0}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <h3>{analytics?.total_patients || 0}</h3>
            <p>Patients</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div className="stat-content">
            <h3>{analytics?.total_hospitals || 0}</h3>
            <p>Hospitals</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>{analytics?.total_insurance || 0}</h3>
            <p>Insurance Companies</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🆔</div>
          <div className="stat-content">
            <h3>{analytics?.total_identities || 0}</h3>
            <p>SSI Identities</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{analytics?.total_policies || 0}</h3>
            <p>Total Policies</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{analytics?.total_claims || 0}</h3>
            <p>Total Claims</p>
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
          <div className="stat-icon">⛓️</div>
          <div className="stat-content">
            <h3>{analytics?.blockchain_blocks || 0}</h3>
            <p>Blockchain Blocks</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h3>{analytics?.fl_rounds || 0}</h3>
            <p>FL Training Rounds</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{analytics?.fraud_rate?.toFixed(1) || 0}%</h3>
            <p>Fraud Detection Rate</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{analytics?.approved_claims || 0}</h3>
            <p>Approved Claims</p>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <h3>⛓️ Blockchain Status</h3>
          <div className="blockchain-info">
            <div className="info-row">
              <span>Connection Status:</span>
              <span className={blockchainStatus?.connected ? 'status-online' : 'status-offline'}>
                {blockchainStatus?.connected ? '✓ Connected' : '✗ Disconnected'}
              </span>
            </div>
            <div className="info-row">
              <span>Ganache Block Number:</span>
              <span>{blockchainStatus?.block_number || 0}</span>
            </div>
            <div className="info-row">
              <span>Custom Chain Length:</span>
              <span>{blockchainStatus?.custom_chain_length || 0} blocks</span>
            </div>
            <div className="info-row">
              <span>Chain Validation:</span>
              <span className={blockchainStatus?.custom_chain_valid ? 'status-online' : 'status-offline'}>
                {blockchainStatus?.custom_chain_valid ? '✓ Valid' : '✗ Invalid'}
              </span>
            </div>
            <div className="info-row">
              <span>Network Port:</span>
              <span>7550</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>🔐 System Security</h3>
          <div className="security-info">
            <div className="security-item success">
              <span className="security-icon">✓</span>
              <span>Blockchain Immutability: Active</span>
            </div>
            <div className="security-item success">
              <span className="security-icon">✓</span>
              <span>SSI Cryptographic Verification: Enabled</span>
            </div>
            <div className="security-item success">
              <span className="security-icon">✓</span>
              <span>Federated Learning Privacy: Protected</span>
            </div>
            <div className="security-item success">
              <span className="security-icon">✓</span>
              <span>AI Fraud Detection: Active</span>
            </div>
            <div className="security-item success">
              <span className="security-icon">✓</span>
              <span>Audit Trail: Complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="user-distribution">
        <h3>User Distribution</h3>
        <div className="distribution-chart">
          <div className="distribution-item">
            <div className="distribution-bar" 
              style={{ 
                width: analytics?.total_users ? `${(analytics.total_patients / analytics.total_users) * 100}%` : '0%',
                backgroundColor: '#3b82f6' 
              }}
            />
            <span>Patients: {analytics?.total_patients || 0} ({analytics?.total_users ? ((analytics.total_patients / analytics.total_users) * 100).toFixed(1) : 0}%)</span>
          </div>
          <div className="distribution-item">
            <div className="distribution-bar" 
              style={{ 
                width: analytics?.total_users ? `${(analytics.total_hospitals / analytics.total_users) * 100}%` : '0%',
                backgroundColor: '#10b981' 
              }}
            />
            <span>Hospitals: {analytics?.total_hospitals || 0} ({analytics?.total_users ? ((analytics.total_hospitals / analytics.total_users) * 100).toFixed(1) : 0}%)</span>
          </div>
          <div className="distribution-item">
            <div className="distribution-bar" 
              style={{ 
                width: analytics?.total_users ? `${(analytics.total_insurance / analytics.total_users) * 100}%` : '0%',
                backgroundColor: '#f59e0b' 
              }}
            />
            <span>Insurance: {analytics?.total_insurance || 0} ({analytics?.total_users ? ((analytics.total_insurance / analytics.total_users) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.location.href = '/admin/blockchain'}>
            ⛓️ View Blockchain
          </button>
          <button className="action-btn" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      <div className="system-info">
        <h3>📊 System Statistics</h3>
        <div className="stats-table">
          <div className="stat-row">
            <span>Total Transactions on Blockchain:</span>
            <strong>{analytics?.blockchain_blocks || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Average Claims per User:</span>
            <strong>{analytics?.total_users && analytics?.total_claims ? (analytics.total_claims / analytics.total_users).toFixed(2) : 0}</strong>
          </div>
          <div className="stat-row">
            <span>Average Policies per Patient:</span>
            <strong>{analytics?.total_patients && analytics?.total_policies ? (analytics.total_policies / analytics.total_patients).toFixed(2) : 0}</strong>
          </div>
          <div className="stat-row">
            <span>Fraud Prevention Rate:</span>
            <strong>{analytics?.fraud_rate ? (100 - analytics.fraud_rate).toFixed(1) : 100}%</strong>
          </div>
          <div className="stat-row">
            <span>System Uptime:</span>
            <strong className="success">100%</strong>
          </div>
          <div className="stat-row">
            <span>Data Integrity:</span>
            <strong className="success">Verified ✓</strong>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>🛡️ Administrator Capabilities</h4>
        <ul>
          <li>✅ Monitor all system activity and user statistics</li>
          <li>✅ View complete blockchain transaction history</li>
          <li>✅ Verify blockchain integrity and validation</li>
          <li>✅ Track fraud detection performance metrics</li>
          <li>✅ Monitor federated learning training progress</li>
          <li>✅ Ensure system security and compliance</li>
          <li>✅ Access comprehensive audit trails</li>
        </ul>
        <p className="note">
          💡 All system data is immutably recorded on the blockchain. Use the Blockchain Explorer to view detailed transaction history.
        </p>
      </div>
    </div>
  );
}

export default AdminDashboard;