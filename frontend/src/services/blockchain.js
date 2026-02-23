import Web3 from 'web3';
import axios from 'axios';

let web3;
let contract;
let currentAccount;
let isInitialized = false;

// Initialize Web3 and Contract together
const ensureInitialized = async () => {
  if (isInitialized && web3 && contract) {
    return { success: true };
  }

  try {
    // Step 1: Initialize Web3
    const web3Result = await initWeb3();
    if (!web3Result.success) {
      return web3Result;
    }

    // Step 2: Load Contract
    const contractResult = await loadContract();
    if (!contractResult.success) {
      return contractResult;
    }

    isInitialized = true;
    console.log('✅ Blockchain fully initialized');
    return { success: true };
  } catch (error) {
    console.error('Error ensuring initialization:', error);
    return { success: false, error: error.message };
  }
};

export const initWeb3 = async () => {
  try {
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      currentAccount = accounts[0];
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        currentAccount = accounts[0];
        window.location.reload(); // Reload on account change
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      console.log('✅ MetaMask connected:', currentAccount);
      return { success: true, account: currentAccount };
    } else {
      console.error('❌ MetaMask not installed');
      return { success: false, error: 'Please install MetaMask' };
    }
  } catch (error) {
    console.error('Error initializing Web3:', error);
    return { success: false, error: error.message };
  }
};

export const loadContract = async () => {
  try {
    if (!web3) {
      throw new Error('Web3 not initialized. Call initWeb3() first.');
    }

    // Get contract info from backend
    const response = await axios.get('http://localhost:5000/api/contract/info');
    const { address, abi } = response.data;
    
    contract = new web3.eth.Contract(abi, address);
    console.log('✅ Contract loaded:', address);
    return { success: true, contract };
  } catch (error) {
    console.error('Error loading contract:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentAccount = async () => {
  if (!web3) await initWeb3();
  if (!currentAccount) {
    const accounts = await web3.eth.getAccounts();
    currentAccount = accounts[0];
  }
  return currentAccount;
};

export const getAccounts = async () => {
  if (!web3) await initWeb3();
  return await web3.eth.getAccounts();
};

// ==================== USER REGISTRATION ====================

export const registerUser = async (username, role, name) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    const tx = await contract.methods
      .registerUser(username, role, name)
      .send({ from: account });
    
    console.log('✅ User registered:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
};

export const checkUserExists = async (address) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return false;
    }

    const user = await contract.methods.users(address).call();
    return user[4]; // exists field (isRegistered)
  } catch (error) {
    console.error('Error checking user exists:', error);
    return false;
  }
};

/**
 * Get user information from blockchain
 * @param {string} address - Wallet address
 * @returns {Object} User information from blockchain
 */
export const getUserInfo = async (address) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      console.error('Failed to initialize blockchain');
      return null;
    }

    // Call the smart contract's users mapping
    const user = await contract.methods.users(address).call();
    
    console.log('User info from blockchain:', user);
    
    // User struct format: [username, role, name, walletAddress, isRegistered]
    return {
      username: user[0] || user.username,
      role: user[1] || user.role,
      name: user[2] || user.name,
      address: user[3] || user.walletAddress || address,
      isRegistered: user[4] || user.isRegistered,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// ==================== SSI IDENTITY ====================

export const createIdentityOnChain = async (did, name, email, idNumber, dateOfBirth) => {
  try {
    // Ensure Web3 and contract are initialized
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    const tx = await contract.methods
      .createIdentity(did, name, email, idNumber, dateOfBirth)
      .send({ from: account });
    
    console.log('✅ Identity created on blockchain:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error creating identity:', error);
    return { success: false, error: error.message };
  }
};

// ==================== POLICIES ====================

export const createPolicyOnChain = async (policyData) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    // FIXED: Convert amounts properly - remove commas and ensure integers
    let coverageAmount = policyData.coverageAmount.toString().replace(/,/g, '').trim();
    let premium = policyData.premium.toString().replace(/,/g, '').trim();
    
    coverageAmount = Math.floor(Number(coverageAmount));
    premium = Math.floor(Number(premium));
    
    console.log('💰 Creating policy with amounts:', { coverageAmount, premium });
    
    const tx = await contract.methods
      .createPolicy(
        policyData.policyNumber,
        policyData.did,
        policyData.patientName,
        policyData.policyType,
        coverageAmount.toString(),  // Send as string integer
        premium.toString(),          // Send as string integer
        parseInt(policyData.durationMonths),
        policyData.insuranceCompany
      )
      .send({ from: account });
    
    console.log('✅ Policy created on blockchain:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error creating policy:', error);
    return { success: false, error: error.message };
  }
};

