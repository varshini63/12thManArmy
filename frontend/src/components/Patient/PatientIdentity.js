import React, { useState, useEffect } from 'react';
import { createIdentity, getMyIdentity } from '../../services/api';
import { createIdentityOnChain } from '../../services/blockchain';

function PatientIdentity() {
  const [identity, setIdentity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    idNumber: '',
    dateOfBirth: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchingIdentity, setFetchingIdentity] = useState(true);
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    fetchIdentity();
  }, []);

  const fetchIdentity = async () => {
    try {
      const response = await getMyIdentity();
      setIdentity(response.data);
    } catch (error) {
      console.log('No identity found');
    } finally {
      setFetchingIdentity(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTxHash('');

    try {
      setMessage('⏳ Preparing identity data...');
      const response = await createIdentity(formData);
      const identityData = response.data;

      setMessage('🦊 Please confirm the transaction in MetaMask...');
      const txResult = await createIdentityOnChain(
        identityData.did,
        identityData.name,
        identityData.email,
        identityData.idNumber,
        identityData.dateOfBirth
      );

      if (txResult.success) {
        setTxHash(txResult.tx.transactionHash);
        const gasUsed = txResult.tx.gasUsed;
        const gasCost = (Number(gasUsed) * 20) / 1e9;
        
        setMessage(`✅ Identity created on blockchain!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed.toString()}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH`);
        
        setFormData({ name: '', email: '', idNumber: '', dateOfBirth: '' });
        
        setTimeout(() => {
          fetchIdentity();
        }, 2000);
      } else {
        setMessage(`❌ Transaction failed: ${txResult.error}`);
      }
    } catch (error) {
      if (error.code === 4001) {
        setMessage('❌ Transaction rejected by user');
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingIdentity) {
    return <div className="loading">Loading identity from blockchain...</div>;
  }

  if (identity) {
    return (
      <div className="patient-identity">
        <h2>My SSI Identity</h2>
        <p className="subtitle">Your Self-Sovereign Identity stored on blockchain</p>

        <div className="identity-card verified">
          <div className="identity-header">
            <h3>{identity.name}</h3>
            <span className="status-badge success">✓ Verified on Blockchain</span>
          </div>

          <div className="identity-details">
            <div className="detail-row">
              <span className="label">Decentralized Identifier (DID):</span>
              <code className="did-value">{identity.did}</code>
            </div>

            <div className="detail-row">
              <span className="label">Email:</span>
              <span>{identity.email}</span>
            </div>

            <div className="detail-row">
              <span className="label">ID Number:</span>
              <span>{identity.idNumber}</span>
            </div>

            <div className="detail-row">
              <span className="label">Date of Birth:</span>
              <span>{identity.dateOfBirth}</span>
            </div>

            <div className="detail-row">
              <span className="label">Wallet Address:</span>
              <code className="key-value">{identity.wallet_address}</code>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h4>✅ Your Identity is on the Blockchain</h4>
          <ul>
            <li>✅ <strong>Immutable:</strong> Cannot be changed or deleted</li>
            <li>✅ <strong>Decentralized:</strong> Stored on Ethereum blockchain</li>
            <li>✅ <strong>Self-Sovereign:</strong> You own and control your identity</li>
            <li>✅ <strong>Permanent:</strong> Will exist as long as blockchain exists</li>
            <li>✅ <strong>Privacy-Preserving:</strong> Share only what you need to share</li>
          </ul>
          <p className="note">
            💡 This identity was created with a blockchain transaction that cost gas fees and is now permanently stored.
            Insurance companies can now issue policies to your DID, and hospitals can file claims using it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-identity">
      <h2>Create Your SSI Identity</h2>
      <p className="subtitle">Create a blockchain-based Self-Sovereign Identity</p>

      <div className="content-grid">
        <div className="form-section">
          <form onSubmit={handleSubmit} className="identity-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="form-group">
              <label>Government ID Number *</label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Aadhaar / PAN / Passport"
              />
            </div>

            <div className="form-group">
              <label>Date of Birth *</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '🔄 Creating on Blockchain...' : '🆔 Create Identity (Gas Fee Required)'}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {txHash && (
            <div className="tx-info">
              <p><strong>Transaction Hash:</strong></p>
              <code className="tx-hash">{txHash}</code>
              <a 
                href={`http://localhost:7550`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="tx-link"
              >
                View in Ganache →
              </a>
            </div>
          )}
        </div>

        <div className="info-section">
          <div className="info-box">
            <h4>🦊 MetaMask Transaction</h4>
            <p>
              When you click "Create Identity", MetaMask will pop up asking you to confirm a blockchain transaction.
            </p>
            <ul>
              <li>📝 <strong>What's happening:</strong> Your identity is being written to the blockchain</li>
              <li>💰 <strong>Gas Fee:</strong> ~0.004 ETH (from your wallet)</li>
              <li>⏱️ <strong>Time:</strong> 5-10 seconds for confirmation</li>
              <li>🔒 <strong>Security:</strong> Cryptographically signed by your wallet</li>
            </ul>
          </div>

          <div className="info-box">
            <h4>🎯 Why SSI on Blockchain?</h4>
            <p>
              Traditional identity systems store your data in centralized databases that can be hacked or manipulated. 
              With blockchain-based SSI:
            </p>
            <ul>
              <li>🔐 <strong>You Control:</strong> Your private key, your identity</li>
              <li>🌐 <strong>Decentralized:</strong> No single point of failure</li>
              <li>🔒 <strong>Private:</strong> Share only what's needed</li>
              <li>✅ <strong>Verifiable:</strong> Anyone can verify authenticity on blockchain</li>
              <li>♾️ <strong>Permanent:</strong> Stored forever on blockchain</li>
            </ul>
          </div>

          <div className="info-box">
            <h4>📋 What happens next?</h4>
            <ol>
              <li>System generates a unique DID (Decentralized Identifier)</li>
              <li>Your data is prepared with cryptographic credentials</li>
              <li>MetaMask asks you to confirm the transaction</li>
              <li>You pay a small gas fee (like a stamp for permanent storage)</li>
              <li>Identity is written to the blockchain immutably</li>
              <li>Insurance companies can now issue policies to your DID</li>
              <li>Hospitals can file claims using your DID</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientIdentity;