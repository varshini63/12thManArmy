import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initWeb3, loadContract, getCurrentAccount, registerUser, checkUserExists } from '../../services/blockchain';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    role: 'patient',
    name: ''
  });
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    const web3Result = await initWeb3();
    if (web3Result.success) {
      const contractResult = await loadContract();
      if (contractResult.success) {
        const account = await getCurrentAccount();
        setWalletAddress(account);
        setWalletConnected(true);
        
        // Check if user already exists
        const exists = await checkUserExists(account);
        if (exists) {
          setError('This wallet is already registered. Please login instead.');
        }
      } else {
        setError('Smart contract not deployed. Run: truffle migrate --reset');
      }
    } else {
      setError(web3Result.error || 'Please install MetaMask');
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
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Check if user already exists
      const exists = await checkUserExists(walletAddress);
      if (exists) {
        setError('This wallet is already registered');
        setLoading(false);
        return;
      }

      // Register on blockchain via MetaMask
      setSuccess('📝 Please confirm the transaction in MetaMask...');
      const result = await registerUser(
        formData.username,
        formData.role,
        formData.name
      );

      if (result.success) {
        setTxHash(result.tx.transactionHash);
        setSuccess(`✅ Registration successful! Transaction: ${result.tx.transactionHash.substring(0, 10)}...`);
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box register-box">
        <div className="auth-header">
          <h1>🛡️ Insurance Fraud Detection</h1>
          <h2>Create New Account</h2>
        </div>

        {!walletConnected ? (
          <div className="wallet-connect">
            <p className="warning">⚠️ Please connect your MetaMask wallet</p>
            <button className="connect-wallet-btn" onClick={connectWallet}>
              🦊 Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            <div className="wallet-info">
              <p><strong>Connected Wallet:</strong></p>
              <code className="wallet-address">{walletAddress}</code>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Account Type *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="patient">Patient</option>
                  <option value="hospital">Hospital</option>
                  <option value="insurance">Insurance Company</option>
                </select>
                <small className="form-help">
                  {formData.role === 'patient' && 'Create SSI identity and view your policies & claims'}
                  {formData.role === 'hospital' && 'Submit claims on behalf of patients'}
                  {formData.role === 'insurance' && 'Create policies, manage claims, and train AI models'}
                </small>
              </div>

              <div className="form-group">
                <label>Full Name / Organization Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder={
                    formData.role === 'patient' ? 'e.g., Dr. Rajesh Kumar' :
                    formData.role === 'hospital' ? 'e.g., Apollo Hospitals' :
                    'e.g., HDFC Life Insurance'
                  }
                />
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Choose a unique username"
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              {txHash && (
                <div className="tx-info">
                  <p><strong>Transaction Hash:</strong></p>
                  <code className="tx-hash">{txHash}</code>
                  <small>View on blockchain explorer</small>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? '🔄 Registering on Blockchain...' : '📝 Register (Requires Gas Fee)'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>

        <div className="registration-guide">
          <h4>🦊 MetaMask Setup:</h4>
          <ol>
            <li>Make sure MetaMask is installed and unlocked</li>
            <li>Connect to Ganache network (localhost:7550)</li>
            <li>Import a Ganache account with test ETH</li>
            <li>Each registration costs a small gas fee (~0.01 ETH)</li>
            <li>Confirm the transaction in MetaMask popup</li>
          </ol>
        </div>

        <div className="info-box">
          <h4>ℹ️ Blockchain Registration</h4>
          <p>
            Your account will be stored on the Ethereum blockchain. This ensures:
          </p>
          <ul>
            <li>✅ Immutable record of registration</li>
            <li>✅ Decentralized identity verification</li>
            <li>✅ Complete transparency</li>
            <li>✅ No central authority control</li>
          </ul>
          <p className="note">
            💡 You'll need to confirm this transaction in MetaMask and pay a small gas fee.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;