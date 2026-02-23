import React, { useState, useEffect } from 'react';
import { getAllIdentities, searchPolicies } from '../../services/api';
import { submitClaimToBlockchain } from '../../services/blockchain';
import axios from 'axios';

function HospitalClaimSubmission() {
  const [formData, setFormData] = useState({
    did: '',
    policyNumber: '',
    claimType: 'Medical',
    amount: '',
    diagnosis: '',
    description: ''
  });
  const [proofFiles, setProofFiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [submittedClaim, setSubmittedClaim] = useState(null);
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
      console.error('Error:', error);
    }
  };

  const handleIdentitySelect = async (did) => {
    setFormData(prev => ({ ...prev, did, policyNumber: '' }));
    const identity = identities.find(i => i.did === did);
    setSelectedIdentity(identity);
    setPolicies([]);
    setSelectedPolicy(null);
    
    if (did) {
      try {
        const response = await searchPolicies({ did });
        setPolicies(response.data);
      } catch (error) {
        console.error('Error fetching policies:', error);
      }
    }
  };

  const handlePolicySelect = (policyNumber) => {
    setFormData(prev => ({ ...prev, policyNumber }));
    const policy = policies.find(p => p.policyNumber === policyNumber);
    setSelectedPolicy(policy);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    setProofFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTxHash('');
    setSubmittedClaim(null);

    try {
      // Step 1: Backend prepares claim with AI analysis
      setMessage('⏳ Processing claim with Gemini AI verification...');
      
      const formDataToSend = new FormData();
      formDataToSend.append('did', formData.did);
      formDataToSend.append('policyNumber', formData.policyNumber);
      formDataToSend.append('policyId', selectedPolicy.id);
      formDataToSend.append('patientName', selectedIdentity.name);
      formDataToSend.append('claimType', formData.claimType);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('diagnosis', formData.diagnosis);
      formDataToSend.append('description', formData.description);
      
      proofFiles.forEach((file) => {
        formDataToSend.append('proofFiles', file);
      });

      const prepareResponse = await axios.post(
        'http://localhost:5000/api/claims/prepare',
        formDataToSend,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const claimData = prepareResponse.data;
      console.log('✅ Claim prepared with AI analysis:', claimData);
      
      setMessage(`✅ Claim prepared with ${proofFiles.length} document(s)\n🦊 Confirm in MetaMask to submit to blockchain...`);

      // Step 2: Submit to blockchain via MetaMask
      const txResult = await submitClaimToBlockchain(claimData);

      if (txResult.success) {
        setTxHash(txResult.tx.transactionHash);
        
        const gasUsed = Number(txResult.tx.gasUsed);
        const effectiveGasPrice = txResult.tx.effectiveGasPrice 
          ? Number(txResult.tx.effectiveGasPrice) 
          : 20000000000;
        
        const gasCost = (gasUsed * effectiveGasPrice) / 1e18;

        setSubmittedClaim({
          ...claimData,
          transactionHash: txResult.tx.transactionHash,
          gasUsed,
          gasCost
        });

        setMessage(`✅ Claim submitted to blockchain successfully!\n` +
                   `Transaction: ${txResult.tx.transactionHash.substring(0, 10)}...\n` +
                   `Gas Used: ${gasUsed}\n` +
                   `Cost: ${gasCost.toFixed(6)} ETH`);

        // Reset form
        setFormData(prev => ({
          ...prev,
          policyNumber: '',
          amount: '',
          diagnosis: '',
          description: ''
        }));
        setProofFiles([]);
        setSelectedPolicy(null);
        
        const fileInput = document.getElementById('proofFiles');
        if (fileInput) fileInput.value = '';
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
    <div className="hospital-claim-submission">
      <h2>Submit Insurance Claim</h2>
      <p className="subtitle">File claims with medical documentation - AI will verify automatically</p>

      <form onSubmit={handleSubmit} className="claim-form">
        {/* Step 1: Select Patient */}
        <div className="form-section">
          <h3>Step 1: Select Patient</h3>
          <div className="form-group">
            <label>Patient Identity (DID) *</label>
            <select
              value={formData.did}
              onChange={(e) => handleIdentitySelect(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">-- Select Patient --</option>
              {identities.map((identity) => (
                <option key={identity.did} value={identity.did}>
                  {identity.name} - {identity.email}
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
        </div>

        {/* Step 2: Select Policy */}
        {formData.did && (
          <div className="form-section">
            <h3>Step 2: Select Policy</h3>
            {policies.length === 0 ? (
              <p className="warning">No active policies found for this patient.</p>
            ) : (
              <>
                <div className="form-group">
                  <label>Policy Number *</label>
                  <select
                    value={formData.policyNumber}
                    onChange={(e) => handlePolicySelect(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">-- Select Policy --</option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.policyNumber}>
                        {policy.policyNumber} - {policy.policyType} (₹{parseInt(policy.coverageAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPolicy && (
                  <div className="selected-policy-info">
                    <p><strong>Policy:</strong> {selectedPolicy.policyNumber}</p>
                    <p><strong>Type:</strong> {selectedPolicy.policyType}</p>
                    <p><strong>Coverage:</strong> ₹{parseInt(selectedPolicy.coverageAmount).toLocaleString()}</p>
                    <p><strong>Company:</strong> {selectedPolicy.insuranceCompany}</p>
                    <p><strong>Status:</strong> <span className="status-badge success">{selectedPolicy.status}</span></p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Claim Details */}
        {formData.policyNumber && (
          <div className="form-section">
            <h3>Step 3: Claim Details</h3>
            
            <div className="form-group">
              <label>Claim Type *</label>
              <select
                name="claimType"
                value={formData.claimType}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="Medical">Medical Treatment</option>
                <option value="Accident">Accident</option>
                <option value="Emergency">Emergency</option>
                <option value="Surgery">Surgery</option>
                <option value="Hospitalization">Hospitalization</option>
              </select>
            </div>

            <div className="form-group">
              <label>Claim Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                disabled={loading}
                min="1"
                max={selectedPolicy ? selectedPolicy.coverageAmount : undefined}
                placeholder="Enter claim amount"
              />
              {selectedPolicy && (
                <small className="form-help">
                  Maximum coverage: ₹{parseInt(selectedPolicy.coverageAmount).toLocaleString()}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Diagnosis *</label>
              <input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="e.g., Acute Appendicitis, Fracture, Diabetes Treatment"
              />
            </div>

            <div className="form-group">
              <label>Detailed Medical Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                disabled={loading}
                rows="6"
                placeholder="Provide comprehensive medical details including:
- Chief complaints and symptoms
- Medical procedures performed
- Medications prescribed
- Treatment dates and duration
- Any complications or follow-ups
- Test results if applicable"
              />
              <small className="form-help">
                💡 Detailed descriptions help AI verify claims faster
              </small>
            </div>

            <div className="form-group">
              <label>Upload Medical Documents * 📎</label>
              <input
                type="file"
                id="proofFiles"
                onChange={handleFileChange}
                disabled={loading}
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <small className="form-help">
                📄 <strong>Required:</strong> Upload medical bills, prescriptions, discharge summary, test reports
                <br />
                ✅ Proper documentation ensures faster claim approval (Max 5 files)
              </small>
              {proofFiles.length > 0 && (
                <div className="files-selected">
                  <strong>✅ Selected Files ({proofFiles.length}):</strong>
                  <ul>
                    {proofFiles.map((file, index) => (
                      <li key={index}>
                        📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '🔄 Processing & Submitting to Blockchain...' : '📝 Submit Claim to Blockchain (Gas Fee)'}
            </button>
          </div>
        )}
      </form>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('⏳') || message.includes('🦊') ? 'info' : 'error'}`}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{message}</pre>
        </div>
      )}

      {txHash && (
        <div className="tx-info">
          <p><strong>Transaction Hash:</strong></p>
          <code className="tx-hash">{txHash}</code>
        </div>
      )}

      {submittedClaim && (
        <div className="result-box">
          <h4>✅ Claim Submitted to Blockchain Successfully!</h4>
          <div className="result-details">
            <div className="result-row">
              <span>Claim Number:</span>
              <strong>{submittedClaim.claimNumber}</strong>
            </div>
            <div className="result-row">
              <span>Patient:</span>
              <strong>{submittedClaim.patientName}</strong>
            </div>
            <div className="result-row">
              <span>Policy:</span>
              <strong>{submittedClaim.policyNumber}</strong>
            </div>
            <div className="result-row">
              <span>Claim Type:</span>
              <strong>{submittedClaim.claimType}</strong>
            </div>
            <div className="result-row">
              <span>Amount:</span>
              <strong>₹{parseInt(submittedClaim.amount).toLocaleString()}</strong>
            </div>
            <div className="result-row">
              <span>Documents:</span>
              <strong>{submittedClaim.proofFilesCount || 0} files uploaded</strong>
            </div>
            <div className="result-row">
              <span>Status:</span>
              <span className="status-badge pending">⏳ PENDING Insurance Review</span>
            </div>
            <div className="result-row">
              <span>Transaction:</span>
              <code className="tx-hash-small">{submittedClaim.transactionHash.substring(0, 20)}...</code>
            </div>
            <div className="result-row">
              <span>Gas Used:</span>
              <span>{submittedClaim.gasUsed}</span>
            </div>
            <div className="result-row">
              <span>Gas Cost:</span>
              <span>{submittedClaim.gasCost.toFixed(6)} ETH</span>
            </div>
          </div>
          <p className="result-note">
            ✅ Claim submitted with YOUR wallet address as submitter. Insurance company can now review it.
          </p>
        </div>
      )}

      <div className="info-box">
        <h4>📋 Claim Submission Process</h4>
        <ol>
          <li>Select patient with verified SSI identity</li>
          <li>Choose their active insurance policy</li>
          <li>Fill comprehensive medical details</li>
          <li>Upload medical documents (bills, reports, prescriptions)</li>
          <li>Submit to blockchain with MetaMask (~0.005 ETH gas)</li>
          <li>Gemini AI analyzes claim + documents automatically</li>
          <li>Insurance company reviews with AI insights</li>
          <li>Decision recorded permanently on blockchain</li>
          <li>YOUR wallet address is recorded as submitter</li>
        </ol>
      </div>

      <div className="info-box">
        <h4>📎 Required Medical Documentation</h4>
        <ul>
          <li>✅ <strong>Medical Bills:</strong> Itemized bills from hospital/pharmacy</li>
          <li>✅ <strong>Discharge Summary:</strong> Complete discharge report</li>
          <li>✅ <strong>Prescriptions:</strong> Doctor's prescriptions for medications</li>
          <li>✅ <strong>Test Reports:</strong> Lab reports, X-rays, CT scans, MRI</li>
          <li>✅ <strong>Doctor's Certificate:</strong> Medical certificate explaining treatment</li>
        </ul>
        <p className="note">
          <strong>Note:</strong> Claims without proper documentation may be flagged by AI for additional review or rejected.
        </p>
      </div>

      <div className="info-box">
        <h4>🔗 Blockchain Privacy & Ownership</h4>
        <ul>
          <li>✅ Your wallet address is recorded as the submitter</li>
          <li>✅ Only the policy's insurance company can approve/reject</li>
          <li>✅ Patient can view the claim via their DID</li>
          <li>✅ All data immutably stored on blockchain</li>
          <li>✅ No other hospitals can see your submissions</li>
        </ul>
      </div>
    </div>
  );
}

export default HospitalClaimSubmission;