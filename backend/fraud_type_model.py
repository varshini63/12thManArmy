import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from datetime import datetime

class FraudTypePredictor:
    """ML model for predicting fraud type based on claim details"""
    
    def __init__(self, dataset_path='dataset.csv'):
        self.dataset_path = dataset_path
        self.model = None
        self.label_encoders = {}
        self.fraud_type_encoder = None
        # Updated to match your exact column names
        self.feature_columns = ['Age', 'Gender', 'Diagnosis', 'Treatment', 'Amount Billed']
        self.is_trained = False
        self.model_accuracy = 0.0
        
        # Try to load existing model
        if os.path.exists('fraud_type_model.pkl'):
            self.load_model()
        else:
            print("⚠️ No pre-trained model found. Training new model...")
            if os.path.exists(dataset_path):
                self.train_model()
            else:
                print(f"❌ Dataset not found at {dataset_path}")
    
    def prepare_data(self, df):
        """Prepare and encode data for training"""
        # Create copies to avoid modifying original
        data = df.copy()
        
        # Encode categorical features (match your column names)
        for col in ['Gender', 'Diagnosis', 'Treatment']:
            if col in data.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    data[col] = self.label_encoders[col].fit_transform(data[col].astype(str))
                else:
                    # Handle unseen labels
                    le = self.label_encoders[col]
                    data[col] = data[col].apply(
                        lambda x: le.transform([str(x)])[0] if str(x) in le.classes_ else -1
                    )
        
        # Encode target variable (Fraud Type)
        if 'Fraud Type' in data.columns:
            if self.fraud_type_encoder is None:
                self.fraud_type_encoder = LabelEncoder()
                data['fraud_type_encoded'] = self.fraud_type_encoder.fit_transform(data['Fraud Type'].astype(str))
            else:
                data['fraud_type_encoded'] = data['Fraud Type'].apply(
                    lambda x: self.fraud_type_encoder.transform([str(x)])[0] 
                    if str(x) in self.fraud_type_encoder.classes_ else -1
                )
        
        return data
    
    def train_model(self):
        """Train the fraud type prediction model"""
        try:
            print(f"📊 Loading dataset from {self.dataset_path}...")
            df = pd.read_csv(self.dataset_path)
            
            print(f"✅ Dataset loaded: {len(df)} records")
            print(f"   Columns: {list(df.columns)}")
            
            # Check for required columns (with your exact column names)
            required_cols = self.feature_columns + ['Fraud Type']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                print(f"❌ Missing required columns: {missing_cols}")
                print(f"   Available columns: {list(df.columns)}")
                return False
            
            # Prepare data
            data = self.prepare_data(df)
            
            # Remove rows with missing fraud_type
            data = data[data['fraud_type_encoded'] != -1]
            
            if len(data) == 0:
                print("❌ No valid data after preprocessing")
                return False
            
            # Prepare features and target
            X = data[self.feature_columns]
            y = data['fraud_type_encoded']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            print(f"📈 Training Random Forest model...")
            print(f"   Training samples: {len(X_train)}")
            print(f"   Test samples: {len(X_test)}")
            print(f"   Fraud types: {len(self.fraud_type_encoder.classes_)}")
            
            # Train Random Forest
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            self.model_accuracy = accuracy_score(y_test, y_pred)
            
            print(f"\n✅ Model trained successfully!")
            print(f"   Accuracy: {self.model_accuracy:.2%}")
            print(f"\n📊 Classification Report:")
            print(classification_report(
                y_test, y_pred,
                target_names=self.fraud_type_encoder.classes_
            ))
            
            # Save model
            self.save_model()
            self.is_trained = True
            
            return True
            
        except Exception as e:
            print(f"❌ Error training model: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def predict_fraud_type(self, patient_data):
        """
        Predict fraud type for a new claim
        
        Args:
            patient_data: dict with keys: age, gender, diagnosis, treatment, amount_billed
        
        Returns:
            dict with fraud_type, confidence, and all probabilities
        """
        if not self.is_trained or self.model is None:
            return {
                'fraud_type': 'UNKNOWN',
                'confidence': 0.0,
                'probabilities': {},
                'error': 'Model not trained'
            }
        
        try:
            # Create DataFrame from input (map to your column names)
            input_df = pd.DataFrame([{
                'Age': patient_data.get('age', 0),
                'Gender': patient_data.get('gender', 'Unknown'),
                'Diagnosis': patient_data.get('diagnosis', 'Unknown'),
                'Treatment': patient_data.get('treatment', 'Unknown'),
                'Amount Billed': patient_data.get('amount_billed', 0)
            }])
            
            # Encode categorical features
            for col in ['Gender', 'Diagnosis', 'Treatment']:
                if col in self.label_encoders:
                    le = self.label_encoders[col]
                    try:
                        input_df[col] = le.transform(input_df[col].astype(str))
                    except:
                        # Handle unseen values
                        input_df[col] = -1
            
            # Predict
            prediction = self.model.predict(input_df)[0]
            probabilities = self.model.predict_proba(input_df)[0]
            
            # Decode prediction
            fraud_type = self.fraud_type_encoder.inverse_transform([prediction])[0]
            confidence = probabilities[prediction]
            
            # Get all probabilities
            prob_dict = {
                self.fraud_type_encoder.inverse_transform([i])[0]: float(prob)
                for i, prob in enumerate(probabilities)
            }
            
            return {
                'fraud_type': fraud_type,
                'confidence': float(confidence),
                'probabilities': prob_dict,
                'model_accuracy': self.model_accuracy
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'fraud_type': 'ERROR',
                'confidence': 0.0,
                'probabilities': {},
                'error': str(e)
            }
    
    def save_model(self):
        """Save trained model and encoders"""
        try:
            model_data = {
                'model': self.model,
                'label_encoders': self.label_encoders,
                'fraud_type_encoder': self.fraud_type_encoder,
                'feature_columns': self.feature_columns,
                'model_accuracy': self.model_accuracy,
                'trained_at': datetime.now().isoformat()
            }
            joblib.dump(model_data, 'fraud_type_model.pkl')
            print(f"✅ Model saved to fraud_type_model.pkl")
        except Exception as e:
            print(f"❌ Error saving model: {e}")
    
    def load_model(self):
        """Load pre-trained model and encoders"""
        try:
            model_data = joblib.load('fraud_type_model.pkl')
            self.model = model_data['model']
            self.label_encoders = model_data['label_encoders']
            self.fraud_type_encoder = model_data['fraud_type_encoder']
            self.feature_columns = model_data['feature_columns']
            self.model_accuracy = model_data.get('model_accuracy', 0.0)
            self.is_trained = True
            print(f"✅ Model loaded successfully (Accuracy: {self.model_accuracy:.2%})")
            print(f"   Fraud types: {list(self.fraud_type_encoder.classes_)}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.is_trained = False
    
    def get_model_info(self):
        """Get model information"""
        if not self.is_trained:
            return {
                'is_trained': False,
                'message': 'Model not trained'
            }
        
        return {
            'is_trained': True,
            'model_type': 'RandomForestClassifier',
            'accuracy': self.model_accuracy,
            'fraud_types': list(self.fraud_type_encoder.classes_),
            'feature_columns': self.feature_columns,
            'n_estimators': self.model.n_estimators if self.model else 0
        }