"""
ML-Based Insurance Fraud Detection System
Provides fraud risk scoring and classification using machine learning models
"""

import numpy as np
import pandas as pd
import pickle
import os
import warnings
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from imblearn.over_sampling import SMOTE

warnings.filterwarnings('ignore')


class MLFraudDetector:
    """Machine Learning based fraud detection system"""
    
    def __init__(self, data_path='insurance_claims.csv', model_dir='ml_models'):
        """
        Initialize ML Fraud Detector
        
        Args:
            data_path: Path to insurance claims CSV dataset
            model_dir: Directory to save/load trained models
        """
        self.data_path = data_path
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.label_encoders = {}
        self.feature_columns = []
        self.model_accuracy = 0.0
        self.model_type = 'RandomForest'
        self.is_trained = False
        
        # Create models directory if it doesn't exist
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
        
        # Try to load existing model
        self._load_model()
    
    def prepare_data(self):
        """
        Load and prepare the insurance claims dataset
        
        Returns:
            X_train, X_test, y_train, y_test: Split and processed data
        """
        print("=" * 60)
        print("📊 LOADING AND PREPARING DATASET")
        print("=" * 60)
        
        # Load dataset
        df = pd.read_csv(self.data_path)
        print(f"✅ Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Remove unnamed columns
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
        
        # Drop rows with missing target variable
        df = df.dropna(subset=['fraud_reported'])
        
        # Select relevant features for fraud detection
        selected_features = [
            'months_as_customer', 'age', 'policy_deductable', 'policy_annual_premium',
            'umbrella_limit', 'capital-gains', 'capital-loss', 'incident_severity',
            'number_of_vehicles_involved', 'bodily_injuries', 'witnesses',
            'total_claim_amount', 'injury_claim', 'property_claim', 'vehicle_claim',
            'incident_type', 'collision_type', 'property_damage', 'police_report_available',
            'insured_sex', 'insured_education_level', 'insured_occupation',
            'insured_relationship', 'incident_state', 'auto_make', 'auto_year'
        ]
        
        # Filter to only include columns that exist in dataset
        available_features = [col for col in selected_features if col in df.columns]
        
        # Create working dataframe
        df_work = df[available_features + ['fraud_reported']].copy()
        
        # Handle missing values
        for col in df_work.columns:
            if df_work[col].dtype == 'object':
                df_work[col].fillna('Unknown', inplace=True)
            else:
                df_work[col].fillna(df_work[col].median(), inplace=True)
        
        # Encode categorical variables
        categorical_cols = df_work.select_dtypes(include=['object']).columns.tolist()
        categorical_cols.remove('fraud_reported')  # Exclude target
        
        print(f"📝 Encoding {len(categorical_cols)} categorical features...")
        
        for col in categorical_cols:
            if col not in self.label_encoders:
                le = LabelEncoder()
                df_work[col] = le.fit_transform(df_work[col].astype(str))
                self.label_encoders[col] = le
            else:
                # Use existing encoder
                le = self.label_encoders[col]
                # Handle unknown categories
                known_labels = set(le.classes_)
                df_work[col] = df_work[col].apply(
                    lambda x: x if x in known_labels else 'Unknown'
                )
                df_work[col] = le.transform(df_work[col].astype(str))
        
        # Encode target variable (Y/N to 1/0)
        df_work['fraud_reported'] = df_work['fraud_reported'].map({'Y': 1, 'N': 0})
        
        # Handle any remaining missing values in target
        df_work = df_work.dropna(subset=['fraud_reported'])
        
        # Separate features and target
        X = df_work.drop('fraud_reported', axis=1)
        y = df_work['fraud_reported']
        
        self.feature_columns = X.columns.tolist()
        
        print(f"✅ Feature engineering complete: {len(self.feature_columns)} features")
        print(f"📊 Fraud distribution: {y.value_counts().to_dict()}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Handle imbalanced data using SMOTE
        print("⚖️  Applying SMOTE for class balancing...")
        smote = SMOTE(random_state=42)
        X_train, y_train = smote.fit_resample(X_train, y_train)
        
        print(f"✅ After SMOTE: {len(X_train)} training samples")
        
        # Scale features
        if self.scaler is None:
            self.scaler = StandardScaler()
            X_train = self.scaler.fit_transform(X_train)
        else:
            X_train = self.scaler.transform(X_train)
        
        X_test = self.scaler.transform(X_test)
        
        # Convert back to DataFrame for easier handling
        X_train = pd.DataFrame(X_train, columns=self.feature_columns)
        X_test = pd.DataFrame(X_test, columns=self.feature_columns)
        
        print("=" * 60)
        
        return X_train, X_test, y_train, y_test
    
    def train_model(self, algorithm='RandomForest'):
        """
        Train the fraud detection model
        
        Args:
            algorithm: ML algorithm to use (RandomForest, GradientBoosting, DecisionTree, etc.)
        
        Returns:
            dict: Training results including accuracy and metrics
        """
        print("\n" + "=" * 60)
        print(f"🤖 TRAINING ML MODEL: {algorithm}")
        print("=" * 60)
        
        # Prepare data
        X_train, X_test, y_train, y_test = self.prepare_data()
        
        # Select and initialize model
        if algorithm == 'RandomForest':
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        elif algorithm == 'GradientBoosting':
            model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
        elif algorithm == 'DecisionTree':
            model = DecisionTreeClassifier(
                max_depth=15,
                min_samples_split=10,
                random_state=42
            )
        elif algorithm == 'KNN':
            model = KNeighborsClassifier(n_neighbors=5)
        elif algorithm == 'LogisticRegression':
            model = LogisticRegression(max_iter=1000, random_state=42)
        elif algorithm == 'NaiveBayes':
            model = GaussianNB()
        elif algorithm == 'SVM':
            model = SVC(kernel='rbf', probability=True, random_state=42)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
        
        # Train model
        print(f"🔄 Training {algorithm} model...")
        model.fit(X_train, y_train)
        
        # Evaluate on training set
        train_pred = model.predict(X_train)
        train_accuracy = accuracy_score(y_train, train_pred)
        
        # Evaluate on test set
        test_pred = model.predict(X_test)
        test_accuracy = accuracy_score(y_test, test_pred)
        test_f1 = f1_score(y_test, test_pred)
        
        print(f"✅ Training accuracy: {train_accuracy:.2%}")
        print(f"✅ Test accuracy: {test_accuracy:.2%}")
        print(f"✅ F1 Score: {test_f1:.2%}")
        
        # Classification report
        print("\n📊 Classification Report:")
        print(classification_report(y_test, test_pred, target_names=['Legitimate', 'Fraudulent']))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, test_pred)
        print("\n📊 Confusion Matrix:")
        print(f"True Negatives: {cm[0][0]}, False Positives: {cm[0][1]}")
        print(f"False Negatives: {cm[1][0]}, True Positives: {cm[1][1]}")
        
        # Save model
        self.model = model
        self.model_accuracy = test_accuracy
        self.model_type = algorithm
        self.is_trained = True
        
        self._save_model()
        
        print("=" * 60)
        
        return {
            'algorithm': algorithm,
            'train_accuracy': train_accuracy,
            'test_accuracy': test_accuracy,
            'f1_score': test_f1,
            'confusion_matrix': cm.tolist(),
            'model_saved': True
        }
    
    def compare_models(self):
        """
        Compare performance of multiple ML algorithms
        
        Returns:
            dict: Comparison results for all algorithms
        """
        print("\n" + "=" * 60)
        print("🔬 COMPARING MULTIPLE ML ALGORITHMS")
        print("=" * 60)
        
        algorithms = [
            'RandomForest',
            'GradientBoosting',
            'DecisionTree',
            'LogisticRegression',
            'NaiveBayes',
            'KNN'
        ]
        
        results = {}
        
        X_train, X_test, y_train, y_test = self.prepare_data()
        
        for algo in algorithms:
            print(f"\n🔄 Training {algo}...")
            
            try:
                if algo == 'RandomForest':
                    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
                elif algo == 'GradientBoosting':
                    model = GradientBoostingClassifier(n_estimators=100, random_state=42)
                elif algo == 'DecisionTree':
                    model = DecisionTreeClassifier(max_depth=15, random_state=42)
                elif algo == 'KNN':
                    model = KNeighborsClassifier(n_neighbors=5)
                elif algo == 'LogisticRegression':
                    model = LogisticRegression(max_iter=1000, random_state=42)
                elif algo == 'NaiveBayes':
                    model = GaussianNB()
                
                model.fit(X_train, y_train)
                test_pred = model.predict(X_test)
                
                accuracy = accuracy_score(y_test, test_pred)
                f1 = f1_score(y_test, test_pred)
                
                results[algo] = {
                    'accuracy': accuracy,
                    'f1_score': f1
                }
                
                print(f"   ✅ {algo}: Accuracy={accuracy:.2%}, F1={f1:.2%}")
                
            except Exception as e:
                print(f"   ❌ {algo} failed: {e}")
                results[algo] = {'accuracy': 0, 'f1_score': 0, 'error': str(e)}
        
        # Find best model
        best_algo = max(results.keys(), key=lambda x: results[x].get('accuracy', 0))
        
        print("\n" + "=" * 60)
        print(f"🏆 BEST MODEL: {best_algo} (Accuracy: {results[best_algo]['accuracy']:.2%})")
        print("=" * 60)
        
        return results
    
    def predict_fraud(self, claim_data):
        """
        Predict fraud for a new insurance claim
        
        Args:
            claim_data: Dictionary containing claim information
            
        Returns:
            dict: Prediction results with fraud probability and risk score
        """
        if not self.is_trained or self.model is None:
            return {
                'is_fraud': False,
                'fraud_probability': 0.5,
                'confidence': 0.0,
                'ml_fraud_type': 'MODEL_NOT_TRAINED',
                'ml_confidence': 0,
                'error': 'ML model not trained. Please train the model first.'
            }
        
        try:
            # Extract features from claim data
            features = self._extract_features_from_claim(claim_data)
            
            # Make prediction
            fraud_prob = self.model.predict_proba([features])[0][1]  # Probability of fraud
            is_fraud = fraud_prob > 0.5
            
            # Determine fraud type based on claim characteristics
            fraud_type = self._determine_fraud_type(claim_data, fraud_prob)
            
            # Calculate confidence (how far from threshold)
            confidence = abs(fraud_prob - 0.5) * 2  # Scale 0-1
            
            return {
                'is_fraud': bool(is_fraud),
                'fraud_probability': float(fraud_prob),
                'confidence': float(confidence),
                'ml_fraud_type': fraud_type,
                'ml_confidence': int(confidence * 100),
                'model_type': self.model_type,
                'model_accuracy': float(self.model_accuracy),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'is_fraud': False,
                'fraud_probability': 0.5,
                'confidence': 0.0,
                'ml_fraud_type': 'PREDICTION_ERROR',
                'ml_confidence': 0,
                'error': str(e)
            }
    
    def _extract_features_from_claim(self, claim_data):
        """
        Extract and encode features from claim data for prediction
        
        Args:
            claim_data: Dictionary with claim information
            
        Returns:
            list: Encoded feature vector
        """
        # Map claim data to feature columns
        feature_dict = {}
        
        # Numerical features
        feature_dict['age'] = int(claim_data.get('age', 40))
        feature_dict['months_as_customer'] = int(claim_data.get('months_as_customer', 100))
        feature_dict['policy_deductable'] = float(claim_data.get('policy_deductable', 1000))
        feature_dict['policy_annual_premium'] = float(claim_data.get('policy_annual_premium', 1200))
        feature_dict['umbrella_limit'] = float(claim_data.get('umbrella_limit', 0))
        feature_dict['capital-gains'] = float(claim_data.get('capital_gains', 0))
        feature_dict['capital-loss'] = float(claim_data.get('capital_loss', 0))
        feature_dict['number_of_vehicles_involved'] = int(claim_data.get('number_of_vehicles_involved', 1))
        feature_dict['bodily_injuries'] = int(claim_data.get('bodily_injuries', 0))
        feature_dict['witnesses'] = int(claim_data.get('witnesses', 0))
        feature_dict['total_claim_amount'] = float(claim_data.get('amount', 10000))
        feature_dict['injury_claim'] = float(claim_data.get('injury_claim', 0))
        feature_dict['property_claim'] = float(claim_data.get('property_claim', 0))
        feature_dict['vehicle_claim'] = float(claim_data.get('vehicle_claim', 0))
        feature_dict['auto_year'] = int(claim_data.get('auto_year', 2010))
        
        # Categorical features (will be encoded)
        categorical_mapping = {
            'incident_severity': claim_data.get('incident_severity', 'Minor Damage'),
            'incident_type': claim_data.get('claimType', 'Single Vehicle Collision'),
            'collision_type': claim_data.get('collision_type', 'Front Collision'),
            'property_damage': claim_data.get('property_damage', 'NO'),
            'police_report_available': claim_data.get('police_report_available', 'YES'),
            'insured_sex': claim_data.get('insured_sex', 'MALE'),
            'insured_education_level': claim_data.get('insured_education_level', 'MD'),
            'insured_occupation': claim_data.get('insured_occupation', 'prof-specialty'),
            'insured_relationship': claim_data.get('insured_relationship', 'husband'),
            'incident_state': claim_data.get('incident_state', 'OH'),
            'auto_make': claim_data.get('auto_make', 'Toyota')
        }
        
        # Encode categorical variables
        for col, value in categorical_mapping.items():
            if col in self.label_encoders:
                le = self.label_encoders[col]
                try:
                    # Check if value is in known classes
                    if value in le.classes_:
                        feature_dict[col] = le.transform([value])[0]
                    else:
                        # Use most common class if unknown
                        feature_dict[col] = 0
                except:
                    feature_dict[col] = 0
            else:
                feature_dict[col] = 0
        
        # Create feature vector in correct order
        features = []
        for col in self.feature_columns:
            features.append(feature_dict.get(col, 0))
        
        # Scale features
        features_array = np.array(features).reshape(1, -1)
        features_scaled = self.scaler.transform(features_array)
        
        return features_scaled[0]
    
    def _determine_fraud_type(self, claim_data, fraud_prob):
        """
        Determine the type of fraud based on claim characteristics
        
        Args:
            claim_data: Claim information
            fraud_prob: Fraud probability from model
            
        Returns:
            str: Fraud type classification
        """
        if fraud_prob < 0.3:
            return 'LEGITIMATE'
        elif fraud_prob < 0.5:
            return 'LOW_RISK'
        elif fraud_prob < 0.7:
            return 'MODERATE_RISK'
        
        # High fraud probability - determine specific type
        amount = float(claim_data.get('amount', 0))
        claim_type = claim_data.get('claimType', '')
        description = claim_data.get('description', '').lower()
        
        if amount > 75000:
            return 'OVERBILLING'
        elif claim_type == 'Vehicle Theft':
            return 'STAGED_THEFT'
        elif 'accident' in description or 'collision' in description.lower():
            return 'STAGED_ACCIDENT'
        elif len(description) < 50:
            return 'INSUFFICIENT_DOCUMENTATION'
        elif 'emergency' in description or 'urgent' in description:
            return 'EXAGGERATED_CLAIMS'
        else:
            return 'SUSPECTED_FRAUD'
    
    def _save_model(self):
        """Save the trained model, scaler, and encoders to disk"""
        try:
            # Save model
            model_path = os.path.join(self.model_dir, 'fraud_model.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump(self.model, f)
            
            # Save scaler
            scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
            with open(scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            
            # Save label encoders
            encoders_path = os.path.join(self.model_dir, 'label_encoders.pkl')
            with open(encoders_path, 'wb') as f:
                pickle.dump(self.label_encoders, f)
            
            # Save metadata
            metadata = {
                'model_type': self.model_type,
                'model_accuracy': self.model_accuracy,
                'feature_columns': self.feature_columns,
                'is_trained': self.is_trained,
                'last_trained': datetime.now().isoformat()
            }
            metadata_path = os.path.join(self.model_dir, 'metadata.pkl')
            with open(metadata_path, 'wb') as f:
                pickle.dump(metadata, f)
            
            print(f"✅ Model saved to {self.model_dir}")
            
        except Exception as e:
            print(f"❌ Error saving model: {e}")
    
    def _load_model(self):
        """Load the trained model, scaler, and encoders from disk"""
        try:
            model_path = os.path.join(self.model_dir, 'fraud_model.pkl')
            scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
            encoders_path = os.path.join(self.model_dir, 'label_encoders.pkl')
            metadata_path = os.path.join(self.model_dir, 'metadata.pkl')
            
            if all(os.path.exists(p) for p in [model_path, scaler_path, encoders_path, metadata_path]):
                # Load model
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                
                # Load scaler
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                
                # Load label encoders
                with open(encoders_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)
                
                # Load metadata
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                    self.model_type = metadata['model_type']
                    self.model_accuracy = metadata['model_accuracy']
                    self.feature_columns = metadata['feature_columns']
                    self.is_trained = metadata['is_trained']
                
                print(f"✅ Model loaded from {self.model_dir}")
                print(f"   Model type: {self.model_type}")
                print(f"   Accuracy: {self.model_accuracy:.2%}")
                
            else:
                print("ℹ️  No saved model found. Please train the model first.")
                
        except Exception as e:
            print(f"⚠️  Could not load model: {e}")
            self.is_trained = False
    
    def get_model_info(self):
        """
        Get information about the current model
        
        Returns:
            dict: Model information
        """
        return {
            'is_trained': self.is_trained,
            'model_type': self.model_type,
            'model_accuracy': self.model_accuracy,
            'num_features': len(self.feature_columns),
            'feature_columns': self.feature_columns
        }


# For testing and CLI usage
if __name__ == '__main__':
    print("=" * 60)
    print("🚀 INSURANCE FRAUD DETECTION - ML SYSTEM")
    print("=" * 60)
    
    # Initialize detector
    detector = MLFraudDetector()
    
    # Train model
    print("\n1️⃣  Training Random Forest model...")
    results = detector.train_model(algorithm='RandomForest')
    
    print(f"\n✅ Model trained successfully!")
    print(f"   Accuracy: {results['test_accuracy']:.2%}")
    print(f"   F1 Score: {results['f1_score']:.2%}")
    
    # Test prediction
    print("\n2️⃣  Testing prediction on sample claim...")
    test_claim = {
        'amount': 75000,
        'claimType': 'Inpatient',
        'description': 'Emergency surgery claim',
        'age': 45,
        'months_as_customer': 120
    }
    
    prediction = detector.predict_fraud(test_claim)
    print(f"\n📊 Prediction Results:")
    print(f"   Fraud Probability: {prediction['fraud_probability']:.2%}")
    print(f"   Is Fraud: {prediction['is_fraud']}")
    print(f"   Fraud Type: {prediction['ml_fraud_type']}")
    print(f"   Confidence: {prediction['ml_confidence']}%")
    
    print("\n" + "=" * 60)
    print("✅ ML SYSTEM READY FOR INTEGRATION")
    print("=" * 60)