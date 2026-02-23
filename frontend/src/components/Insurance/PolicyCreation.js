import React, { useState, useEffect } from 'react';
import { getAllIdentities } from '../../services/api';
import { createPolicyOnChain } from '../../services/blockchain';
import axios from 'axios';

function PolicyCreation() {
  const [formData, setFormData] = useState({
    did: '',
    policyType: 'Health Insurance',
    coverageAmount: '',
    premium: '',
    duration: '12'
  });
  const [identities, setIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [createdPolicy, setCreatedPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    fetchIdentities();
  }, []);

  const fetchIdentities = async () => {
    try {
      const response = await getAllIdentities();
      setIdentities(response.data);
    } catch (error) {
      console.error('Error fetching identities:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleIdentitySelect = (e) => {
    const did = e.target.value;
    setFormData({ ...formData, did });
    const identity = identities.find(i => i.did === did);
    setSelectedIdentity(identity);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTxHash('');
    setCreatedPolicy(null);

    try {
      // Step 1: Backend prepares policy data (generates policy number)
      setMessage('⏳ Preparing policy data...');
      const prepareResponse = await axios.post('http://localhost:5000/api/policies/prepare', {
        did: formData.did,
        patientName: selectedIdentity.name,
        policyType: formData.policyType,
        coverageAmount: formData.coverageAmount,
        premium: formData.premium,
        duration: formData.duration
      }, { withCredentials: true });

      const policyData = prepareResponse.data;
      console.log('✅ Policy prepared:', policyData);

      // Step 2: Create on blockchain via MetaMask
      setMessage('🦊 Please confirm the transaction in MetaMask...');
      const txResult = await createPolicyOnChain(policyData);

      if (txResult.success) {
        setTxHash(txResult.tx.transactionHash);
        const gasUsed = Number(txResult.tx.gasUsed);
        const effectiveGasPrice = txResult.tx.effectiveGasPrice ? Number(txResult.tx.effectiveGasPrice) : 20000000000;
        const gasCost = (gasUsed * effectiveGasPrice) / 1e18;

        setCreatedPolicy({
          ...policyData,
          transactionHash: txResult.tx.transactionHash,
          gasUsed: gasUsed.toString(),
          gasCost
        });

        setMessage(`✅ Policy created on blockchain!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH`);

        // Reset form but keep identity selected
        setFormData({
          ...formData,
          coverageAmount: '',
          premium: ''
        });
      } else {
        setMessage(`❌ Transaction failed: ${txResult.error}`);
      }
    } catch (error) {
      if (error.code === 4001) {
        setMessage('❌ Transaction rejected by user');
      } else {
        setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="policy-creation">
      <h2>Create Insurance Policy</h2>
      <p className="subtitle">Issue new policies to patients on the blockchain</p>

      {identities.length === 0 ? (
        <div className="warning-box">
          <p>⚠️ No patient identities found. Patients must create SSI identities first.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="policy-form">
          <div className="form-group">
            <label>Select Patient *</label>
            <select
              value={formData.did}
              onChange={handleIdentitySelect}
              required
              disabled={loading}
            >
              <option value="">-- Select Patient --</option>
              {identities.map((identity) => (
                <option key={identity.did} value={identity.did}>
                  {identity.name} ({identity.email})
                </option>
              ))}
            </select>
          </div>

          {selectedIdentity && (
            <div className="selected-patient-info">
              <p><strong>Patient:</strong> {selectedIdentity.name}</p>
              <p><strong>Email:</strong> {selectedIdentity.email}</p>
              <p><strong>DID:</strong> <code>{selectedIdentity.did}</code></p>
            </div>
          )}

          <div className="form-group">
            <label>Policy Type *</label>
            <select
              name="policyType"
              value={formData.policyType}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="Health Insurance">Health Insurance</option>
              <option value="Life Insurance">Life Insurance</option>
              <option value="Accident Insurance">Accident Insurance</option>
              <option value="Critical Illness">Critical Illness</option>
            </select>
          </div>

          <div className="form-group">
            <label>Coverage Amount (₹) *</label>
            <input
              type="number"
              name="coverageAmount"
              value={formData.coverageAmount}
              onChange={handleChange}
              required
              disabled={loading}
              min="10000"
              placeholder="e.g., 500000"
            />
          </div>

          <div className="form-group">
            <label>Monthly Premium (₹) *</label>
            <input
              type="number"
              name="premium"
              value={formData.premium}
              onChange={handleChange}
              required
              disabled={loading}
              min="100"
              placeholder="e.g., 2000"
            />
          </div>

          <div className="form-group">
            <label>Duration *</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="6">6 months</option>
              <option value="12">12 months (1 year)</option>
              <option value="24">24 months (2 years)</option>
              <option value="36">36 months (3 years)</option>
              <option value="60">60 months (5 years)</option>
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !formData.did}>
            {loading ? '🔄 Creating on Blockchain...' : '📄 Create Policy (Gas Fee Required)'}
          </button>
        </form>
      )}

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('🦊') ? 'info' : 'error'}`}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{message}</pre>
        </div>
      )}

      {txHash && (
        <div className="tx-info">
          <p><strong>Transaction Hash:</strong></p>
          <code className="tx-hash">{txHash}</code>
        </div>
      )}

      {createdPolicy && (
        <div className="result-box">
          <h4>✅ Policy Created Successfully on Blockchain!</h4>
          <div className="policy-summary">
            <div className="summary-row">
              <span>Policy Number:</span>
              <strong>{createdPolicy.policyNumber}</strong>
            </div>
            <div className="summary-row">
              <span>Patient:</span>
              <strong>{createdPolicy.patientName}</strong>
            </div>
            <div className="summary-row">
              <span>Type:</span>
              <strong>{createdPolicy.policyType}</strong>
            </div>
            <div className="summary-row">
              <span>Coverage:</span>
              <strong>₹{parseInt(createdPolicy.coverageAmount).toLocaleString()}</strong>
            </div>
            <div className="summary-row">
              <span>Premium:</span>
              <strong>₹{parseInt(createdPolicy.premium).toLocaleString()}/month</strong>
            </div>
            <div className="summary-row">
              <span>Duration:</span>
              <strong>{createdPolicy.durationMonths} months</strong>
            </div>
            <div className="summary-row">
              <span>Insurance Company:</span>
              <strong>{createdPolicy.insuranceCompany}</strong>
            </div>
            <div className="summary-row">
              <span>Status:</span>
              <span className="status-badge success">ACTIVE on Blockchain</span>
            </div>
            <div className="summary-row">
              <span>Transaction:</span>
              <code className="tx-hash-small">{createdPolicy.transactionHash.substring(0, 20)}...</code>
            </div>
            <div className="summary-row">
              <span>Gas Used:</span>
              <span>{createdPolicy.gasUsed}</span>
            </div>
            <div className="summary-row">
              <span>Transaction Cost:</span>
              <span>{createdPolicy.gasCost.toFixed(6)} ETH</span>
            </div>
          </div>
          <p className="result-note">
            🔗 Policy is now permanently stored on blockchain. Patient can view it in their portal immediately.
          </p>
        </div>
      )}

      <div className="info-box">
        <h4>📋 Policy Creation Process</h4>
        <ol>
          <li>Select patient with verified SSI identity</li>
          <li>Fill in policy details (type, coverage, premium)</li>
          <li>Click "Create Policy" - MetaMask will pop up</li>
          <li>Confirm transaction and pay gas fee (~0.005 ETH)</li>
          <li>Wait 5-10 seconds for blockchain confirmation</li>
          <li>Policy is permanently stored on blockchain with YOUR address as creator</li>
          <li>Patient can now view this policy in their portal</li>
          <li>Hospitals can file claims against this policy</li>
          <li>Only YOU can approve/reject claims for YOUR policies</li>
        </ol>
      </div>

      <div className="info-box">
        <h4>⛓️ Blockchain Benefits</h4>
        <ul>
          <li>✅ <strong>Immutable:</strong> Policy cannot be altered after creation</li>
          <li>✅ <strong>Transparent:</strong> All parties can verify policy exists</li>
          <li>✅ <strong>Permanent:</strong> Stored forever on blockchain</li>
          <li>✅ <strong>Trustless:</strong> No need to trust central authority</li>
          <li>✅ <strong>Ownership:</strong> Your wallet address is recorded as creator</li>
          <li>✅ <strong>Privacy:</strong> Only relevant parties see policy details</li>
        </ul>
      </div>
    </div>
  );
}

export default PolicyCreation;