export const getPolicyById = async (policyId) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return null;
    }

    const policy = await contract.methods.getPolicy(policyId).call();
    return {
      policyNumber: policy[0],
      did: policy[1],
      patientName: policy[2],
      policyType: policy[3],
      coverageAmount: policy[4].toString(),
      premium: policy[5].toString(),
      status: policy[6]
    };
  } catch (error) {
    console.error('Error getting policy:', error);
    return null;
  }
};

export const getPolicyByNumber = async (policyNumber) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return null;
    }

    const policyId = await contract.methods.getPolicyByNumber(policyNumber).call();
    return await getPolicyById(policyId);
  } catch (error) {
    console.error('Error getting policy by number:', error);
    return null;
  }
};

// ==================== CLAIMS ====================

export const submitClaimToBlockchain = async (claimData) => {
  try {
    // Ensure initialization first
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();

    console.log('📝 Submitting claim to blockchain with fraud type...');
    console.log('Claim data:', {
      ...claimData,
      mlFraudType: claimData.mlFraudType,
      mlConfidence: claimData.mlConfidence
    });

    // Call smart contract submitClaim with NEW parameters
    const tx = await contract.methods.submitClaim(
      claimData.claimNumber,
      parseInt(claimData.policyId),
      claimData.policyNumber,
      claimData.did,
      claimData.patientName,
      claimData.claimType,
      parseInt(claimData.amount),
      claimData.description,
      claimData.hospitalName,
      claimData.diagnosis,
      claimData.fraudScore,
      claimData.isFraudulent,
      claimData.aiDecision,
      claimData.mlFraudType || 'UNKNOWN',        // NEW: ML fraud type
      claimData.mlConfidence || 0                 // NEW: ML confidence
    ).send({ from: account });

    console.log('✅ Claim submitted to blockchain:', tx.transactionHash);
    console.log(`   ML Fraud Type: ${claimData.mlFraudType}`);
    console.log(`   ML Confidence: ${claimData.mlConfidence}%`);

    return { success: true, tx };
  } catch (error) {
    console.error('❌ Blockchain submission error:', error);
    return { success: false, error: error.message };
  }
};
export const approveClaimOnChain = async (claimId) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    const tx = await contract.methods
      .approveClaim(claimId)
      .send({ from: account });
    
    console.log('✅ Claim approved on blockchain:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error approving claim:', error);
    return { success: false, error: error.message };
  }
};

export const rejectClaimOnChain = async (claimId) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    const tx = await contract.methods
      .rejectClaim(claimId)
      .send({ from: account });
    
    console.log('✅ Claim rejected on blockchain:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error rejecting claim:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FEDERATED LEARNING ====================

export const recordTrainingRoundOnChain = async (roundData) => {
  try {
    const initResult = await ensureInitialized();
    if (!initResult.success) {
      return initResult;
    }

    const account = await getCurrentAccount();
    
    const tx = await contract.methods
      .recordTrainingRound(
        parseInt(roundData.globalAccuracy),
        parseInt(roundData.nodesParticipated),
        parseInt(roundData.totalSamples)
      )
      .send({ from: account });
    
    console.log('✅ Training round recorded on blockchain:', tx.transactionHash);
    return { success: true, tx };
  } catch (error) {
    console.error('Error recording training:', error);
    return { success: false, error: error.message };
  }
};

// ==================== HELPER FUNCTIONS ====================

export const getBalance = async (address) => {
  if (!web3) await initWeb3();
  const balance = await web3.eth.getBalance(address);
  return web3.utils.fromWei(balance, 'ether');
};

export const getWeb3Instance = () => web3;
export const getContractInstance = () => contract;

// Export the initialization function
export { ensureInitialized };

export default {
  initWeb3,
  loadContract,
  ensureInitialized,
  getCurrentAccount,
  getAccounts,
  registerUser,
  checkUserExists,
  getUserInfo,
  createIdentityOnChain,
  createPolicyOnChain,
  getPolicyById,
  getPolicyByNumber,
  submitClaimToBlockchain,
  approveClaimOnChain,
  rejectClaimOnChain,
  recordTrainingRoundOnChain,
  getBalance
}