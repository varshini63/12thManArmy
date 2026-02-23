"""
Test Script for ML Fraud Detection System
Run this to train and test the ML model before integrating into Flask app
"""

import sys
import os

# Ensure the ml_learning module can be imported
sys.path.insert(0, os.path.dirname(__file__))

from ml_learning import MLFraudDetector

def main():
    print("=" * 80)
    print("🚀 INSURANCE FRAUD DETECTION - ML SYSTEM TEST")
    print("=" * 80)
    
    # Step 1: Initialize detector
    print("\n📦 Step 1: Initializing ML Detector...")
    detector = MLFraudDetector(data_path='insurance_claims.csv')
    
    # Step 2: Check if model is already trained
    model_info = detector.get_model_info()
    print(f"\n📊 Current Model Status:")
    print(f"   - Is Trained: {model_info['is_trained']}")
    print(f"   - Model Type: {model_info['model_type']}")
    print(f"   - Accuracy: {model_info['model_accuracy']:.2%}")
    
    # Step 3: Train model if not trained
    if not model_info['is_trained']:
        print("\n🤖 Step 2: Training Random Forest Model...")
        print("   (This may take 1-2 minutes for the first time)")
        
        results = detector.train_model(algorithm='RandomForest')
        
        print(f"\n✅ Training Complete!")
        print(f"   - Test Accuracy: {results['test_accuracy']:.2%}")
        print(f"   - F1 Score: {results['f1_score']:.2%}")
        print(f"   - Model Saved: {results['model_saved']}")
    else:
        print("\n✅ Model already trained! Skipping training step.")
    
    # Step 4: Test predictions
    print("\n🧪 Step 3: Testing Predictions...")
    
    test_cases = [
        {
            'name': 'Low Risk Claim',
            'claim': {
                'amount': 15000,
                'claimType': 'Outpatient',
                'description': 'Regular checkup and routine blood tests. Doctor prescribed medication for minor condition.',
                'diagnosis': 'Routine Medical Checkup',
                'age': 35,
                'months_as_customer': 150,
                'policy_deductable': 1000,
                'policy_annual_premium': 1200
            }
        },
        {
            'name': 'Medium Risk Claim',
            'claim': {
                'amount': 55000,
                'claimType': 'Inpatient',
                'description': 'Hospital admission for surgery',
                'diagnosis': 'Appendectomy',
                'age': 45,
                'months_as_customer': 80,
                'policy_deductable': 2000,
                'policy_annual_premium': 1500
            }
        },
        {
            'name': 'High Risk Claim (Likely Fraud)',
            'claim': {
                'amount': 125000,
                'claimType': 'Emergency',
                'description': 'urgent emergency',
                'diagnosis': 'Emergency treatment',
                'age': 28,
                'months_as_customer': 20,
                'policy_deductable': 500,
                'policy_annual_premium': 800
            }
        }
    ]
    
    for idx, test_case in enumerate(test_cases, 1):
        print(f"\n{'─' * 80}")
        print(f"Test Case {idx}: {test_case['name']}")
        print(f"{'─' * 80}")
        print(f"Amount: ₹{test_case['claim']['amount']}")
        print(f"Type: {test_case['claim']['claimType']}")
        print(f"Description: {test_case['claim']['description'][:60]}...")
        
        prediction = detector.predict_fraud(test_case['claim'])
        
        print(f"\n📊 ML Prediction Results:")
        print(f"   ➤ Fraud Probability: {prediction['fraud_probability']:.2%}")
        print(f"   ➤ Is Fraud: {'YES ⚠️' if prediction['is_fraud'] else 'NO ✅'}")
        print(f"   ➤ Fraud Type: {prediction['ml_fraud_type']}")
        print(f"   ➤ Confidence: {prediction['ml_confidence']}%")
        print(f"   ➤ Model Type: {prediction['model_type']}")
    
    # Step 5: Model comparison (optional)
    print("\n" + "=" * 80)
    response = input("\n🔬 Would you like to compare different ML algorithms? (y/n): ")
    
    if response.lower() == 'y':
        print("\n🔬 Comparing Multiple Algorithms...")
        print("   (This will take 3-5 minutes)")
        
        comparison_results = detector.compare_models()
        
        print("\n📊 Algorithm Comparison Results:")
        print("─" * 80)
        
        # Sort by accuracy
        sorted_results = sorted(
            comparison_results.items(),
            key=lambda x: x[1].get('accuracy', 0),
            reverse=True
        )
        
        for rank, (algo, metrics) in enumerate(sorted_results, 1):
            if 'error' not in metrics:
                print(f"{rank}. {algo:20s} - Accuracy: {metrics['accuracy']:.2%}, F1: {metrics['f1_score']:.2%}")
            else:
                print(f"{rank}. {algo:20s} - Error: {metrics['error']}")
        
        print("\n💡 Tip: Train the best performing model using:")
        print(f"   detector.train_model(algorithm='{sorted_results[0][0]}')")
    
    # Summary
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print("\n📝 Next Steps:")
    print("   1. The ML model is trained and saved in ./ml_models/ directory")
    print("   2. Follow the integration guide in app_integration_guide.py")
    print("   3. Update your app.py with the ML integration code")
    print("   4. Restart your Flask server")
    print("   5. Test the /api/ml/status endpoint to verify ML is working")
    print("\n" + "=" * 80)


if __name__ == '__main__':
    main()