from flask import Flask, request, jsonify, session
from flask_cors import CORS
from web3 import Web3
import json
import os
from datetime import datetime
from functools import wraps
from federated_learning import FederatedLearningSystem
from ai_model import FraudDetectionModel
from ssi import SSISystem
import secrets
import base64
from google import genai
from ml_learning import MLFraudDetector

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True, origins=['http://localhost:3000'])

# Initialize Gemini AI with NEW API KEY
GEMINI_API_KEY = "Your_API_key"
genai_client = genai.Client(api_key=GEMINI_API_KEY)

print("="*60)
print("🤖 AI Configuration")
print("="*60)
print(f"✅ Gemini API Key: {GEMINI_API_KEY[:20]}...")
print(f"✅ Gemini Model: gemini-2.5-flash (Latest)")
print(f"✅ Multimodal Support: Enabled")

# Initialize ML Fraud Detector
print(f"\n🤖 Initializing ML Fraud Detection System...")
ml_detector = MLFraudDetector(data_path='insurance_claims.csv')
print("="*60)

# Initialize systems
fl_system = FederatedLearningSystem()

# Initialize FraudDetectionModel with BOTH genai_client AND ml_detector
fraud_model = FraudDetectionModel(genai_client, ml_detector)

ssi_system = SSISystem()

# Web3 connection
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:7550'))

# Contract variables
CONTRACT_ADDRESS = None
CONTRACT_ABI = None
contract = None

# In-memory temporary storage ONLY for Gemini analysis and file data
gemini_analysis_cache = {}
claim_files_cache = {}

def load_contract():
    global CONTRACT_ADDRESS, CONTRACT_ABI, contract
    try:
        contract_path = os.path.join('..', 'blockchain', 'build', 'contracts', 'InsuranceClaim.json')
        with open(contract_path, 'r') as f:
            contract_json = json.load(f)
            CONTRACT_ABI = contract_json['abi']
            networks = contract_json['networks']
            if networks:
                network_id = list(networks.keys())[-1]
                CONTRACT_ADDRESS = networks[network_id]['address']
                contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
                print(f"✅ Contract loaded at: {CONTRACT_ADDRESS}")
                return True
    except Exception as e:
        print(f"❌ Contract not loaded: {e}")
        return False

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user' not in session:
                return jsonify({'error': 'Authentication required'}), 401
            if session['user']['role'] not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ==================== CONTRACT INFO ====================

@app.route('/api/contract/info', methods=['GET'])
def get_contract_info():
    """Get contract address and ABI"""
    if CONTRACT_ADDRESS and CONTRACT_ABI:
        return jsonify({
            'address': CONTRACT_ADDRESS,
            'abi': CONTRACT_ABI,
            'connected': w3.is_connected()
        })
    return jsonify({'error': 'Contract not deployed'}), 500

# ==================== AUTH ENDPOINTS ====================

