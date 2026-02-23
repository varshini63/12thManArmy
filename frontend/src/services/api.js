import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // Important for session cookies
});

// ==================== AUTH ENDPOINTS ====================

// Check if user exists on blockchain
export const checkUser = (address) => api.post('/auth/check-user', { address });

// Login with wallet address
export const login = (credentials) => api.post('/auth/login', credentials);

// Logout
export const logout = () => api.post('/auth/logout');

// Check current session
export const checkSession = () => api.get('/auth/session');

// ==================== SSI ENDPOINTS ====================

// Prepare identity data (frontend will create on blockchain)
export const createIdentity = (identityData) => api.post('/ssi/create-identity', identityData);

// Get current user's identity from blockchain
export const getMyIdentity = () => api.get('/ssi/my-identity');

// Verify identity on blockchain
export const verifyIdentity = (did) => api.post('/ssi/verify-identity', { did });

// Get all identities from blockchain
export const getAllIdentities = () => api.get('/ssi/identities');

// ==================== POLICY ENDPOINTS ====================

// Prepare policy data (frontend will create on blockchain)
export const preparePolicy = (policyData) => api.post('/policies/prepare', policyData);

// Get policies from blockchain
export const getPolicies = () => api.get('/policies');

// Search policies by DID or policy number
export const searchPolicies = (params) => api.get('/policies/search', { params });

// ==================== CLAIMS ENDPOINTS ====================

// Prepare claim with AI analysis (frontend will submit to blockchain)
export const prepareClaim = (claimData) => api.post('/claims/prepare', claimData);

// Get claims from blockchain
export const getClaims = () => api.get('/claims');

// Get specific claim
export const getClaim = (claimId) => api.get(`/claims/${claimId}`);

// Note: Approve and Reject are now handled directly by blockchain
// via approveClaimOnChain() and rejectClaimOnChain() from blockchain.js

// ==================== FEDERATED LEARNING ====================

// Prepare FL training (frontend will record on blockchain)
export const prepareFLTrain = () => api.post('/federated-learning/prepare-train');

// Get FL status
export const getFLStatus = () => api.get('/federated-learning/status');

// ==================== BLOCKCHAIN ====================

// Get blockchain status
export const getBlockchainStatus = () => api.get('/blockchain/status');

// Get blockchain chain (admin only)
export const getBlockchainChain = () => api.get('/blockchain/chain');

// Get contract info (address and ABI)
export const getContractInfo = () => api.get('/contract/info');

// ==================== ANALYTICS ====================

// Get analytics from blockchain
export const getAnalytics = () => api.get('/analytics');

// ==================== HEALTH CHECK ====================

export const checkHealth = () => api.get('/health');

// ==================== ERROR HANDLING ====================

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;