import React, { useState, useEffect } from 'react';
import { getClaims } from '../../services/api';
import { approveClaimOnChain, rejectClaimOnChain } from '../../services/blockchain';
import './ClaimsManagement.css';

function ClaimsManagement() {
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filter, searchTerm, claims]);

  const fetchClaims = async () => {
    try {
      const response = await getClaims();
      console.log('✅ Insurance claims (filtered by policy ownership):', response.data);
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
      if (filter === 'flagged') {
        filtered = filtered.filter(claim => claim.aiDecision === 'FLAGGED' || claim.isFraudulent);
      } else {
        filtered = filtered.filter(claim => claim.status === filter.toUpperCase());
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(claim => 
        claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.patientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClaims(filtered);
  };

  const handleApprove = async (claimId) => {
    if (!window.confirm('Are you sure you want to approve this claim? This will create a blockchain transaction.')) {
      return;
    }

    setProcessing(claimId);
    setMessage('');

    try {
      setMessage('🦊 Please confirm the transaction in MetaMask...');
      
      const txResult = await approveClaimOnChain(claimId);

      if (txResult.success) {
        const gasUsed = Number(txResult.tx.gasUsed);
        const effectiveGasPrice = txResult.tx.effectiveGasPrice ? Number(txResult.tx.effectiveGasPrice) : 20000000000;
        const gasCost = (gasUsed * effectiveGasPrice) / 1e18;
        
        setMessage(`✅ Claim approved on blockchain!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH`);
        
        setTimeout(() => {
          fetchClaims();
          setMessage('');
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
      setProcessing(null);
    }
  };

  const handleReject = async (claimId) => {
    if (!window.confirm('Are you sure you want to reject this claim? This will create a blockchain transaction.')) {
      return;
    }

    setProcessing(claimId);
    setMessage('');

    try {
      setMessage('🦊 Please confirm the transaction in MetaMask...');
      
      const txResult = await rejectClaimOnChain(claimId);

      if (txResult.success) {
        const gasUsed = Number(txResult.tx.gasUsed);
        const effectiveGasPrice = txResult.tx.effectiveGasPrice ? Number(txResult.tx.effectiveGasPrice) : 20000000000;
        const gasCost = (gasUsed * effectiveGasPrice) / 1e18;
        
        setMessage(`✅ Claim rejected on blockchain!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH`);
        
        setTimeout(() => {
          fetchClaims();
          setMessage('');
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
      setProcessing(null);
    }
  };

  const formatAmount = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0' : num.toLocaleString('en-IN');
  };

  const viewClaimDetails = (claim) => {
    setSelectedClaim(claim);
  };

  const closeModal = () => {
    setSelectedClaim(null);
  };

  const downloadFile = (fileData) => {
    try {
      const byteCharacters = atob(fileData.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.mimetype });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Unable to download file');
    }
  };

  const countFlaggedClaims = () => {
    return claims.filter(c => c.aiDecision === 'FLAGGED' || c.isFraudulent).length;
  };

  const getFraudTypeBadgeClass = (fraudType) => {
    if (!fraudType || fraudType === 'UNKNOWN' || fraudType === 'HIDDEN') return 'info';
    if (fraudType === 'LEGITIMATE' || fraudType === 'LOW_RISK') return 'success';
    if (fraudType === 'MODERATE_RISK' || fraudType === 'OVERBILLING' || fraudType === 'EXAGGERATED_CLAIMS') return 'warning';
    return 'error';
  };

  const getFraudTypeDisplay = (fraudType) => {
    if (!fraudType || fraudType === 'UNKNOWN') return 'UNKNOWN';
    if (fraudType === 'HIDDEN') return 'HIDDEN';
    return fraudType.replace(/_/g, ' ');
  };

  const getRiskLevelBadge = (riskLevel) => {
    if (riskLevel === 'LOW') return 'success';
    if (riskLevel === 'MEDIUM') return 'warning';
    return 'error';
  };

  if (loading) {
    return <div className="loading">Loading claims from blockchain...</div>;
  }

  return (
    <div className="claims-management">
      <h2>Claims Management</h2>
      <p className="subtitle">Review claims for YOUR policies only (blockchain-filtered)</p>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('🦊') ? 'info' : 'error'}`}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{message}</pre>
        </div>
      )}

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
            ⏳ Pending ({claims.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            className={filter === 'approved' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('approved')}
          >
            ✅ Approved ({claims.filter(c => c.status === 'APPROVED').length})
          </button>
          <button 
            className={filter === 'rejected' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('rejected')}
          >
            ❌ Rejected ({claims.filter(c => c.status === 'REJECTED').length})
          </button>
          <button 
            className={filter === 'flagged' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('flagged')}
          >
            🚩 AI Flagged ({countFlaggedClaims()})
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by claim # or patient name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredClaims.length === 0 ? (
        <div className="empty-state">
          <p>
            {filter === 'all' 
              ? 'No claims found for your policies. Claims will appear here when hospitals submit them against policies you issued.'
              : `No ${filter} claims found for your policies.`}
          </p>
        </div>
      ) : (
        <div className="claims-grid">
          {filteredClaims.map((claim) => {
            const proofFiles = claim.proofFiles || [];
            const geminiAnalysis = claim.geminiAnalysis || '';
            const aiDecision = claim.aiDecision || 'PENDING';
            const mlFraudType = claim.mlFraudType || 'UNKNOWN';
            const mlConfidence = claim.mlConfidence || 0;
            const fraudScore = claim.fraudScore || 0;
            const isFraudulent = claim.isFraudulent || false;
            
            // NEW: Extract ML and Gemini specific data
            const mlAvailable = claim.mlAvailable !== undefined ? claim.mlAvailable : false;
            const mlModelAccuracy = claim.mlModelAccuracy || 0;
            const geminiScore = claim.geminiScore || 0;
            const riskLevel = claim.riskLevel || 'UNKNOWN';
            
            return (
              <div key={claim.id} className="claim-card">
                <div className="claim-header">
                  <div>
                    <h4>Claim #{claim.claimNumber}</h4>
                    <span className="claim-type">{claim.claimType}</span>
                  </div>
                  <span className={`status-badge ${
                    claim.status === 'APPROVED' ? 'success' : 
                    claim.status === 'REJECTED' ? 'error' : 
                    'pending'
                  }`}>
                    {claim.status === 'APPROVED' && '✅ '}
                    {claim.status === 'REJECTED' && '❌ '}
                    {claim.status === 'PENDING' && '⏳ '}
                    {claim.status}
                  </span>
                </div>

                <div className="claim-details">
                  <div className="detail-row">
                    <span>Patient:</span>
                    <strong>{claim.patientName}</strong>
                  </div>
                  
                  <div className="detail-row highlight">
                    <span>Claim Amount:</span>
                    <strong className="amount">₹{formatAmount(claim.amount)}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Hospital:</span>
                    <span>{claim.hospitalName}</span>
                  </div>

                  <div className="detail-row">
                    <span>Policy Number:</span>
                    <span>{claim.policyNumber}</span>
                  </div>

                  <div className="detail-row">
                    <span>Diagnosis:</span>
                    <span>{claim.diagnosis}</span>
                  </div>

                  <div className="detail-row">
                    <span>📎 Medical Documents:</span>
                    <strong>{proofFiles.length} file(s) uploaded</strong>
                  </div>

                  {/* NEW: Combined AI Score Display */}
                  <div className="ai-analysis-section">
                    <div className="detail-row">
                      <span>🤖 Combined Fraud Score:</span>
                      <strong className={fraudScore > 50 ? 'fraud-high' : fraudScore > 35 ? 'fraud-medium' : 'fraud-low'}>
                        {(fraudScore || 0).toFixed(2)}%
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>⚠️ Risk Level:</span>
                      <span className={`risk-badge ${getRiskLevelBadge(riskLevel)}`}>
                        {riskLevel}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span>🧠 AI Decision:</span>
                      <span className={`ai-badge ${
                        aiDecision === 'APPROVED' ? 'success' : 
                        aiDecision === 'FLAGGED' ? 'warning' : 
                        'info'
                      }`}>
                        {aiDecision === 'APPROVED' && '✅ '}
                        {aiDecision === 'FLAGGED' && '🚩 '}
                        {aiDecision}
                      </span>
                    </div>
                  </div>

                  {/* NEW: ML Model Prediction Section */}
                  {mlAvailable && mlFraudType !== 'HIDDEN' && (
                    <div className="ml-section">
                      <div className="section-header">
                        <strong>🎯 ML Model Prediction</strong>
                      </div>
                      
                      <div className="detail-row">
                        <span>Fraud Type:</span>
                        <span className={`fraud-type-badge ${getFraudTypeBadgeClass(mlFraudType)}`}>
                          {getFraudTypeDisplay(mlFraudType)}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span>ML Confidence:</span>
                        <strong>{mlConfidence}%</strong>
                      </div>

                      {mlModelAccuracy > 0 && (
                        <div className="detail-row">
                          <span>Model Accuracy:</span>
                          <strong>{mlModelAccuracy}%</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* NEW: Gemini AI Section */}
                  {geminiScore > 0 && (
                    <div className="gemini-section">
                      <div className="detail-row">
                        <span>🧠 Gemini AI Score:</span>
                        <strong className={geminiScore > 50 ? 'fraud-high' : 'fraud-low'}>
                          {geminiScore}%
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="detail-row">
                    <span>Submitted:</span>
                    <span>{new Date(claim.submittedAt).toLocaleString()}</span>
                  </div>
                </div>

                {geminiAnalysis && (
                  <div className="gemini-preview">
                    <strong>🤖 Gemini AI Analysis Preview:</strong>
                    <p>{geminiAnalysis.substring(0, 200)}...</p>
                  </div>
                )}

                {/* NEW: Enhanced Fraud Alert */}
                {(isFraudulent || aiDecision === 'FLAGGED' || fraudScore > 50) && claim.status === 'PENDING' && (
                  <div className="fraud-alert">
                    🚩 <strong>FRAUD ALERT:</strong> This claim has been flagged by the AI system.
                    {mlFraudType !== 'UNKNOWN' && mlFraudType !== 'HIDDEN' && mlFraudType !== 'LEGITIMATE' && (
                      <span> Predicted fraud type: <strong>{getFraudTypeDisplay(mlFraudType)}</strong>.</span>
                    )}
                    <br />
                    Combined Fraud Score: <strong>{(fraudScore || 0).toFixed(2)}%</strong> | Risk Level: <strong>{riskLevel}</strong>
                    <br />
                    ⚠️ Please review medical documents and AI analysis carefully before approval.
                  </div>
                )}

                <button 
                  className="view-details-btn"
                  onClick={() => viewClaimDetails(claim)}
                >
                  📋 View Full Analysis & Documents
                </button>

                {claim.status === 'PENDING' && (
                  <div className="claim-actions">
                    <button 
                      className="approve-btn"
                      onClick={() => handleApprove(claim.id)}
                      disabled={processing === claim.id}
                    >
                      {processing === claim.id ? '🔄 Processing...' : '✅ Approve (Gas Fee)'}
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleReject(claim.id)}
                      disabled={processing === claim.id}
                    >
                      {processing === claim.id ? '🔄 Processing...' : '❌ Reject (Gas Fee)'}
                    </button>
                  </div>
                )}

                {claim.status !== 'PENDING' && (
                  <div className="blockchain-info">
                    <p className="blockchain-note">
                      🔒 This decision is permanently recorded on the blockchain
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FOR DETAILED VIEW */}
      {selectedClaim && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            
            <h3>Claim Details - #{selectedClaim.claimNumber}</h3>
            
            <div className="modal-section">
              <h4>Patient Information</h4>
              <p><strong>Name:</strong> {selectedClaim.patientName}</p>
              <p><strong>Hospital:</strong> {selectedClaim.hospitalName}</p>
              <p><strong>Policy:</strong> {selectedClaim.policyNumber}</p>
            </div>

            <div className="modal-section">
              <h4>Claim Information</h4>
              <p><strong>Type:</strong> {selectedClaim.claimType}</p>
              <p><strong>Amount:</strong> ₹{formatAmount(selectedClaim.amount)}</p>
              <p><strong>Diagnosis:</strong> {selectedClaim.diagnosis}</p>
              <p><strong>Description:</strong></p>
              <p className="description-text">{selectedClaim.description || 'No description provided'}</p>
            </div>

            {/* NEW: Dual AI System Analysis Display */}
            <div className="modal-section dual-ai-section">
              <h4>🤖 Dual AI Fraud Detection Analysis</h4>
              
              <div className="ai-scores-grid">
                <div className="score-card">
                  <div className="score-label">Combined Fraud Score</div>
                  <div className={`score-value ${
                    (selectedClaim.fraudScore || 0) > 50 ? 'high' : 
                    (selectedClaim.fraudScore || 0) > 35 ? 'medium' : 
                    'low'
                  }`}>
                    {(selectedClaim.fraudScore || 0).toFixed(2)}%
                  </div>
                  <div className="score-detail">
                    Risk Level: <strong>{selectedClaim.riskLevel || 'UNKNOWN'}</strong>
                  </div>
                </div>

                {selectedClaim.geminiScore > 0 && (
                  <div className="score-card gemini-card">
                    <div className="score-label">🧠 Gemini AI (60% weight) ⭐ PRIMARY</div>
                    <div className="score-value">
                      {selectedClaim.geminiScore}%
                    </div>
                    <div className="score-detail">
                      Reads PDFs & Images
                    </div>
                    <div className="score-detail">
                      Medical Document Analysis
                    </div>
                  </div>
                )}

                {selectedClaim.mlAvailable && (
                  <div className="score-card ml-card">
                    <div className="score-label">🎯 ML Model (40% weight)</div>
                    <div className="score-value">
                      {((selectedClaim.fraudScore || 0) * 0.6 / 0.6).toFixed(2)}%
                    </div>
                    <div className="score-detail">
                      Type: <strong>{getFraudTypeDisplay(selectedClaim.mlFraudType)}</strong>
                    </div>
                    <div className="score-detail">
                      Confidence: <strong>{selectedClaim.mlConfidence}%</strong>
                    </div>
                    <div className="score-detail">
                      ⚠️ Cannot read documents
                    </div>
                  </div>
                )}
              </div>

              <div className="ai-explanation">
                <p>
                  <strong>How the score is calculated:</strong> The system prioritizes Gemini AI (60% weight) 
                  because it can read PDFs and analyze medical documents. The ML model (40% weight) provides 
                  supporting fraud type classification based on numerical patterns. Together they provide 
                  comprehensive fraud detection with document verification.
                </p>
              </div>
            </div>

            {/* ML MODEL DETAILED ANALYSIS */}
            {selectedClaim.mlAvailable && selectedClaim.mlFraudType !== 'HIDDEN' && (
              <div className="modal-section">
                <h4>🎯 Machine Learning Fraud Classification</h4>
                <div className="ml-prediction-box">
                  <div className="ml-stat">
                    <span>Predicted Fraud Type:</span>
                    <span className={`fraud-type-badge ${getFraudTypeBadgeClass(selectedClaim.mlFraudType)}`}>
                      {getFraudTypeDisplay(selectedClaim.mlFraudType)}
                    </span>
                  </div>
                  
                  <div className="ml-stat">
                    <span>Model Confidence:</span>
                    <strong>{selectedClaim.mlConfidence}%</strong>
                  </div>

                  {selectedClaim.mlModelAccuracy > 0 && (
                    <div className="ml-stat">
                      <span>Model Accuracy:</span>
                      <strong>{selectedClaim.mlModelAccuracy}%</strong>
                    </div>
                  )}
                  
                  {selectedClaim.mlFraudType !== 'LEGITIMATE' && selectedClaim.mlFraudType !== 'LOW_RISK' && selectedClaim.mlFraudType !== 'UNKNOWN' && (
                    <div className="ml-warning">
                      ⚠️ <strong>ML Model Alert:</strong> This claim has been classified as 
                      potential {getFraudTypeDisplay(selectedClaim.mlFraudType).toLowerCase()}. 
                      Please review carefully before approval.
                    </div>
                  )}
                  
                  <p className="ml-note">
                    💡 The ML model uses Random Forest algorithm trained on historical insurance 
                    claims to classify fraud types based on patient demographics, diagnosis, treatment, and billing patterns.
                  </p>
                </div>
              </div>
            )}

            {/* GEMINI AI COMPLETE ANALYSIS */}
            {selectedClaim.geminiAnalysis && (
              <div className="modal-section">
                <h4>🧠 Gemini AI Complete Medical Document Analysis</h4>
                <pre className="gemini-full-analysis">{selectedClaim.geminiAnalysis}</pre>
              </div>
            )}

            {/* MEDICAL DOCUMENTS */}
            <div className="modal-section">
              <h4>📎 Uploaded Medical Documents ({(selectedClaim.proofFiles || []).length})</h4>
              {(selectedClaim.proofFiles || []).length > 0 ? (
                <div className="files-list">
                  {selectedClaim.proofFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-icon">📄</span>
                      <div className="file-info">
                        <strong>{file.filename}</strong>
                        <small>{(file.size / 1024).toFixed(2)} KB • {file.mimetype}</small>
                      </div>
                      <button 
                        className="download-btn"
                        onClick={() => downloadFile(file)}
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-files">⚠️ No documents uploaded with this claim (High fraud risk)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY BOX */}
      <div className="summary-box">
        <h4>📊 Claims Summary (Your Policies Only)</h4>
        <div className="summary-stats">
          <div>
            <strong>{claims.length}</strong>
            <span>Total Claims</span>
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'APPROVED').length}</strong>
            <span>Approved</span>
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'PENDING').length}</strong>
            <span>Pending Review</span>
          </div>
          <div>
            <strong>{claims.filter(c => c.status === 'REJECTED').length}</strong>
            <span>Rejected</span>
          </div>
          <div>
            <strong>{countFlaggedClaims()}</strong>
            <span>Flagged by AI</span>
          </div>
          <div>
            <strong>₹{formatAmount(claims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + (typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount), 0))}</strong>
            <span>Total Approved</span>
          </div>
        </div>
      </div>

      {/* INFO BOXES */}
      <div className="info-box">
        <h4>🔗 Blockchain Data Privacy</h4>
        <ul>
          <li>✅ You only see claims for policies YOU issued</li>
          <li>✅ Claims are automatically filtered by blockchain verification</li>
          <li>✅ No other insurance company can see your claims</li>
          <li>✅ All approvals/rejections are permanently recorded on blockchain</li>
          <li>✅ ML fraud predictions stored immutably on blockchain</li>
        </ul>
      </div>

      <div className="info-box">
        <h4>🤖 Dual AI Fraud Detection System</h4>
        <ul>
          <li>🧠 <strong>Gemini AI (60% weight) - PRIMARY:</strong> Reads PDFs & images, analyzes medical documents and claim details</li>
          <li>🎯 <strong>ML Model (40% weight) - SUPPORTING:</strong> Predicts fraud types using numerical features only</li>
          <li>📊 <strong>Combined Score:</strong> Gemini 60% + ML 40% for comprehensive detection</li>
          <li>📄 <strong>PDF Support:</strong> Gemini can read and verify PDF medical bills, prescriptions, reports</li>
          <li>⚠️ <strong>Risk Levels:</strong> LOW (&lt;35%), MEDIUM (35-65%), HIGH (&gt;65%)</li>
          <li>🔒 <strong>Blockchain Storage:</strong> All predictions permanently recorded and immutable</li>
        </ul>
      </div>
    </div>
  );
}

export default ClaimsManagement;