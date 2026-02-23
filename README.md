# 12thManArmy
# 🏥 Insurance Fraud Detection System

A full-stack blockchain-based insurance fraud detection platform combining **Self-Sovereign Identity (SSI)**, **Gemini AI multimodal analysis**, **ML-based fraud classification**, and **Federated Learning** — all anchored to an Ethereum smart contract.

---
## Overview

This system digitises and secures the insurance claim lifecycle — from patient identity creation to claim submission and fraud analysis — on a private Ethereum blockchain. Every policy, identity, and claim is stored immutably on-chain, while AI models run off-chain to score each claim for fraud before it reaches a human reviewer.

**Key goals:**
- Eliminate paper-based claim fraud through document verification via Gemini AI
- Provide explainable fraud scores combining deep-learning (Gemini) and classical ML
- Give patients control over their own identity through SSI / DIDs
- Continuously improve fraud detection through federated learning on approved/rejected claims

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (localhost:3000)                            │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                  Flask Backend                           │
│              (localhost:5000)                            │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Gemini AI  │  │  ML Detector │  │  Federated    │  │
│  │  (60% wt.)  │  │  (40% wt.)   │  │  Learning     │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐                      │
│  │  SSI System │  │  PDF Extract │                      │
│  │  (DID/VC)   │  │  (fallback)  │                      │
│  └─────────────┘  └──────────────┘                      │
└────────────────────────┬────────────────────────────────┘
                         │ Web3 / RPC
┌────────────────────────▼────────────────────────────────┐
│           Ganache / Private Ethereum Node                │
│              (localhost:7550)                            │
│                                                          │
│         InsuranceClaim.sol Smart Contract                │
│   (Users · Identities · Policies · Claims · FL Rounds)  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, MetaMask |
| Backend | Python 3, Flask, Flask-CORS |
| Blockchain | Solidity, Truffle, Ganache, Web3.py |
| AI — Multimodal | Google Gemini 2.5 Flash |
| AI — Classical ML | scikit-learn, imbalanced-learn (SMOTE) |
| PDF Extraction | pdfplumber, pypdf |
| Identity | Custom SSI / W3C Verifiable Credentials |
| Federated Learning | Custom simulation (5 federated nodes) |
| Data | insurance_claims.csv (training dataset) |

---

## Features

### 🔐 Self-Sovereign Identity (SSI)
- Patients generate a W3C-compliant Decentralised Identifier (DID)
- Verifiable Credentials signed with Ed25519 proof
- Identity stored on-chain; only the patient controls access

### 📄 Policy Management
- Insurance companies issue policies linked to a patient DID
- Policy details (coverage, premium, duration) recorded on blockchain
- Hospitals can search active policies by DID before submitting a claim

### 🤖 Dual AI Fraud Detection
- **Gemini 2.5 Flash (60% weight):** reads uploaded PDFs and images, cross-references document content against claim details, produces a 0–100% fraud risk score with a detailed written analysis
- **ML Model (40% weight):** trained on a labelled insurance claims dataset using RandomForest / GradientBoosting / etc.; scores based on numerical features (amount, claim type, demographics)
- **PDF Fallback:** if Gemini's native PDF reader fails (e.g. "no pages" error), text is extracted locally with `pdfplumber` / `pypdf` and injected into the prompt

### 🔗 Blockchain Claim Storage
- Every claim submission writes fraud score, ML fraud type, AI decision, and metadata to the smart contract
- Immutable audit trail for regulators and insurers

### 🌐 Federated Learning
- Trains on approved / rejected claims from the blockchain (never on raw patient data)
- Simulates 5 federated nodes (hospitals + insurers)
- Weighted global model aggregation; history stored in `fl_state.pkl`

### 📊 Role-Based Analytics Dashboard
- Different analytics views for patients, hospitals, insurance companies
- Fraud rate, claim volume, coverage totals, FL training rounds

---

## Project Structure

```
project-root/
│
├── backend/
│   ├── app.py                  # Flask API server — all REST endpoints
│   ├── ai_model.py             # Gemini + ML dual fraud detection engine
│   ├── ml_learning.py          # ML model training, prediction, persistence
│   ├── federated_learning.py   # Federated learning simulation
│   ├── ssi.py                  # SSI / DID / Verifiable Credential system
│   ├── blockchain.py           # Custom lightweight blockchain (demo)
│   ├── insurance_claims.csv    # Training dataset
│   ├── fl_state.pkl            # Federated learning persisted state
│   └── ml_models/              # Saved ML model artefacts
│       ├── fraud_model.pkl
│       ├── scaler.pkl
│       ├── label_encoders.pkl
│       └── metadata.pkl
│
├── blockchain/
│   ├── contracts/
│   │   └── InsuranceClaim.sol  # Main Solidity smart contract
│   ├── migrations/
│   └── build/contracts/        # Truffle compiled output (auto-generated)
│
└── frontend/
    ├── src/
    │   ├── components/
    │   └── pages/
    └── package.json
```

---

## Prerequisites

- **Node.js** v16+ and npm
- **Python** 3.9+
- **Truffle** — `npm install -g truffle`
- **Ganache** (GUI or CLI) running on port `7550`
- **MetaMask** browser extension
- A **Google Gemini API key** ([get one here](https://aistudio.google.com/app/apikey))

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/insurance-fraud-detection.git
cd insurance-fraud-detection
```

### 2. Backend dependencies

```bash
cd backend
pip install flask flask-cors web3 google-genai \
            scikit-learn imbalanced-learn pandas numpy \
            pdfplumber pypdf python-dateutil
```

### 3. Frontend dependencies

```bash
cd frontend
npm install
```

### 4. Blockchain setup

```bash
cd blockchain
npm install
```

---

## Configuration

### Gemini API Key

Open `backend/app.py` and replace the key:

```python
GEMINI_API_KEY = "your-gemini-api-key-here"
```

### Ganache RPC URL

Default is `http://127.0.0.1:7550`. Change in `app.py` if different:

```python
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:7550'))
```

### Frontend origin (CORS)

```python
CORS(app, supports_credentials=True, origins=['http://localhost:3000'])
```

---

## Running the Application

### Step 1 — Start Ganache

Start Ganache on port `7550` with a known mnemonic so accounts are consistent across restarts.

### Step 2 — Deploy Smart Contracts

```bash
cd blockchain
truffle migrate --reset
```

### Step 3 — Start Flask Backend

```bash
cd backend
python app.py
# Server starts on http://localhost:5000
```

### Step 4 — Train the ML Model (first run only)

```bash
curl -X POST http://localhost:5000/api/ml/train \
     -H "Content-Type: application/json" \
     -d '{"algorithm": "RandomForest"}'
```

Or use the dashboard UI after logging in as insurance/admin.

### Step 5 — Start React Frontend

```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### Step 6 — Connect MetaMask

- Add a custom network pointing to Ganache (`http://127.0.0.1:7550`, Chain ID from Ganache)
- Import a Ganache account using its private key

---
