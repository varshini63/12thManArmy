import hashlib
import json
from datetime import datetime
import secrets

class SSISystem:
    """Self-Sovereign Identity system for decentralized identity management"""
    
    def __init__(self):
        self.issuer_did = "did:insure:issuer:abc123"
        self.credential_type = "InsuranceIdentityCredential"
    
    def generate_did(self, identifier):
        """Generate a decentralized identifier (DID)"""
        # Create unique DID based on user info
        did_hash = hashlib.sha256(identifier.encode()).hexdigest()[:16]
        return f"did:insure:user:{did_hash}"
    
    def create_identity(self, name, email, id_number, date_of_birth):
        """Create a new SSI identity with verifiable credentials"""
        
        # Generate DID
        unique_id = f"{email}{id_number}{datetime.now().timestamp()}"
        did = self.generate_did(unique_id)
        
        # Create verifiable credential
        credential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            'type': ['VerifiableCredential', self.credential_type],
            'issuer': self.issuer_did,
            'issuanceDate': datetime.now().isoformat(),
            'credentialSubject': {
                'id': did,
                'name': name,
                'email': email,
                'idNumber': id_number,
                'dateOfBirth': date_of_birth
            }
        }
        
        # Generate cryptographic proof
        proof = self._generate_proof(credential)
        credential['proof'] = proof
        
        # Create public/private key pair (simulated)
        key_pair = self._generate_key_pair()
        
        identity = {
            'did': did,
            'name': name,
            'email': email,
            'verifiable_credential': credential,
            'public_key': key_pair['public_key'],
            'status': 'ACTIVE',
            'created_at': datetime.now().isoformat(),
            'timestamp': datetime.now().isoformat()
        }
        
        return identity
    
    def verify_credential(self, credential):
        """Verify a verifiable credential"""
        try:
            # Check if credential has required fields
            required_fields = ['@context', 'type', 'issuer', 'credentialSubject', 'proof']
            if not all(field in credential for field in required_fields):
                return {
                    'valid': False,
                    'error': 'Missing required fields'
                }
            
            # Verify issuer
            if credential['issuer'] != self.issuer_did:
                return {
                    'valid': False,
                    'error': 'Invalid issuer'
                }
            
            # Verify proof
            proof_valid = self._verify_proof(credential, credential['proof'])
            
            if not proof_valid:
                return {
                    'valid': False,
                    'error': 'Invalid cryptographic proof'
                }
            
            return {
                'valid': True,
                'did': credential['credentialSubject']['id'],
                'verified_at': datetime.now().isoformat(),
                'issuer': credential['issuer']
            }
        
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _generate_proof(self, credential):
        """Generate cryptographic proof for credential"""
        # Create a hash of the credential as proof
        credential_string = json.dumps(credential.get('credentialSubject', {}), sort_keys=True)
        signature = hashlib.sha256(credential_string.encode()).hexdigest()
        
        return {
            'type': 'Ed25519Signature2020',
            'created': datetime.now().isoformat(),
            'proofPurpose': 'assertionMethod',
            'verificationMethod': f"{self.issuer_did}#keys-1",
            'proofValue': signature
        }
    
    def _verify_proof(self, credential, proof):
        """Verify the cryptographic proof"""
        # Recreate the signature
        credential_string = json.dumps(credential.get('credentialSubject', {}), sort_keys=True)
        expected_signature = hashlib.sha256(credential_string.encode()).hexdigest()
        
        # Compare with provided proof
        return proof.get('proofValue') == expected_signature
    
    def _generate_key_pair(self):
        """Generate a simulated public/private key pair"""
        private_key = secrets.token_hex(32)
        public_key = hashlib.sha256(private_key.encode()).hexdigest()
        
        return {
            'public_key': public_key,
            'private_key': private_key  # In real system, this would be stored securely by user
        }
    
    def revoke_credential(self, did):
        """Revoke a credential (for demonstration)"""
        return {
            'did': did,
            'revoked': True,
            'revoked_at': datetime.now().isoformat(),
            'reason': 'User requested revocation'
        }