@app.route('/api/auth/check-user', methods=['POST'])
def check_user():
    """Check if user exists on blockchain"""
    data = request.json
    address = data.get('address')
    
    try:
        user = contract.functions.users(Web3.to_checksum_address(address)).call()
        if user[4]:
            return jsonify({
                'exists': True,
                'username': user[0],
                'role': user[1],
                'name': user[2]
            })
        return jsonify({'exists': False})
    except Exception as e:
        return jsonify({'exists': False, 'error': str(e)})

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user via wallet address"""
    data = request.json
    address = data.get('address')
    
    try:
        checksum_address = Web3.to_checksum_address(address)
        user = contract.functions.users(checksum_address).call()
        
        if user[4]:
            session['user'] = {
                'username': user[0],
                'role': user[1],
                'name': user[2],
                'wallet_address': address.lower()
            }
            return jsonify({
                'message': 'Login successful',
                'user': session['user']
            })
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.pop('user', None)
    return jsonify({'message': 'Logout successful'})

@app.route('/api/auth/session', methods=['GET'])
def get_session():
    """Get current session"""
    if 'user' in session:
        return jsonify({'user': session['user']})
    return jsonify({'user': None})

# ==================== SSI ENDPOINTS ====================

@app.route('/api/ssi/create-identity', methods=['POST'])
@role_required(['patient'])
def create_identity():
    """Create SSI identity"""
    data = request.json
    
    identity_data = ssi_system.create_identity(
        name=data.get('name'),
        email=data.get('email'),
        id_number=data.get('idNumber'),
        date_of_birth=data.get('dateOfBirth')
    )
    
    return jsonify({
        'did': identity_data['did'],
        'name': data.get('name'),
        'email': data.get('email'),
        'idNumber': data.get('idNumber'),
        'dateOfBirth': data.get('dateOfBirth'),
        'credential': identity_data['verifiable_credential'],
        'publicKey': identity_data['public_key']
    })

@app.route('/api/ssi/my-identity', methods=['GET'])
@role_required(['patient'])
def get_my_identity():
    """Get current user's identity from blockchain"""
    try:
        address = Web3.to_checksum_address(session['user']['wallet_address'])
        identity_data = contract.functions.getMyIdentity().call({'from': address})
        
        return jsonify({
            'did': identity_data[0],
            'name': identity_data[1],
            'email': identity_data[2],
            'idNumber': identity_data[3],
            'dateOfBirth': identity_data[4],
            'wallet_address': session['user']['wallet_address']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/ssi/identities', methods=['GET'])
@login_required
def get_all_identities():
    """Get all identities from blockchain"""
    try:
        all_dids = contract.functions.getAllIdentities().call()
        identities = []
        
        for did in all_dids:
            try:
                identity_data = contract.functions.getIdentity(did).call()
                identities.append({
                    'did': did,
                    'name': identity_data[0],
                    'email': identity_data[1],
                    'owner': identity_data[2],
                    'isVerified': identity_data[3],
                    'createdAt': datetime.fromtimestamp(identity_data[4]).isoformat()
                })
            except:
                continue
        
        return jsonify(identities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== POLICY ENDPOINTS ====================

@app.route('/api/policies/prepare', methods=['POST'])
@role_required(['insurance'])
def prepare_policy():
    """Prepare policy data for blockchain submission"""
    data = request.json
    
    import random
    policy_number = f"POL{random.randint(100000, 999999)}"
    
    insurance_company_name = session['user'].get('name', 'Unknown Insurance')
    
    return jsonify({
        'policyNumber': policy_number,
        'did': data.get('did'),
        'patientName': data.get('patientName'),
        'policyType': data.get('policyType'),
        'coverageAmount': str(data.get('coverageAmount')),
        'premium': str(data.get('premium')),
        'durationMonths': int(data.get('duration', 12)),
        'insuranceCompany': insurance_company_name
    })

@app.route('/api/policies', methods=['GET'])
@login_required
def get_policies():
    """Get policies from blockchain with proper filtering"""
    try:
        current_user = session['user']
        current_address = Web3.to_checksum_address(current_user['wallet_address'])
        
        counts = contract.functions.getTotalCounts().call()
        total_policies = counts[2]
        
        policies = []
        
        for i in range(1, total_policies + 1):
            try:
                policy_data = contract.functions.policies(i).call()
                
                if not policy_data[12]:
                    continue
                
                policy = {
                    'id': policy_data[0],
                    'policyNumber': policy_data[1],
                    'did': policy_data[2],
                    'patientName': policy_data[3],
                    'policyType': policy_data[4],
                    'coverageAmount': str(policy_data[5]),
                    'premium': str(policy_data[6]),
                    'durationMonths': policy_data[7],
                    'createdBy': policy_data[8],
                    'insuranceCompany': policy_data[9],
                    'status': policy_data[10],
                    'createdAt': datetime.fromtimestamp(policy_data[11]).isoformat()
                }
                
                try:
                    from dateutil.relativedelta import relativedelta
                    created = datetime.fromtimestamp(policy_data[11])
                    expiry = created + relativedelta(months=policy_data[7])
                    policy['expiryDate'] = expiry.isoformat()
                except:
                    pass
                
                if current_user['role'] == 'patient':
                    try:
                        my_identity = contract.functions.getMyIdentity().call({'from': current_address})
                        my_did = my_identity[0]
                        if policy['did'] == my_did:
                            policies.append(policy)
                    except:
                        pass
                        
                elif current_user['role'] == 'insurance':
                    if policy['createdBy'].lower() == current_address.lower():
                        policies.append(policy)
                        
                elif current_user['role'] == 'hospital':
                    if policy['status'] == 'ACTIVE':
                        policies.append(policy)
                        
                else:
                    policies.append(policy)
                    
            except Exception as e:
                print(f"❌ Error loading policy {i}: {e}")
                continue
        
        return jsonify(policies)
    except Exception as e:
        print(f"❌ Error in get_policies: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/policies/search', methods=['GET'])
@role_required(['hospital', 'insurance'])
def search_policies():
    """Search policies by DID for hospitals"""
    did = request.args.get('did')
    
    try:
        counts = contract.functions.getTotalCounts().call()
        total_policies = counts[2]
        
        policies = []
        for i in range(1, total_policies + 1):
            try:
                policy_data = contract.functions.policies(i).call()
                
                if not policy_data[12]:
                    continue
                
                if did and policy_data[2] == did and policy_data[10] == 'ACTIVE':
                    policies.append({
                        'id': policy_data[0],
                        'policyNumber': policy_data[1],
                        'did': policy_data[2],
                        'patientName': policy_data[3],
                        'policyType': policy_data[4],
                        'coverageAmount': str(policy_data[5]),
                        'premium': str(policy_data[6]),
                        'status': policy_data[10],
                        'insuranceCompany': policy_data[9],
                        'durationMonths': policy_data[7]
                    })
            except:
                continue
        
        return jsonify(policies)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CLAIMS ENDPOINTS ====================

@app.route('/api/claims/prepare', methods=['POST'])
@role_required(['hospital'])
def prepare_claim():
    """Prepare claim with BOTH Gemini AI and ML analysis"""
    try:
        data = {}
        for key in request.form:
            data[key] = request.form[key]
        
        # Handle file uploads
        files = []
        if 'proofFiles' in request.files:
            uploaded_files = request.files.getlist('proofFiles')
            for file in uploaded_files:
                if file and file.filename:
                    file_data = file.read()
                    files.append({
                        'filename': file.filename,
                        'data': base64.b64encode(file_data).decode('utf-8'),
                        'mimetype': file.mimetype,
                        'size': len(file_data)
                    })
        
        # AI prediction with BOTH Gemini and ML
        prediction = fraud_model.predict_fraud_with_gemini(data, files)
        
        # Generate claim number
        import random
        claim_number = f"CLM{random.randint(100000, 999999)}"
        
        # Cache Gemini analysis, files, AND Gemini score
        gemini_analysis_cache[claim_number] = prediction.get('gemini_analysis', '')
        claim_files_cache[claim_number] = files
        
        # NEW: Store Gemini score separately for later retrieval
        # You can use a dictionary or database
        if not hasattr(fraud_model, 'gemini_scores_cache'):
            fraud_model.gemini_scores_cache = {}
        fraud_model.gemini_scores_cache[claim_number] = prediction.get('gemini_fraud_score', 0.5)
        
        # Calculate risk level
        fraud_prob = prediction['fraud_probability']
        if fraud_prob > 0.65:
            risk_level = 'HIGH'
        elif fraud_prob > 0.35:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # Return data for blockchain submission with ALL fields
        return jsonify({
            'claimNumber': claim_number,
            'policyId': data.get('policyId'),
            'policyNumber': data.get('policyNumber'),
            'did': data.get('did'),
            'patientName': data.get('patientName'),
            'claimType': data.get('claimType'),
            'amount': data.get('amount'),
            'description': data.get('description'),
            'hospitalName': session['user']['name'],
            'diagnosis': data.get('diagnosis'),
            'fraudScore': int(prediction['fraud_probability'] * 100),
            'isFraudulent': prediction['is_fraud'],
            'aiDecision': 'FLAGGED' if prediction['is_fraud'] else 'APPROVED',
            
            # ML-SPECIFIC FIELDS
            'mlFraudType': prediction.get('ml_fraud_type', 'N/A'),
            'mlConfidence': prediction.get('ml_confidence', 0),
            'mlAvailable': prediction.get('ml_available', False),
            'mlModelType': prediction.get('ml_model_type', 'Unknown'),
            'mlModelAccuracy': int(prediction.get('ml_model_accuracy', 0) * 100),
            
            # GEMINI FIELDS
            'geminiSuccess': prediction.get('gemini_success', False),
            'geminiScore': int(prediction.get('gemini_fraud_score', 0.5) * 100),
            
            # NEW: Risk level
            'riskLevel': risk_level,
            
            'proofFilesCount': len(files)
        })
    except Exception as e:
        print(f"❌ Error in prepare_claim: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/claims', methods=['GET'])
@login_required
def get_claims():
    """Get claims from blockchain"""
    try:
        current_user = session['user']
        current_address = Web3.to_checksum_address(current_user['wallet_address'])
        
        counts = contract.functions.getTotalCounts().call()
        total_claims = counts[3]
        
        claims = []
        
        for i in range(1, total_claims + 1):
            try:
                claim_data = contract.functions.claims(i).call()
                
                if not claim_data[21]:
                    continue
                
                # Build base claim object
                claim = {
                    'id': claim_data[0],
                    'claimNumber': claim_data[1],
                    'policyId': claim_data[2],
                    'policyNumber': claim_data[3],
                    'did': claim_data[4],
                    'patientName': claim_data[5],
                    'claimType': claim_data[6],
                    'amount': int(claim_data[7]),
                    'description': claim_data[8],
                    'hospitalName': claim_data[9],
                    'diagnosis': claim_data[10],
                    'submittedBy': claim_data[11],
                    'submittedAt': datetime.fromtimestamp(claim_data[12]).isoformat(),
                    'status': claim_data[13],
                    'fraudScore': claim_data[14] / 100.0,
                    'isFraudulent': claim_data[15],
                    'aiDecision': claim_data[16],
                    'mlFraudType': claim_data[17] if len(claim_data) > 17 else 'N/A',
                    'mlConfidence': claim_data[18] if len(claim_data) > 18 else 0,
                    'processedAt': datetime.fromtimestamp(claim_data[19]).isoformat() if claim_data[19] > 0 else None,
                    'processedBy': claim_data[20] if claim_data[20] != '0x0000000000000000000000000000000000000000' else None
                }
                
                # ============================================================
                # Calculate additional fields for frontend display
                # ============================================================
                
                # 1. Calculate Risk Level based on fraud score
                fraud_prob = claim['fraudScore']
                if fraud_prob > 0.65:
                    claim['riskLevel'] = 'HIGH'
                elif fraud_prob > 0.35:
                    claim['riskLevel'] = 'MEDIUM'
                else:
                    claim['riskLevel'] = 'LOW'
                
                # 2. Determine if ML model is available
                claim['mlAvailable'] = claim['mlFraudType'] not in ['N/A', 'UNKNOWN', 'HIDDEN', 'MODEL_NOT_TRAINED']
                
                # 3. Add ML model accuracy if available
                if claim['mlAvailable'] and ml_detector.is_trained:
                    claim['mlModelAccuracy'] = int(ml_detector.model_accuracy * 100)
                else:
                    claim['mlModelAccuracy'] = 0
                
                # 4. Get Gemini score - Try cached first, then estimate
                claim_number = claim['claimNumber']
                
                # Try to get actual cached Gemini score first (BEST APPROACH)
                if hasattr(fraud_model, 'gemini_scores_cache') and claim_number in fraud_model.gemini_scores_cache:
                    # Use the actual Gemini score that was cached during claim submission
                    claim['geminiScore'] = int(fraud_model.gemini_scores_cache[claim_number] * 100)
                else:
                    # Fallback: Reverse calculate from combined score
                    # NEW FORMULA: Combined = Gemini * 0.60 + ML * 0.40
                    # Therefore: Gemini = (Combined - ML * 0.40) / 0.60
                    if claim['mlAvailable'] and fraud_prob > 0:
                        try:
                            # Try to extract ML contribution from stored data
                            # This is an estimate - actual cached value is better
                            claim['geminiScore'] = int(fraud_prob * 100)
                        except:
                            claim['geminiScore'] = int(fraud_prob * 100)
                    else:
                        claim['geminiScore'] = int(fraud_prob * 100)
                
                # ============================================================
                # Add cached Gemini analysis and files
                # ============================================================
                
                if claim_number in gemini_analysis_cache:
                    claim['geminiAnalysis'] = gemini_analysis_cache[claim_number]
                if claim_number in claim_files_cache:
                    claim['proofFiles'] = claim_files_cache[claim_number]
                
                # Get insurance company address
                try:
                    policy_data = contract.functions.policies(claim['policyId']).call()
                    claim['insuranceCompanyAddress'] = policy_data[8]
                except:
                    pass
                
                # ============================================================
                # Filter claims based on user role
                # ============================================================
                
                should_include = False
                
                if current_user['role'] == 'patient':
                    try:
                        my_identity = contract.functions.getMyIdentity().call({'from': current_address})
                        my_did = my_identity[0]
                        if claim['did'] == my_did:
                            should_include = True
                    except:
                        pass
                
                elif current_user['role'] == 'hospital':
                    if claim['submittedBy'].lower() == current_address.lower():
                        # Hide sensitive fraud detection data from hospitals
                        claim['fraudScore'] = 0
                        claim['isFraudulent'] = False
                        claim['geminiAnalysis'] = ''
                        claim['aiDecision'] = 'PENDING'
                        claim['mlFraudType'] = 'HIDDEN'
                        claim['mlConfidence'] = 0
                        claim['mlAvailable'] = False
                        claim['riskLevel'] = 'UNKNOWN'
                        claim['geminiScore'] = 0
                        claim['mlModelAccuracy'] = 0
                        should_include = True
                
                elif current_user['role'] == 'insurance':
                    if 'insuranceCompanyAddress' in claim and claim['insuranceCompanyAddress'].lower() == current_address.lower():
                        should_include = True
                
                else:
                    should_include = True
                
                if should_include:
                    claims.append(claim)
                    
            except Exception as e:
                print(f"❌ Error processing claim {i}: {e}")
                continue
        
        return jsonify(claims)
    except Exception as e:
        print(f"❌ Error in get_claims: {e}")
        return jsonify({'error': str(e)}), 500
    

# ==================== FEDERATED LEARNING ====================
@app.route('/api/ml/train', methods=['POST'])
@role_required(['insurance', 'admin'])
def ml_train():
    """Train the ML fraud detection model"""
    try:
        data = request.json
        algorithm = data.get('algorithm', 'RandomForest')
        
        print(f"\n🚀 ML Training Request: {algorithm}")
        
        # Train model
        results = ml_detector.train_model(algorithm=algorithm)
        
        return jsonify({
            'success': True,
            'message': 'ML model trained successfully',
            'results': results
        })
        
    except Exception as e:
        print(f"❌ ML Training Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'ML model training failed'
        }), 500


@app.route('/api/ml/status', methods=['GET'])
@login_required
def ml_status():
    """Get ML model status and information"""
    try:
        model_info = ml_detector.get_model_info()
        
        return jsonify({
            'success': True,
            'model_info': model_info,
            'is_trained': model_info['is_trained'],
            'model_type': model_info['model_type'],
            'accuracy': model_info['model_accuracy'],
            'num_features': model_info['num_features']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/compare-models', methods=['POST'])
@role_required(['insurance', 'admin'])
def ml_compare_models():
    """Compare performance of different ML algorithms"""
    try:
        print(f"\n🔬 Comparing ML Models...")
        
        results = ml_detector.compare_models()
        
        return jsonify({
            'success': True,
            'message': 'Model comparison complete',
            'results': results
        })
        
    except Exception as e:
        print(f"❌ Model Comparison Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/retrain', methods=['POST'])
@role_required(['admin'])
def ml_retrain():
    """Force retrain the ML model (admin only)"""
    try:
        data = request.json
        algorithm = data.get('algorithm', 'RandomForest')
        
        # Force retrain
        ml_detector.is_trained = False
        results = ml_detector.train_model(algorithm=algorithm)
        
        return jsonify({
            'success': True,
            'message': f'ML model retrained with {algorithm}',
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    

@app.route('/api/federated-learning/status', methods=['GET'])
@role_required(['insurance', 'admin'])
def fl_status():
    """Get FL status with information about new training data"""
    status = fl_system.get_status()
    
    # Add helpful message
    if status['new_samples_available'] > 0:
        status['status_message'] = f"✅ {status['new_samples_available']} new approved/rejected claims available for training!"
    elif status['total_training_samples'] == 0:
        status['status_message'] = "⚠️ No claims processed yet. Approve or reject claims to start training."
    else:
        status['status_message'] = "✅ All claims have been trained. Waiting for new approved/rejected claims."
    
    return jsonify(status)

@app.route('/api/federated-learning/prepare-train', methods=['POST', 'OPTIONS'])
def fl_prepare_train():
    """Prepare federated learning training WITHOUT blockchain recording (frontend will handle that)"""
    # Handle OPTIONS preflight request BEFORE authentication
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200
    
    # Now check authentication for POST requests
    if 'user' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    if session['user']['role'] not in ['insurance', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        print("\n" + "="*60)
        print("🤖 FEDERATED LEARNING TRAINING REQUEST (No Blockchain)")
        print("="*60)
        
        # Get all claims from blockchain
        counts = contract.functions.getTotalCounts().call()
        total_claims = counts[3]
        
        print(f"📊 Fetching {total_claims} claims from blockchain...")
        
        claims = []
        for i in range(1, total_claims + 1):
            try:
                claim_data = contract.functions.claims(i).call()
                
                if not claim_data[21]:  # exists check
                    continue
                
                claim = {
                    'id': claim_data[0],
                    'claimNumber': claim_data[1],
                    'amount': int(claim_data[7]),
                    'description': claim_data[8],
                    'claimType': claim_data[6],
                    'status': claim_data[13],
                    'fraudScore': claim_data[14] / 100.0,
                    'mlConfidence': 0  # No ML model
                }
                
                claims.append(claim)
                
            except Exception as e:
                print(f"⚠️ Error loading claim {i}: {e}")
                continue
        
        print(f"✅ Loaded {len(claims)} claims from blockchain")
        
        # Count approved/rejected claims
        finalized_claims = [c for c in claims if c['status'] in ['APPROVED', 'REJECTED']]
        print(f"📋 Found {len(finalized_claims)} finalized claims (approved/rejected)")
        
        # Perform training round (without blockchain recording)
        result = fl_system.train_round(claims)
        
        # If training was successful, return data for frontend to record on blockchain
        if result.get('success') and result.get('nodes_participated', 0) > 0:
            print(f"✅ Training successful! Accuracy: {result['global_accuracy']:.2%}")
            print("📤 Returning data to frontend for blockchain recording...")
            print("="*60 + "\n")
            
            return jsonify({
                'success': True,
                'result': result,
                'globalAccuracy': int(result['global_accuracy'] * 100),
                'nodesParticipated': result['nodes_participated'],
                'totalSamples': result['total_samples'],
                'message': 'Training completed successfully. Ready for blockchain recording.'
            })
        else:
            # Training failed or no new data
            return jsonify({
                'success': False,
                'message': result.get('message', 'No new data available for training'),
                'result': result
            }), 400
        
    except Exception as e:
        print(f"❌ Error in federated learning: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Federated learning training failed'
        }), 500

@app.route('/api/federated-learning/train', methods=['POST'])
@role_required(['insurance', 'admin'])
def fl_train():
    """Start federated learning training round on blockchain claims"""
    try:
        print("\n" + "="*60)
        print("🤖 FEDERATED LEARNING TRAINING REQUEST")
        print("="*60)
        
        # Get all claims from blockchain
        counts = contract.functions.getTotalCounts().call()
        total_claims = counts[3]
        
        print(f"📊 Fetching {total_claims} claims from blockchain...")
        
        claims = []
        for i in range(1, total_claims + 1):
            try:
                claim_data = contract.functions.claims(i).call()
                
                if not claim_data[21]:  # exists check
                    continue
                
                claim = {
                    'id': claim_data[0],
                    'claimNumber': claim_data[1],
                    'amount': int(claim_data[7]),
                    'description': claim_data[8],
                    'claimType': claim_data[6],
                    'status': claim_data[13],
                    'fraudScore': claim_data[14] / 100.0,
                    'mlConfidence': 0  # No ML model
                }
                
                claims.append(claim)
                
            except Exception as e:
                print(f"⚠️ Error loading claim {i}: {e}")
                continue
        
        print(f"✅ Loaded {len(claims)} claims from blockchain")
        
        # Count approved/rejected claims
        finalized_claims = [c for c in claims if c['status'] in ['APPROVED', 'REJECTED']]
        print(f"📋 Found {len(finalized_claims)} finalized claims (approved/rejected)")
        
        # Perform training round
        result = fl_system.train_round(claims)
        
        # If training was successful, record on blockchain
        if result.get('success') and result.get('nodes_participated', 0) > 0:
            try:
                # Record training round on blockchain
                current_user = session['user']
                current_address = Web3.to_checksum_address(current_user['wallet_address'])
                
                tx = contract.functions.recordTrainingRound(
                    int(result['global_accuracy'] * 100),
                    result['nodes_participated'],
                    result['total_samples']
                ).send({'from': current_address})
                
                result['blockchain_tx'] = tx.transactionHash.hex()
                print(f"✅ Training round recorded on blockchain: {result['blockchain_tx']}")
                
            except Exception as blockchain_error:
                print(f"⚠️ Could not record on blockchain: {blockchain_error}")
                result['blockchain_warning'] = str(blockchain_error)
        
        print("="*60 + "\n")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error in federated learning: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Federated learning training failed'
        }), 500

@app.route('/api/federated-learning/history', methods=['GET'])
@role_required(['insurance', 'admin'])
def fl_history():
    """Get federated learning training history"""
    status = fl_system.get_status()
    return jsonify({
        'training_history': status.get('training_history', []),
        'total_rounds': status.get('rounds_completed', 0),
        'current_accuracy': status.get('global_accuracy', 0)
    })

@app.route('/api/federated-learning/reset', methods=['POST'])
@role_required(['admin'])
def fl_reset():
    """Reset federated learning system (admin only)"""
    try:
        fl_system.reset()
        return jsonify({
            'success': True,
            'message': 'Federated learning system reset successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== ANALYTICS ====================

@app.route('/api/analytics', methods=['GET'])
@login_required
def get_analytics():
    """Get analytics from blockchain with proper patient filtering"""
    try:
        current_user = session['user']
        current_address = Web3.to_checksum_address(current_user['wallet_address'])
        
        counts = contract.functions.getTotalCounts().call()
        total_claims = counts[3]
        total_policies = counts[2]
        
        fraudulent_count = 0
        approved_count = 0
        pending_count = 0
        rejected_count = 0
        active_policies = 0
        total_coverage = 0
        approved_amount = 0
        pending_amount = 0
        
        patient_did = None
        if current_user['role'] == 'patient':
            try:
                my_identity = contract.functions.getMyIdentity().call({'from': current_address})
                patient_did = my_identity[0]
                print(f"📊 Patient DID for analytics: {patient_did}")
            except Exception as e:
                print(f"⚠️ Could not get patient DID: {e}")
                return jsonify({
                    'total_users': counts[0],
                    'total_identities': counts[1],
                    'total_policies': 0,
                    'active_policies': 0,
                    'total_claims': 0,
                    'fraudulent_claims': 0,
                    'flagged_claims': 0,
                    'approved_claims': 0,
                    'pending_claims': 0,
                    'rejected_claims': 0,
                    'fraud_rate': 0,
                    'fl_rounds': counts[4],
                    'total_coverage': 0,
                    'approved_amount': 0,
                    'pending_amount': 0,
                    'avg_processing_days': 0
                })
        
        for i in range(1, total_policies + 1):
            try:
                policy = contract.functions.policies(i).call()
                if not policy[12]:
                    continue
                
                should_count = False
                
                if current_user['role'] == 'patient':
                    if patient_did and policy[2] == patient_did:
                        should_count = True
                elif current_user['role'] == 'insurance':
                    if policy[8].lower() == current_address.lower():
                        should_count = True
                else:
                    should_count = True
                
                if should_count:
                    if policy[10] == "ACTIVE":
                        active_policies += 1
                        try:
                            total_coverage += int(policy[5])
                        except:
                            pass
                            
            except Exception as e:
                print(f"⚠️ Error processing policy {i}: {e}")
                continue
        
        for i in range(1, total_claims + 1):
            try:
                claim = contract.functions.claims(i).call()
                if not claim[21]:
                    continue
                
                should_count = False
                
                if current_user['role'] == 'patient':
                    if patient_did and claim[4] == patient_did:
                        should_count = True
                elif current_user['role'] == 'hospital':
                    if claim[11].lower() == current_address.lower():
                        should_count = True
                elif current_user['role'] == 'insurance':
                    try:
                        policy = contract.functions.policies(claim[2]).call()
                        if policy[8].lower() == current_address.lower():
                            should_count = True
                    except:
                        pass
                else:
                    should_count = True
                
                if should_count:
                    if claim[15]:
                        fraudulent_count += 1
                    
                    claim_amount = int(claim[7])
                    
                    if claim[13] == "APPROVED":
                        approved_count += 1
                        approved_amount += claim_amount
                    elif claim[13] == "PENDING":
                        pending_count += 1
                        pending_amount += claim_amount
                    elif claim[13] == "REJECTED":
                        rejected_count += 1
                        
            except Exception as e:
                print(f"⚠️ Error processing claim {i}: {e}")
                continue
        
        total_counted_claims = approved_count + pending_count + rejected_count
        total_counted_policies = active_policies
        fraud_rate = (fraudulent_count / total_counted_claims * 100) if total_counted_claims > 0 else 0
        
        return jsonify({
            'total_users': counts[0],
            'total_identities': counts[1],
            'total_policies': total_counted_policies,
            'active_policies': active_policies,
            'total_claims': total_counted_claims,
            'fraudulent_claims': fraudulent_count,
            'flagged_claims': fraudulent_count,
            'approved_claims': approved_count,
            'pending_claims': pending_count,
            'rejected_claims': rejected_count,
            'fraud_rate': fraud_rate,
            'fl_rounds': counts[4],
            'total_coverage': total_coverage,
            'approved_amount': approved_amount,
            'pending_amount': pending_amount,
            'avg_processing_days': 0
        })
    except Exception as e:
        print(f"❌ Error in analytics: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check with ML status"""
    ml_info = ml_detector.get_model_info()
    
    return jsonify({
        'status': 'healthy',
        'blockchain_connected': w3.is_connected(),
        'contract_loaded': contract is not None,
        'gemini_ai_enabled': True,
        'gemini_model': 'gemini-2.5-flash',
        'ml_model_enabled': ml_info['is_trained'],
        'ml_model_type': ml_info.get('model_type', 'Not Trained'),
        'ml_model_accuracy': ml_info.get('model_accuracy', 0),
        'data_source': 'BLOCKCHAIN_ONLY'
    })

if __name__ == '__main__':
    print("="*60)
    print("Insurance Fraud Detection System - Dual AI (Gemini + ML)")
    print("="*60)
    
    if load_contract():
        print("✅ Smart Contract Loaded Successfully")
    else:
        print("⚠️  Deploy smart contracts first: truffle migrate --reset")
    
    print("✅ Gemini AI Enabled (gemini-2.5-flash)")
    
    # Check ML model status
    ml_info = ml_detector.get_model_info()
    if ml_info['is_trained']:
        print(f"✅ ML Model Enabled: {ml_info['model_type']}")
        print(f"   Accuracy: {ml_info['model_accuracy']:.2%}")
    else:
        print("⚠️  ML Model: Not trained yet")
        print("   Train via: POST /api/ml/train")
    
    print("✅ ALL data retrieved from blockchain")
    print("="*60)
    print("Starting Flask server on http://localhost:5000")
    print("="*60)
    app.run(debug=True, port=5000)