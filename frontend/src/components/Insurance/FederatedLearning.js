import React, { useState, useEffect } from 'react';
import { getFLStatus } from '../../services/api';
import { recordTrainingRoundOnChain } from '../../services/blockchain';
import axios from 'axios';

function FederatedLearning() {
  const [flStatus, setFlStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    fetchFLStatus();
    const interval = setInterval(fetchFLStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchFLStatus = async () => {
    try {
      const response = await getFLStatus();
      setFlStatus(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching FL status:', error);
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setMessage('');
    setTxHash('');

    try {
      // Step 1: Backend trains the model
      setMessage('🤖 Training federated learning model across nodes...\nThis may take 10-15 seconds...');
      
      const trainResponse = await axios.post(
        'http://localhost:5000/api/federated-learning/prepare-train',
        {},
        { withCredentials: true }
      );

      const trainingData = trainResponse.data;
      const result = trainingData.result;

      setMessage(`✅ Training Complete!\n` +
                 `Round: ${result.round}\n` +
                 `Global Accuracy: ${(result.global_accuracy * 100).toFixed(2)}%\n` +
                 `Nodes Participated: ${result.nodes_participated}\n` +
                 `Total Samples: ${result.total_samples}\n\n` +
                 `🦊 Confirm in MetaMask to record on blockchain...`);

      // Step 2: Record on blockchain via MetaMask
      const txResult = await recordTrainingRoundOnChain({
        globalAccuracy: trainingData.globalAccuracy,
        nodesParticipated: trainingData.nodesParticipated,
        totalSamples: trainingData.totalSamples
      });

      if (txResult.success) {
        setTxHash(txResult.tx.transactionHash);
        const gasUsed = txResult.tx.gasUsed;
        // Convert BigInt to Number for calculation
        const gasCost = (Number(gasUsed) * 20) / 1e9;

        setMessage(`✅ Training round recorded on blockchain!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed.toString()}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH\n\n` +
                   `Model accuracy improved to ${(result.global_accuracy * 100).toFixed(2)}%!`);

        // Refresh FL status
        setTimeout(() => {
          fetchFLStatus();
        }, 2000);
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
      setTraining(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading Federated Learning status...</div>;
  }

  return (
    <div className="federated-learning">
      <h2>Federated Learning System</h2>
      <p className="subtitle">Privacy-preserving collaborative AI training with blockchain verification</p>

      <div className="fl-overview">
        <div className="overview-card">
          <h3>🎯 Global Model Accuracy</h3>
          <div className="accuracy-display">
            {(flStatus.global_accuracy * 100).toFixed(2)}%
          </div>
          <p>Current model performance</p>
        </div>

        <div className="overview-card">
          <h3>🔄 Training Rounds</h3>
          <div className="rounds-display">
            {flStatus.rounds_completed}
          </div>
          <p>Completed on blockchain</p>
        </div>

        <div className="overview-card">
          <h3>🏥 Active Nodes</h3>
          <div className="nodes-display">
            {flStatus.active_nodes} / {flStatus.total_nodes}
          </div>
          <p>Participating institutions</p>
        </div>

        <div className="overview-card">
          <h3>📊 Training Samples</h3>
          <div className="samples-display">
            {flStatus.total_training_samples.toLocaleString()}
          </div>
          <p>Total data points</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('🤖') || message.includes('🦊') ? 'info' : 'error'}`}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{message}</pre>
        </div>
      )}

      {txHash && (
        <div className="tx-info">
          <p><strong>Blockchain Transaction Hash:</strong></p>
          <code className="tx-hash">{txHash}</code>
          <p className="tx-note">
            This training round is now permanently recorded on the blockchain and can be verified by anyone.
          </p>
        </div>
      )}

      <div className="training-section">
        <button 
          className="train-btn"
          onClick={handleTrain}
          disabled={training}
        >
          {training ? '🔄 Training & Recording on Blockchain...' : '🚀 Start Training Round (Gas Fee Required)'}
        </button>
        {!training && (
          <p className="train-note">
            Click to train the model across all nodes and record results on blockchain (~15 seconds + gas fee)
          </p>
        )}
      </div>

      <div className="nodes-section">
        <h3>🏥 Participating Nodes</h3>
        <p className="subtitle-small">Hospitals and insurance companies collaborating on model training</p>
        
        <div className="nodes-grid">
          {flStatus.nodes.map((node) => (
            <div key={node.node_id} className="node-card">
              <div className="node-header">
                <h4>{node.name}</h4>
                <span className={`node-status ${node.samples > 0 ? 'active' : 'inactive'}`}>
                  {node.samples > 0 ? '✅ Active' : '⭕ Inactive'}
                </span>
              </div>
              <div className="node-details">
                <div className="detail-row">
                  <span>Node ID:</span>
                  <strong>#{node.node_id}</strong>
                </div>
                <div className="detail-row">
                  <span>Training Samples:</span>
                  <strong>{node.samples.toLocaleString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Local Accuracy:</span>
                  <strong>{node.accuracy > 0 ? `${(node.accuracy * 100).toFixed(2)}%` : 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Contribution:</span>
                  <strong>
                    {flStatus.total_training_samples > 0 
                      ? `${((node.samples / flStatus.total_training_samples) * 100).toFixed(1)}%`
                      : '0%'}
                  </strong>
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${node.accuracy * 100}%`,
                    backgroundColor: node.accuracy > 0.7 ? '#10b981' : node.accuracy > 0.5 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {flStatus.training_history && flStatus.training_history.length > 0 && (
        <div className="training-history">
          <h3>📜 Training History (Blockchain Records)</h3>
          <p className="subtitle-small">Each round is permanently recorded on the blockchain with immutable timestamps</p>
          
          <div className="history-table">
            <div className="table-header">
              <div>Round</div>
              <div>Global Accuracy</div>
              <div>Nodes</div>
              <div>Samples</div>
              <div>Timestamp</div>
              <div>Improvement</div>
            </div>
            {flStatus.training_history.slice().reverse().map((record, index, arr) => {
              const prevAccuracy = index < arr.length - 1 ? arr[index + 1].global_accuracy : 0;
              const improvement = record.global_accuracy - prevAccuracy;
              
              return (
                <div key={record.round} className="table-row">
                  <div><strong>#{record.round}</strong></div>
                  <div className="accuracy-cell">
                    {(record.global_accuracy * 100).toFixed(2)}%
                  </div>
                  <div>{record.nodes_participated}</div>
                  <div>{record.total_samples.toLocaleString()}</div>
                  <div>{new Date(record.timestamp).toLocaleString()}</div>
                  <div className={improvement > 0 ? 'improvement-positive' : improvement < 0 ? 'improvement-negative' : 'improvement-neutral'}>
                    {improvement > 0 ? '↗' : improvement < 0 ? '↘' : '→'} 
                    {improvement !== 0 ? ` ${(improvement * 100).toFixed(2)}%` : ' 0%'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="info-section">
        <div className="info-box">
          <h4>🔐 How Federated Learning Works</h4>
          <ol>
            <li>
              <strong>Local Training:</strong> Each node (hospital/insurer) trains the model 
              on their own private data locally. No data ever leaves their servers, ensuring 
              complete privacy and HIPAA compliance.
            </li>
            <li>
              <strong>Model Updates:</strong> Only model parameters (mathematical weights) are 
              shared with the central aggregator, never raw patient data. This preserves privacy 
              while enabling collaboration.
            </li>
            <li>
              <strong>Secure Aggregation:</strong> The server aggregates updates from all 
              participating nodes using weighted averaging based on sample sizes. Larger datasets 
              have proportionally more influence.
            </li>
            <li>
              <strong>Global Model Distribution:</strong> An improved global model is created and can be 
              distributed back to all nodes for the next training round, continuously improving accuracy.
            </li>
            <li>
              <strong>Blockchain Recording:</strong> Each training round's results (accuracy, participants, 
              samples) are permanently recorded on the blockchain via MetaMask transaction, creating an 
              immutable audit trail.
            </li>
          </ol>
        </div>

        <div className="info-box">
          <h4>⛓️ Why Record on Blockchain?</h4>
          <ul>
            <li>✅ <strong>Immutable Audit Trail:</strong> Training history cannot be altered or deleted</li>
            <li>✅ <strong>Complete Transparency:</strong> All stakeholders can verify model improvements</li>
            <li>✅ <strong>Accountability:</strong> Who triggered each training round is cryptographically recorded</li>
            <li>✅ <strong>Regulatory Compliance:</strong> Meets FDA and regulatory requirements for AI model tracking</li>
            <li>✅ <strong>Trust Building:</strong> Cryptographically verified model evolution builds stakeholder confidence</li>
            <li>✅ <strong>Fraud Prevention:</strong> Prevents manipulation of training results or model performance claims</li>
          </ul>
        </div>

        <div className="info-box">
          <h4>✨ Key Benefits</h4>
          <ul>
            <li>🔒 <strong>Complete Privacy:</strong> Raw patient data never shared between institutions</li>
            <li>🌐 <strong>Collaborative Learning:</strong> Multiple organizations improve model together</li>
            <li>📈 <strong>Better Accuracy:</strong> Model learns from diverse, distributed datasets</li>
            <li>⚡ <strong>Continuous Improvement:</strong> Model accuracy increases with each training round</li>
            <li>🛡️ <strong>HIPAA/GDPR Compliant:</strong> Meets strict healthcare privacy regulations</li>
            <li>🔗 <strong>Blockchain Verified:</strong> All training rounds permanently recorded and verifiable</li>
            <li>🎯 <strong>Domain Specific:</strong> Specialized for insurance fraud detection use case</li>
            <li>💰 <strong>Cost Effective:</strong> Small gas fees (~0.002 ETH) for permanent verification</li>
            <li>🤝 <strong>Trust & Transparency:</strong> Open verification without compromising privacy</li>
          </ul>
        </div>

        <div className="info-box">
          <h4>📊 Training Process Explained</h4>
          <p>When you click "Start Training Round", here's what happens:</p>
          <ol>
            <li><strong>Coordination:</strong> Backend coordinates training across all 5 participating nodes</li>
            <li><strong>Local Training:</strong> Each node trains on their private data (2-3 seconds per node)</li>
            <li><strong>Parameter Aggregation:</strong> Model parameters (not data!) are collected and aggregated</li>
            <li><strong>Global Model Update:</strong> New global model is created with improved accuracy</li>
            <li><strong>MetaMask Confirmation:</strong> Popup asks you to confirm blockchain transaction</li>
            <li><strong>Gas Fee Payment:</strong> Small gas fee (~0.002 ETH) paid for permanent storage</li>
            <li><strong>Blockchain Recording:</strong> Training results recorded on blockchain forever</li>
            <li><strong>Model Distribution:</strong> Updated model distributed to all nodes for next round</li>
          </ol>
          <p className="note">
            💡 <strong>Total Time:</strong> ~15 seconds for complete training + blockchain recording
          </p>
        </div>

        <div className="info-box">
          <h4>🎓 Technical Details</h4>
          <ul>
            <li><strong>Algorithm:</strong> Federated Averaging (FedAvg) with weighted aggregation</li>
            <li><strong>Model Type:</strong> Neural network for binary classification (fraud/legitimate)</li>
            <li><strong>Privacy Technique:</strong> Differential privacy with gradient clipping</li>
            <li><strong>Aggregation Method:</strong> Weighted average based on sample sizes</li>
            <li><strong>Communication:</strong> Encrypted parameter updates only</li>
            <li><strong>Blockchain:</strong> Ethereum smart contract for result verification</li>
          </ul>
        </div>
      </div>

      <div className="blockchain-link">
        <p>
          💡 <strong>Blockchain Verification:</strong> All training rounds are recorded on the Ethereum blockchain 
          with transaction hashes. This ensures complete transparency and prevents any manipulation of training history. 
          View the complete audit trail above or in the Admin dashboard. Each transaction includes the round number, 
          accuracy metrics, and participant information, creating a permanent, verifiable record of model evolution.
        </p>
      </div>
    </div>
  );
}

export default FederatedLearning;