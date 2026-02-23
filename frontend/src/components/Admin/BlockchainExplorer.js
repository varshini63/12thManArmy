import React, { useState, useEffect } from 'react';
import { getBlockchainChain, getBlockchainStatus } from '../../services/api';

function BlockchainExplorer() {
  const [blockchain, setBlockchain] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBlockchainData = async () => {
    try {
      const [chainRes, statusRes] = await Promise.all([
        getBlockchainChain(),
        getBlockchainStatus()
      ]);
      setBlockchain(chainRes.data);
      setStatus(statusRes.data);
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBlockTypeIcon = (type) => {
    const icons = {
      'GENESIS': '🌟',
      'USER_REGISTERED': '👤',
      'IDENTITY_CREATED': '🆔',
      'IDENTITY_VERIFIED': '✅',
      'POLICY_CREATED': '📄',
      'CLAIM_SUBMITTED': '📝',
      'CLAIM_APPROVED': '✅',
      'CLAIM_REJECTED': '❌',
      'FL_TRAINING_ROUND': '🤖'
    };
    return icons[type] || '📦';
  };

  const getBlockTypeColor = (type) => {
    const colors = {
      'GENESIS': '#8b5cf6',
      'USER_REGISTERED': '#6366f1',
      'IDENTITY_CREATED': '#3b82f6',
      'IDENTITY_VERIFIED': '#10b981',
      'POLICY_CREATED': '#14b8a6',
      'CLAIM_SUBMITTED': '#f59e0b',
      'CLAIM_APPROVED': '#10b981',
      'CLAIM_REJECTED': '#ef4444',
      'FL_TRAINING_ROUND': '#6366f1'
    };
    return colors[type] || '#64748b';
  };

  const getFilteredBlocks = () => {
    if (!blockchain?.chain) return [];
    if (filter === 'all') return blockchain.chain;
    return blockchain.chain.filter(block => block.data?.type === filter);
  };

  const getBlockTypes = () => {
    if (!blockchain?.chain) return {};
    const types = {};
    blockchain.chain.forEach(block => {
      const type = block.data?.type || 'UNKNOWN';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  };

  if (loading) return <div className="loading">Loading blockchain...</div>;

  const filteredBlocks = getFilteredBlocks();
  const blockTypes = getBlockTypes();

  return (
    <div className="blockchain-explorer">
      <h2>Blockchain Explorer</h2>
      <p className="subtitle">View the complete immutable transaction ledger</p>

      <div className="blockchain-status">
        <div className="status-card">
          <h4>⛓️ Chain Status</h4>
          <div className="status-details">
            <div className="detail-row">
              <span>Total Blocks:</span>
              <strong>{blockchain?.length || 0}</strong>
            </div>
            <div className="detail-row">
              <span>Chain Valid:</span>
              <span className={blockchain?.is_valid ? 'status-online' : 'status-offline'}>
                {blockchain?.is_valid ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="detail-row">
              <span>Ganache Network:</span>
              <span className={status?.connected ? 'status-online' : 'status-offline'}>
                {status?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="detail-row">
              <span>Ganache Blocks:</span>
              <strong>{status?.block_number || 0}</strong>
            </div>
            <div className="detail-row">
              <span>Network Port:</span>
              <strong>7550</strong>
            </div>
          </div>
        </div>

        <div className="status-card">
          <h4>📊 Block Type Distribution</h4>
          <div className="distribution">
            {Object.entries(blockTypes).map(([type, count]) => (
              <div key={type} className="dist-item">
                <button 
                  className={`dist-button ${filter === type ? 'active' : ''}`}
                  onClick={() => setFilter(type)}
                >
                  <span>{getBlockTypeIcon(type)} {type}</span>
                  <strong>{count}</strong>
                </button>
              </div>
            ))}
            {filter !== 'all' && (
              <div className="dist-item">
                <button className="dist-button clear" onClick={() => setFilter('all')}>
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="blockchain-chain">
        <h3>Blockchain Ledger {filter !== 'all' && `(Filtered: ${filter})`}</h3>
        <p className="subtitle-small">
          Showing {filteredBlocks.length} of {blockchain?.length || 0} blocks
        </p>
        
        <div className="blocks-container">
          {filteredBlocks.slice().reverse().map((block) => (
            <div 
              key={block.index} 
              className={`block-card ${selectedBlock?.index === block.index ? 'selected' : ''}`}
              onClick={() => setSelectedBlock(block)}
              style={{ borderLeftColor: getBlockTypeColor(block.data?.type) }}
            >
              <div className="block-header">
                <div className="block-index">
                  <span className="block-icon">{getBlockTypeIcon(block.data?.type)}</span>
                  <span>Block #{block.index}</span>
                </div>
                <span 
                  className="block-type" 
                  style={{ backgroundColor: getBlockTypeColor(block.data?.type) }}
                >
                  {block.data?.type || 'UNKNOWN'}
                </span>
              </div>

              <div className="block-details">
                <div className="detail-row">
                  <span>Hash:</span>
                  <code className="hash">{block.hash.substring(0, 20)}...</code>
                </div>
                <div className="detail-row">
                  <span>Previous Hash:</span>
                  <code className="hash">{block.previous_hash.substring(0, 20)}...</code>
                </div>
                <div className="detail-row">
                  <span>Timestamp:</span>
                  <span>{new Date(block.timestamp).toLocaleString()}</span>
                </div>

                {block.data && Object.keys(block.data).length > 1 && (
                  <div className="block-data">
                    <strong>Transaction Data:</strong>
                    {Object.entries(block.data).map(([key, value]) => {
                      if (key === 'type') return null;
                      return (
                        <div key={key} className="data-item">
                          <span className="data-key">{key}:</span>
                          <span className="data-value">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBlock && (
        <div className="block-modal" onClick={() => setSelectedBlock(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Block #{selectedBlock.index} Details</h3>
              <button className="close-btn" onClick={() => setSelectedBlock(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Block Type:</label>
                <span 
                  className="block-type" 
                  style={{ backgroundColor: getBlockTypeColor(selectedBlock.data?.type) }}
                >
                  {getBlockTypeIcon(selectedBlock.data?.type)} {selectedBlock.data?.type}
                </span>
              </div>
              
              <div className="detail-group">
                <label>Block Index:</label>
                <code>{selectedBlock.index}</code>
              </div>
              
              <div className="detail-group">
                <label>Timestamp:</label>
                <code>{selectedBlock.timestamp}</code>
                <small>{new Date(selectedBlock.timestamp).toLocaleString()}</small>
              </div>
              
              <div className="detail-group">
                <label>Block Hash (SHA-256):</label>
                <code className="full-hash">{selectedBlock.hash}</code>
              </div>
              
              <div className="detail-group">
                <label>Previous Block Hash:</label>
                <code className="full-hash">{selectedBlock.previous_hash}</code>
              </div>
              
              <div className="detail-group">
                <label>Transaction Data:</label>
                <pre className="json-data">{JSON.stringify(selectedBlock.data, null, 2)}</pre>
              </div>

              <div className="detail-group">
                <label>Chain Position:</label>
                <div className="chain-position">
                  {selectedBlock.index > 0 && (
                    <button 
                      className="nav-btn"
                      onClick={() => setSelectedBlock(blockchain.chain[selectedBlock.index - 1])}
                    >
                      ← Previous Block
                    </button>
                  )}
                  <span>Block {selectedBlock.index} of {blockchain.chain.length - 1}</span>
                  {selectedBlock.index < blockchain.chain.length - 1 && (
                    <button 
                      className="nav-btn"
                      onClick={() => setSelectedBlock(blockchain.chain[selectedBlock.index + 1])}
                    >
                      Next Block →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="info-box">
        <h4>⛓️ About This Blockchain</h4>
        <p>
          This custom blockchain implementation demonstrates the core principles of blockchain technology 
          for the insurance fraud detection system:
        </p>
        <ul>
          <li>🔐 <strong>Cryptographic Hashing:</strong> Each block is secured with SHA-256 hashing</li>
          <li>🔗 <strong>Chain Linkage:</strong> Blocks are linked through cryptographic hashes</li>
          <li>🛡️ <strong>Immutability:</strong> Any tampering attempt breaks the chain and is immediately detected</li>
          <li>📝 <strong>Complete Audit Trail:</strong> All transactions are permanently recorded</li>
          <li>✅ <strong>Validation:</strong> Chain integrity is continuously verified</li>
          <li>🌐 <strong>Transparency:</strong> All stakeholders can verify transactions</li>
          <li>⚡ <strong>Real-time:</strong> New blocks added instantly for all transaction types</li>
        </ul>
        <p className="note">
          💡 Every user registration, identity creation, policy issuance, claim submission, and FL training 
          round is recorded as a separate block on this blockchain.
        </p>
      </div>
    </div>
  );
}

export default BlockchainExplorer;