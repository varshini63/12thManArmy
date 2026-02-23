import React, { useState, useEffect } from 'react';
import { initWeb3, loadContract, getCurrentAccount, checkUserExists } from '../../services/blockchain';
import { login } from '../../services/api';

function Login({ onLogin }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        
        // Check if user exists
        const exists = await checkUserExists(account);
        setUserExists(exists);
        
        if (!exists) {
          setError('Wallet not registered. Please register first.');
        }
      } else {
        setError('Smart contract not deployed. Run: truffle migrate --reset');
      }
    } else {
      setError(web3Result.error || 'Please install MetaMask');
    }
  };

  const handleLogin = async () => {
    if (!userExists) {
      setError('This wallet is not registered. Please register first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await login({ address: walletAddress });
      onLogin(response.data.user);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>🛡️ Insurance Fraud Detection</h1>
          <h2>Login to Your Account</h2>
        </div>

        {!walletConnected ? (
          <div className="wallet-connect">
            <p className="info">🦊 Connect your MetaMask wallet to login</p>
            <button className="connect-wallet-btn" onClick={connectWallet}>
              Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            <div className="wallet-info">
              <p><strong>Connected Wallet:</strong></p>
              <code className="wallet-address">{walletAddress}</code>
              {userExists && (
                <p className="status-success">✅ Account found on blockchain</p>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {userExists ? (
              <button 
                className="auth-submit-btn" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? '🔄 Logging in...' : '🔓 Login with MetaMask'}
              </button>
            ) : (
              <button 
                className="auth-submit-btn register-redirect" 
                onClick={() => window.location.href = '/register'}
              >
                📝 Register This Wallet
              </button>
            )}
          </>
        )}

        <div className="auth-footer">
          <p>Don't have an account? <a href="/register">Register here</a></p>
        </div>

        <div className="demo-accounts">
          <h4>🎬 For Demo: Admin Account</h4>
          <div className="demo-account-list">
            <div className="demo-account">
              <p><strong>Admin Access:</strong></p>
              <p>Import the first Ganache account that was used to deploy contracts</p>
              <p className="note">This account is auto-registered as admin</p>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h4>🔐 Blockchain Login</h4>
          <p>
            This system uses wallet-based authentication. Your MetaMask wallet serves as your 
            identity, ensuring:
          </p>
          <ul>
            <li>✅ No passwords to remember</li>
            <li>✅ Cryptographically secure</li>
            <li>✅ Complete decentralization</li>
            <li>✅ You control your identity</li>
          </ul>
          <p className="note">
            💡 Make sure you're connected to the Ganache network (localhost:7550)
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;