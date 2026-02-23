import numpy as np
from datetime import datetime
import random
import pickle
import os

class FederatedNode:
    """Simulates a federated learning node (e.g., hospital, insurer)"""
    
    def __init__(self, node_id, name):
        self.node_id = node_id
        self.name = name
        self.local_data = []
        self.local_model_accuracy = 0.0
        self.training_samples = 0
        self.processed_claims = set()  # Track which claims this node has trained on
    
    def add_training_sample(self, claim_id, features, label):
        """Add a training sample to this node"""
        if claim_id not in self.processed_claims:
            self.local_data.append({
                'claim_id': claim_id,
                'features': features,
                'label': label
            })
            self.processed_claims.add(claim_id)
            self.training_samples = len(self.local_data)
            return True
        return False
    
    def train_local_model(self):
        """Simulate local model training"""
        if self.training_samples > 0:
            # Simulate training with random accuracy improvement
            base_accuracy = 0.75
            improvement = min(0.2, self.training_samples * 0.01)
            noise = random.uniform(-0.03, 0.03)
            self.local_model_accuracy = min(0.98, base_accuracy + improvement + noise)
        return self.local_model_accuracy

class FederatedLearningSystem:
    """Federated learning system that trains on approved/rejected blockchain claims"""
    
    def __init__(self):
        self.nodes = [
            FederatedNode(1, "Hospital Network A"),
            FederatedNode(2, "Hospital Network B"),
            FederatedNode(3, "Insurance Company X"),
            FederatedNode(4, "Insurance Company Y"),
            FederatedNode(5, "Medical Clinic Chain")
        ]
        self.global_model_accuracy = 0.75
        self.training_rounds = 0
        self.training_history = []
        self.processed_claims = set()  # Global tracker of processed claims
        self.last_trained_claim_count = 0
        
        # Load previous state if exists
        self._load_state()
    
    def _save_state(self):
        """Save FL system state"""
        try:
            state = {
                'processed_claims': self.processed_claims,
                'training_rounds': self.training_rounds,
                'global_model_accuracy': self.global_model_accuracy,
                'last_trained_claim_count': self.last_trained_claim_count
            }
            with open('fl_state.pkl', 'wb') as f:
                pickle.dump(state, f)
        except Exception as e:
            print(f"⚠️ Error saving FL state: {e}")
    
    def _load_state(self):
        """Load previous FL system state"""
        try:
            if os.path.exists('fl_state.pkl'):
                with open('fl_state.pkl', 'rb') as f:
                    state = pickle.load(f)
                    self.processed_claims = state.get('processed_claims', set())
                    self.training_rounds = state.get('training_rounds', 0)
                    self.global_model_accuracy = state.get('global_model_accuracy', 0.75)
                    self.last_trained_claim_count = state.get('last_trained_claim_count', 0)
                print(f"✅ Loaded FL state: {len(self.processed_claims)} claims processed, {self.training_rounds} rounds")
        except Exception as e:
            print(f"⚠️ Error loading FL state: {e}")
    
    def _extract_features(self, claim):
        """Extract numerical features from claim data"""
        features = []
        
        # Feature 1: Normalized claim amount (0-1 scale, assuming max 500k)
        amount = float(claim.get('amount', 0))
        features.append(min(amount / 500000, 1.0))
        
        # Feature 2: Fraud score
        fraud_score = float(claim.get('fraudScore', 0))
        features.append(fraud_score)
        
        # Feature 3: ML confidence
        ml_confidence = float(claim.get('mlConfidence', 0)) / 100.0
        features.append(ml_confidence)
        
        # Feature 4: Claim type encoding
        claim_type = claim.get('claimType', 'Outpatient')
        claim_type_encoding = {
            'Outpatient': 0.25,
            'Inpatient': 0.5,
            'Emergency': 0.75,
            'Surgery': 1.0
        }
        features.append(claim_type_encoding.get(claim_type, 0.25))
        
        # Feature 5: Description length (normalized)
        description = claim.get('description', '')
        desc_length = min(len(description) / 500, 1.0)
        features.append(desc_length)
        
        return np.array(features)
    
    def load_new_claims_from_blockchain(self, claims):
        """
        Load new approved/rejected claims from blockchain for training
        
        Args:
            claims: List of claim dictionaries from blockchain
            
        Returns:
            Number of new claims added for training
        """
        new_claims_count = 0
        
        for claim in claims:
            claim_id = claim.get('id')
            status = claim.get('status')
            
            # Only train on finalized claims (APPROVED or REJECTED)
            if status not in ['APPROVED', 'REJECTED']:
                continue
            
            # Skip if already processed
            if claim_id in self.processed_claims:
                continue
            
            # Extract features
            try:
                features = self._extract_features(claim)
                
                # Label: 1 if rejected (fraudulent), 0 if approved (legitimate)
                label = 1 if status == 'REJECTED' else 0
                
                # Distribute to a random node (simulating federated distribution)
                node = random.choice(self.nodes)
                if node.add_training_sample(claim_id, features, label):
                    self.processed_claims.add(claim_id)
                    new_claims_count += 1
                    
                    print(f"   📊 Claim {claim_id} added to {node.name} - Label: {'Fraudulent' if label == 1 else 'Legitimate'}")
                    
            except Exception as e:
                print(f"   ⚠️ Error processing claim {claim_id}: {e}")
                continue
        
        if new_claims_count > 0:
            self._save_state()
            print(f"\n✅ Loaded {new_claims_count} new claims for federated training")
        
        return new_claims_count
    
    def train_round(self, claims=None):
        """
        Perform one round of federated learning
        
        Args:
            claims: Optional list of claims from blockchain. If provided, loads new claims first.
            
        Returns:
            Training round result dictionary
        """
        # Load new claims if provided
        new_claims_count = 0
        if claims:
            new_claims_count = self.load_new_claims_from_blockchain(claims)
        
        # Check if there's any data to train on
        total_samples = sum(node.training_samples for node in self.nodes)
        
        if total_samples == 0:
            return {
                'success': False,
                'message': 'No training data available. Please approve or reject claims first.',
                'round': self.training_rounds,
                'new_claims_loaded': new_claims_count,
                'total_samples': 0,
                'global_accuracy': self.global_model_accuracy,
                'nodes_participated': 0
            }
        
        # Check if there's new data since last training
        if total_samples == self.last_trained_claim_count:
            return {
                'success': False,
                'message': 'No new claims since last training round. Approve or reject more claims first.',
                'round': self.training_rounds,
                'new_claims_loaded': new_claims_count,
                'total_samples': total_samples,
                'global_accuracy': self.global_model_accuracy,
                'nodes_participated': 0
            }
        
        print(f"\n🚀 Starting Federated Learning Round {self.training_rounds + 1}")
        print(f"   Total samples: {total_samples}")
        print(f"   New samples since last round: {total_samples - self.last_trained_claim_count}")
        
        self.training_rounds += 1
        self.last_trained_claim_count = total_samples
        
        # Each node trains locally
        node_accuracies = []
        node_weights = []
        participating_nodes = []
        
        for node in self.nodes:
            if node.training_samples > 0:
                print(f"   🔄 {node.name} training on {node.training_samples} samples...")
                accuracy = node.train_local_model()
                node_accuracies.append(accuracy)
                node_weights.append(node.training_samples)
                participating_nodes.append({
                    'node_id': node.node_id,
                    'name': node.name,
                    'accuracy': round(accuracy, 4),
                    'samples': node.training_samples
                })
                print(f"      Local accuracy: {accuracy:.2%}")
        
        # Aggregate models (weighted average based on training samples)
        if node_accuracies:
            total_weight = sum(node_weights)
            self.global_model_accuracy = sum(
                acc * weight for acc, weight in zip(node_accuracies, node_weights)
            ) / total_weight
            
            print(f"\n   ✅ Global model accuracy: {self.global_model_accuracy:.2%}")
        
        # Record training history
        round_result = {
            'success': True,
            'round': self.training_rounds,
            'timestamp': datetime.now().isoformat(),
            'global_accuracy': round(self.global_model_accuracy, 4),
            'nodes_participated': len(node_accuracies),
            'total_samples': total_samples,
            'new_claims_loaded': new_claims_count,
            'node_accuracies': participating_nodes,
            'message': f'Training successful! Global accuracy: {self.global_model_accuracy:.2%}'
        }
        
        self.training_history.append(round_result)
        self._save_state()
        
        return round_result
    
    def get_status(self):
        """Get current FL system status"""
        total_samples = sum(node.training_samples for node in self.nodes)
        active_nodes = sum(1 for node in self.nodes if node.training_samples > 0)
        new_samples_available = total_samples - self.last_trained_claim_count
        
        return {
            'rounds_completed': self.training_rounds,
            'global_accuracy': round(self.global_model_accuracy, 4),
            'total_nodes': len(self.nodes),
            'active_nodes': active_nodes,
            'total_training_samples': total_samples,
            'processed_claims_count': len(self.processed_claims),
            'new_samples_available': new_samples_available,
            'can_train': new_samples_available > 0,
            'nodes': [
                {
                    'node_id': node.node_id,
                    'name': node.name,
                    'samples': node.training_samples,
                    'accuracy': round(node.local_model_accuracy, 4) if node.training_samples > 0 else 0
                }
                for node in self.nodes
            ],
            'training_history': self.training_history[-10:]  # Last 10 rounds
        }
    
    def reset(self):
        """Reset the FL system (for testing purposes)"""
        self.processed_claims = set()
        self.training_rounds = 0
        self.global_model_accuracy = 0.75
        self.last_trained_claim_count = 0
        self.training_history = []
        
        for node in self.nodes:
            node.local_data = []
            node.processed_claims = set()
            node.training_samples = 0
            node.local_model_accuracy = 0.0
        
        self._save_state()
        print("✅ Federated Learning system reset")