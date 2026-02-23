export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const GANACHE_URL = process.env.REACT_APP_GANACHE_URL || 'http://127.0.0.1:7549';

export const CLAIM_TYPES = [
  'Medical',
  'Accident',
  'Life',
  'Property',
  'Vehicle',
  'Health'
];

export const CLAIM_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  UNDER_REVIEW: 'UNDER_REVIEW'
};

export const RISK_LEVELS = {
  LOW: { color: '#10b981', label: 'Low Risk' },
  MEDIUM: { color: '#f59e0b', label: 'Medium Risk' },
  HIGH: { color: '#ef4444', label: 'High Risk' }
};