import numpy as np
import random
from datetime import datetime
import base64
import io
import pypdf
# PDF extraction libraries (fallback when Gemini can't read PDF directly)
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF given its raw bytes.
    Tries pdfplumber first (better layout handling), falls back to pypdf.

    Args:
        pdf_bytes: Raw PDF file bytes

    Returns:
        Extracted text string, or empty string if extraction fails.
    """
    extracted_text = ""

    # --- Attempt 1: pdfplumber ---
    if PDFPLUMBER_AVAILABLE:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                pages_text = []
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        pages_text.append(f"[Page {page_num}]\n{text.strip()}")
                extracted_text = "\n\n".join(pages_text)
            if extracted_text.strip():
                print(f"      📄 pdfplumber: extracted {len(extracted_text)} chars from {len(pdf.pages)} pages")
                return extracted_text
        except Exception as e:
            print(f"      ⚠️  pdfplumber failed: {e}")

    # --- Attempt 2: pypdf ---
    if PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages_text = []
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text:
                    pages_text.append(f"[Page {page_num}]\n{text.strip()}")
            extracted_text = "\n\n".join(pages_text)
            if extracted_text.strip():
                print(f"      📄 pypdf: extracted {len(extracted_text)} chars from {len(reader.pages)} pages")
                return extracted_text
        except Exception as e:
            print(f"      ⚠️  pypdf failed: {e}")

    print("      ⚠️  All PDF text extraction methods failed — PDF may be scanned/image-based")
    return ""


class FraudDetectionModel:
    """AI model with Gemini integration and ML model for fraud detection"""

    def __init__(self, genai_client, ml_detector=None):
        self.genai_client = genai_client
        self.ml_detector = ml_detector
        self.model_accuracy = 0.85
        self.predictions_count = 0

        self.fraud_indicators = {
            'high_amount': 0.3,
            'duplicate_claim': 0.4,
            'suspicious_timing': 0.2,
            'incomplete_info': 0.25,
            'new_identity': 0.15
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict_fraud_with_gemini_and_ml(self, claim_data, proof_files=None):
        """
        Predict fraud using BOTH Gemini AI and ML model.

        Strategy for PDFs:
          1. Try to send PDF inline (Gemini native multimodal).
          2. If Gemini raises INVALID_ARGUMENT / 'no pages' error, extract the
             text locally with pdfplumber / pypdf and inject it into the prompt.

        Returns:
            dict: Combined prediction results from both Gemini and ML.
        """
        self.predictions_count += 1

        amount = float(claim_data.get('amount', 0))
        claim_type = claim_data.get('claimType', '')
        description = claim_data.get('description', '')
        diagnosis = claim_data.get('diagnosis', '')
        patient_name = claim_data.get('patientName', '')

        print(f"\n{'='*60}")
        print(f"🔍 DUAL FRAUD DETECTION: Gemini AI + ML Model")
        print(f"{'='*60}")
        print(f"   Patient: {patient_name}")
        print(f"   Amount: ₹{amount}")
        print(f"   Claim Type: {claim_type}")
        print(f"   Files: {len(proof_files) if proof_files else 0}")

        # ==================== ML MODEL PREDICTION ====================
        ml_prediction = self._run_ml_prediction(claim_data)

        # ==================== GEMINI AI PREDICTION ====================
        print(f"\n🤖 Running Gemini AI Analysis...")
        gemini_analysis, gemini_fraud_score, gemini_success = self._run_gemini_prediction(
            claim_data, proof_files
        )

        # ==================== COMBINE PREDICTIONS ====================
        print(f"\n📊 Combining Predictions...")
        if ml_prediction.get('ml_available'):
            combined_fraud_score = (
                gemini_fraud_score * 0.60 +
                ml_prediction['ml_fraud_probability'] * 0.40
            )
            print(f"   - Gemini Score: {gemini_fraud_score:.2%} (60% weight) ⭐ PRIMARY")
            print(f"   - ML Score: {ml_prediction['ml_fraud_probability']:.2%} (40% weight)")
            print(f"   - Combined Score: {combined_fraud_score:.2%}")
            print(f"   ℹ️  Gemini has priority because it can read and analyse documents")
        else:
            combined_fraud_score = gemini_fraud_score
            print(f"   - Using Gemini Score only: {gemini_fraud_score:.2%}")

        is_fraud = combined_fraud_score > 0.5
        confidence = abs(combined_fraud_score - 0.5) * 2
        indicators_found = self._check_traditional_indicators(claim_data)

        print(f"\n{'='*60}")
        print(f"✅ FINAL RESULT:")
        print(f"   Is Fraud: {is_fraud}")
        print(f"   Fraud Probability: {combined_fraud_score:.2%}")
        print(f"   Confidence: {confidence:.2%}")
        print(f"   Risk Level: {self._get_risk_level(combined_fraud_score)}")
        print(f"{'='*60}\n")

        result = {
            'is_fraud': is_fraud,
            'fraud_probability': round(combined_fraud_score, 4),
            'confidence': round(confidence, 4),
            'risk_level': self._get_risk_level(combined_fraud_score),
            'indicators': indicators_found,
            'gemini_analysis': gemini_analysis,
            'gemini_fraud_score': round(gemini_fraud_score, 4),
            'gemini_success': gemini_success,
            'has_proof_files': len(proof_files) if proof_files else 0,
            'model_version': '3.2.0-Gemini-Priority-PDFExtract',
            'prediction_timestamp': datetime.now().isoformat()
        }

        if ml_prediction.get('ml_available'):
            result.update({
                'ml_available': True,
                'ml_fraud_type': ml_prediction['ml_fraud_type'],
                'ml_confidence': ml_prediction['ml_confidence'],
                'ml_model_type': ml_prediction.get('ml_model_type', 'Unknown'),
                'ml_model_accuracy': round(ml_prediction.get('ml_model_accuracy', 0), 4),
                'ml_fraud_probability': round(ml_prediction['ml_fraud_probability'], 4)
            })
        else:
            result.update({
                'ml_available': False,
                'ml_fraud_type': ml_prediction.get('ml_fraud_type', 'N/A'),
                'ml_confidence': 0
            })

        return result

    # Backward-compatible alias
    def predict_fraud_with_gemini(self, claim_data, proof_files=None):
        return self.predict_fraud_with_gemini_and_ml(claim_data, proof_files)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _run_ml_prediction(self, claim_data):
        """Run ML model prediction and return standardised result dict."""
        ml_prediction = {'ml_available': False}

        if self.ml_detector and self.ml_detector.is_trained:
            print(f"\n🤖 Running ML Model Prediction...")
            try:
                ml_result = self.ml_detector.predict_fraud(claim_data)
                ml_prediction = {
                    'ml_available': True,
                    'ml_fraud_probability': ml_result['fraud_probability'],
                    'ml_is_fraud': ml_result['is_fraud'],
                    'ml_fraud_type': ml_result['ml_fraud_type'],
                    'ml_confidence': ml_result['ml_confidence'],
                    'ml_model_type': ml_result.get('model_type', 'Unknown'),
                    'ml_model_accuracy': ml_result.get('model_accuracy', 0)
                }
                print(f"   ✅ ML Prediction Complete")
                print(f"   - Fraud Probability: {ml_result['fraud_probability']:.2%}")
                print(f"   - Fraud Type: {ml_result['ml_fraud_type']}")
                print(f"   - Confidence: {ml_result['ml_confidence']}%")
                print(f"   ⚠️  Note: ML model only uses numerical features (amount, age, etc.)")
                print(f"   ⚠️  ML cannot read or verify documents - relies on Gemini for that")
            except Exception as ml_error:
                print(f"   ⚠️ ML Prediction Error: {ml_error}")
                ml_prediction = {'ml_available': False, 'ml_error': str(ml_error)}
        else:
            print(f"   ℹ️  ML Model not available or not trained")
            ml_prediction = {
                'ml_available': False,
                'ml_fraud_type': 'ML_MODEL_NOT_TRAINED',
                'ml_confidence': 0
            }

        return ml_prediction

    # ------------------------------------------------------------------
    # Gemini prediction — with PDF text extraction fallback
    # ------------------------------------------------------------------

    def _run_gemini_prediction(self, claim_data, proof_files):
        """
        Send claim data + files to Gemini.

        For each PDF file:
          1. Try inline multimodal (native PDF support).
          2. On INVALID_ARGUMENT / 'no pages' error, extract text locally and
             embed it in the prompt text instead.

        Returns:
            (gemini_analysis: str, gemini_fraud_score: float, gemini_success: bool)
        """
        print(f"   - Mode: {'Multimodal (PDFs + Images)' if proof_files and len(proof_files) > 0 else 'Text-only'}")
        print(f"   - Model: gemini-2.5-flash")

        gemini_analysis = ""
        gemini_fraud_score = 0.5
        gemini_success = False

        # Pre-process files: separate inline-capable vs text-extracted PDFs
        inline_parts = []          # Will be sent as inline_data blobs
        extracted_pdf_texts = []   # Text from PDFs that failed inline
        image_count = 0
        pdf_inline_count = 0

        if proof_files:
            for idx, file_info in enumerate(proof_files[:5], 1):
                mime_type = file_info['mimetype']
                filename = file_info['filename']
                # base64-encoded string → bytes
                try:
                    file_bytes = base64.b64decode(file_info['data'])
                except Exception:
                    print(f"   ⚠️ Could not decode file: {filename}")
                    continue

                if mime_type == 'application/pdf':
                    inline_parts.append({
                        '_type': 'pdf',
                        'filename': filename,
                        'data': file_info['data'],   # keep as base64 str for API
                        'bytes': file_bytes
                    })
                    pdf_inline_count += 1
                elif mime_type.startswith('image/'):
                    inline_parts.append({
                        '_type': 'image',
                        'filename': filename,
                        'mime_type': mime_type,
                        'data': file_info['data']
                    })
                    image_count += 1
                else:
                    print(f"   ⚠️ Unsupported file type: {mime_type} - {filename}")

        # Build initial prompt (without extracted PDF texts; we'll add them if needed)
        prompt_base = self._build_gemini_prompt_with_files(claim_data, proof_files)

        try:
            response_text, success = self._call_gemini(
                prompt_base, inline_parts, extracted_pdf_texts, claim_data
            )
            gemini_analysis = response_text
            gemini_success = success
        except Exception as e:
            error_str = str(e)
            print(f"   ❌ Gemini Error: {type(e).__name__}: {error_str}")

            # ---- PDF fallback: extract text locally and retry ----
            if 'no pages' in error_str.lower() or 'INVALID_ARGUMENT' in error_str:
                print(f"\n   🔄 Gemini could not read PDF inline. Extracting text locally…")
                extracted_pdf_texts = self._extract_all_pdf_texts(inline_parts)

                # Remove PDFs from inline parts so we don't trigger the error again
                inline_parts_no_pdf = [p for p in inline_parts if p['_type'] != 'pdf']

                if extracted_pdf_texts:
                    print(f"   ✅ Text extracted from {len(extracted_pdf_texts)} PDF(s) — retrying Gemini…")
                    try:
                        response_text, success = self._call_gemini(
                            prompt_base, inline_parts_no_pdf, extracted_pdf_texts, claim_data
                        )
                        gemini_analysis = response_text
                        gemini_success = success
                    except Exception as retry_err:
                        print(f"   ❌ Retry also failed: {retry_err}")
                        gemini_analysis, gemini_fraud_score = self._fallback_analysis(
                            claim_data, proof_files, str(retry_err)
                        )
                else:
                    print(f"   ⚠️ PDF text extraction also failed — using fallback analysis")
                    gemini_analysis, gemini_fraud_score = self._fallback_analysis(
                        claim_data, proof_files, error_str
                    )
            else:
                gemini_analysis, gemini_fraud_score = self._fallback_analysis(
                    claim_data, proof_files, error_str
                )

        if gemini_success:
            print(f"   ✅ Gemini Analysis Complete ({len(gemini_analysis)} chars)")
            gemini_fraud_score = self._calculate_fraud_score_from_gemini(
                gemini_analysis, claim_data, proof_files
            )

        return gemini_analysis, gemini_fraud_score, gemini_success

    def _call_gemini(self, prompt_base, inline_parts, extracted_pdf_texts, claim_data):
        """
        Actually call the Gemini API.

        If extracted_pdf_texts is non-empty, we append the text to the prompt
        rather than sending the PDF blob.

        Returns (response_text, success_bool)
        """
        # Build final prompt, injecting extracted PDF text if available
        prompt = prompt_base
        if extracted_pdf_texts:
            pdf_section = "\n\n" + "=" * 60 + "\n"
            pdf_section += "📄 EXTRACTED TEXT FROM PDF DOCUMENTS\n"
            pdf_section += "(Gemini could not read the PDF natively; text extracted locally)\n"
            pdf_section += "=" * 60 + "\n"
            for doc_name, doc_text in extracted_pdf_texts:
                pdf_section += f"\n--- {doc_name} ---\n{doc_text}\n"
            prompt = prompt_base + pdf_section

        # Build parts list for multimodal request
        has_inline = any(p['_type'] == 'image' for p in inline_parts)

        if has_inline or extracted_pdf_texts:
            parts = [{"text": prompt}]
            for part in inline_parts:
                if part['_type'] == 'image':
                    print(f"   🖼️  Adding image inline: {part['filename']}")
                    parts.append({
                        "inline_data": {
                            "mime_type": part['mime_type'],
                            "data": part['data']
                        }
                    })
                elif part['_type'] == 'pdf':
                    # Only include if we're not using text-extraction fallback
                    if not extracted_pdf_texts:
                        print(f"   📄 Adding PDF inline: {part['filename']}")
                        parts.append({
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": part['data']
                            }
                        })

            print(f"   📊 Sending to Gemini: multimodal ({len(parts)} parts)")
            response = self.genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=parts
            )
        else:
            # Text-only
            print(f"   📊 Sending to Gemini: text-only")
            response = self.genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

        return response.text, True

    def _extract_all_pdf_texts(self, inline_parts):
        """
        For every PDF part in inline_parts, attempt local text extraction.

        Returns:
            list of (filename, extracted_text) tuples (only non-empty entries)
        """
        results = []
        for part in inline_parts:
            if part['_type'] != 'pdf':
                continue
            filename = part['filename']
            print(f"      🔍 Extracting text from: {filename}")
            text = extract_text_from_pdf_bytes(part['bytes'])
            if text.strip():
                results.append((filename, text))
                print(f"      ✅ Extracted {len(text)} characters from {filename}")
            else:
                print(f"      ⚠️  No text found in {filename} (may be scanned/image PDF)")
                # Still include a note so Gemini knows the file existed
                results.append((filename, "[PDF appears to be scanned / image-only — no text could be extracted]"))
        return results

    def _fallback_analysis(self, claim_data, proof_files, error_str):
        """Return a fallback analysis string and basic fraud score."""
        fraud_score = self._basic_fraud_detection(claim_data)
        amount = float(claim_data.get('amount', 0))
        patient_name = claim_data.get('patientName', 'N/A')
        claim_type = claim_data.get('claimType', 'N/A')
        diagnosis = claim_data.get('diagnosis', 'N/A')
        description = claim_data.get('description', '')

        analysis = f"""⚠️ Gemini AI analysis temporarily unavailable

Error: {error_str}

**FALLBACK ANALYSIS - Basic Fraud Detection**

**Claim Summary:**
- Patient: {patient_name}
- Claim Amount: ₹{amount}
- Claim Type: {claim_type}
- Diagnosis: {diagnosis}
- Description Length: {len(description)} characters
- Documentation: {len(proof_files) if proof_files else 0} file(s) uploaded

**Automated Risk Assessment:**
{self._generate_basic_analysis(claim_data, proof_files)}

**Recommendation:** Manual review strongly recommended due to AI system unavailability."""

        return analysis, fraud_score

    # ------------------------------------------------------------------
    # Prompt builder
    # ------------------------------------------------------------------

    def _build_gemini_prompt_with_files(self, claim_data, proof_files):
        """Build comprehensive prompt for Gemini AI with file context."""
        has_files = proof_files and len(proof_files) > 0

        file_info = ""
        if has_files:
            file_info = f"\n**UPLOADED MEDICAL DOCUMENTS ({len(proof_files)} files):**\n"
            for idx, file in enumerate(proof_files[:5], 1):
                file_info += f"{idx}. {file['filename']} ({file['mimetype']}, {file['size']/1024:.1f} KB)\n"

            has_pdfs = any(f['mimetype'] == 'application/pdf' for f in proof_files)
            has_images = any(f['mimetype'].startswith('image/') for f in proof_files)

            file_info += f"\n**IMPORTANT:** "
            if has_pdfs and has_images:
                file_info += "Analyse BOTH the PDF documents AND images. Extract text from PDFs and examine image content.\n"
            elif has_pdfs:
                file_info += "Read and analyse the PDF document(s) thoroughly. Extract all text and verify against claim details.\n"
            elif has_images:
                file_info += "Examine the uploaded image(s) carefully. Look for bill details, prescriptions, or medical reports.\n"

            file_info += "Verify if the documents support the claimed diagnosis and amount.\n"
        else:
            file_info = "\n⚠️ **NO MEDICAL DOCUMENTS UPLOADED** - This is a CRITICAL fraud risk factor.\n"

        prompt = f"""You are an expert medical insurance fraud detection AI. Conduct a thorough analysis of this insurance claim.

**CLAIM DETAILS:**
- Patient Name: {claim_data.get('patientName', 'N/A')}
- Claim Type: {claim_data.get('claimType', 'N/A')}
- Amount Claimed: ₹{claim_data.get('amount', 0)}
- Diagnosis: {claim_data.get('diagnosis', 'N/A')}
- Policy Number: {claim_data.get('policyNumber', 'N/A')}
- Hospital: {claim_data.get('hospitalName', 'Medical Facility')}
{file_info}
**DETAILED DESCRIPTION:**
{claim_data.get('description', 'No description provided')}

**YOUR COMPREHENSIVE ANALYSIS TASK:**

1. **PDF & Document Verification** (CRITICAL - if files/text provided):
   - READ all PDF documents or extracted text completely
   - VERIFY medical bills match the claimed amount exactly
   - CHECK if prescriptions align with the stated diagnosis
   - EXAMINE lab reports or medical records for consistency
   - LOOK for signs of document tampering or alterations
   - CROSS-REFERENCE all document details with claim information

2. **Image Analysis** (if images provided):
   - EXAMINE bill images for authenticity
   - VERIFY prescription images match diagnosis
   - CHECK for photo manipulation or editing

3. **Medical Consistency Check**:
   - Does the claimed amount match typical costs for this diagnosis?
   - Is the diagnosis consistent with described treatment?

4. **Fraud Pattern Detection**:
   - Overbilling indicators (amount vs actual treatment)
   - Suspicious claim patterns
   - Missing critical information
   - Inconsistencies between documents and claim description

5. **Documentation Quality Assessment**:
   - Completeness of claim description
   - Quality and authenticity of supporting documents

**PROVIDE YOUR ANALYSIS IN THIS EXACT FORMAT:**

FRAUD RISK ASSESSMENT: [0-100]%

DOCUMENT VERIFICATION:
[Detailed analysis of document content; note if no documents were provided]

MEDICAL CONSISTENCY CHECK:
[Evaluate if diagnosis matches treatment and costs]

RED FLAGS IDENTIFIED:
- [List any suspicious patterns - one per line]

POSITIVE INDICATORS:
- [List elements that support claim legitimacy - one per line]

RECOMMENDATION: [APPROVE / REQUIRES_REVIEW / REJECT]

DETAILED EXPLANATION:
[4-5 sentences explaining your fraud risk assessment based on ALL evidence]

**CRITICAL INSTRUCTIONS:**
- Return ONLY the analysis text in the format above
- DO NOT include code or markdown code blocks
- Focus on medical and insurance analysis based on actual document content
- Be thorough - this is critical for preventing fraud"""

        return prompt

    # ------------------------------------------------------------------
    # Score extraction & basic detection
    # ------------------------------------------------------------------

    def _calculate_fraud_score_from_gemini(self, gemini_response, claim_data, proof_files):
        """Extract fraud score from Gemini response."""
        fraud_score = 0.5

        try:
            import re
            score_patterns = [
                r'FRAUD RISK ASSESSMENT:\s*(\d+)%',
                r'FRAUD RISK SCORE:\s*(\d+)%',
                r'RISK SCORE:\s*(\d+)%',
                r'FRAUD PROBABILITY:\s*(\d+)%'
            ]
            for pattern in score_patterns:
                match = re.search(pattern, gemini_response, re.IGNORECASE)
                if match:
                    fraud_score = int(match.group(1)) / 100.0
                    print(f"   📊 Extracted Gemini score: {fraud_score:.2%}")
                    break
        except Exception as e:
            print(f"   ⚠️ Error parsing Gemini score: {e}")

        response_lower = gemini_response.lower()
        if 'reject' in response_lower or 'fraudulent' in response_lower:
            fraud_score = max(fraud_score, 0.70)
        if 'requires_review' in response_lower or 'suspicious' in response_lower:
            fraud_score = max(fraud_score, 0.50)
        if 'approve' in response_lower and 'legitimate' in response_lower:
            fraud_score = min(fraud_score, 0.30)

        if not proof_files or len(proof_files) == 0:
            fraud_score = max(fraud_score, 0.65)
        elif len(proof_files) >= 3:
            fraud_score *= 0.75

        description = claim_data.get('description', '')
        if len(description) > 150:
            fraud_score *= 0.90
        elif len(description) < 50:
            fraud_score = max(fraud_score, 0.55)

        fraud_score = max(0.0, min(1.0, fraud_score))
        print(f"   📊 Final Gemini fraud score: {fraud_score:.2%}")
        return fraud_score

    def _basic_fraud_detection(self, claim_data):
        """Fallback basic fraud detection when Gemini unavailable."""
        amount = float(claim_data.get('amount', 0))
        description = claim_data.get('description', '')
        fraud_score = 0.0

        if amount > 100000:
            fraud_score += 0.4
        elif amount > 50000:
            fraud_score += 0.3
        elif amount > 25000:
            fraud_score += 0.15

        if len(description) < 30:
            fraud_score += 0.30
        elif len(description) < 100:
            fraud_score += 0.15

        suspicious_keywords = ['urgent', 'emergency', 'immediate', 'cash', 'asap']
        fraud_score += sum(0.1 for kw in suspicious_keywords if kw in description.lower())

        medical_terms = ['procedure', 'treatment', 'medication', 'surgery', 'diagnosis', 'prescription']
        fraud_score -= sum(0.05 for term in medical_terms if term in description.lower())

        noise = random.uniform(-0.05, 0.05)
        final_score = max(0.0, min(1.0, fraud_score + noise))
        print(f"   📊 Basic detection fraud score: {final_score:.2%}")
        return final_score

    def _generate_basic_analysis(self, claim_data, proof_files):
        """Generate basic analysis string for fallback."""
        amount = float(claim_data.get('amount', 0))
        description = claim_data.get('description', '')
        parts = []

        if amount > 100000:
            parts.append("⚠️ Very high claim amount detected (>₹100,000) - requires detailed verification")
        elif amount > 50000:
            parts.append("⚠️ High claim amount (>₹50,000) - standard verification recommended")
        else:
            parts.append("✓ Claim amount within normal range")

        if not proof_files or len(proof_files) == 0:
            parts.append("⚠️ CRITICAL: No medical documentation provided - high fraud risk")
        elif len(proof_files) >= 3:
            parts.append("✓ Good documentation provided - reduces fraud risk")
        else:
            parts.append("⚠️ Limited documentation - additional files recommended")

        if len(description) < 50:
            parts.append("⚠️ Brief claim description - more details needed")
        elif len(description) > 150:
            parts.append("✓ Detailed claim description provided")
        else:
            parts.append("✓ Adequate claim description")

        return "\n".join(parts)

    def _check_traditional_indicators(self, claim_data):
        """Check traditional fraud indicators."""
        indicators = []
        amount = float(claim_data.get('amount', 0))
        description = claim_data.get('description', '')

        if amount > 75000:
            indicators.append('High claim amount requiring verification')
        if len(description) < 50:
            indicators.append('Insufficient claim description')

        suspicious_keywords = ['urgent', 'emergency', 'immediate', 'cash']
        found = [kw for kw in suspicious_keywords if kw in description.lower()]
        if found:
            indicators.append(f'Suspicious keywords detected: {", ".join(found)}')

        return indicators

    def _get_risk_level(self, fraud_score):
        if fraud_score < 0.35:
            return 'LOW'
        elif fraud_score < 0.65:
            return 'MEDIUM'
        return 'HIGH'

    def get_model_stats(self):
        ml_info = {}
        if self.ml_detector:
            ml_info = self.ml_detector.get_model_info()

        return {
            'model_version': '3.2.0-Gemini-Priority-PDFExtract',
            'model_type': 'Dual AI System (Gemini 2.5 Flash + ML)',
            'gemini_enabled': True,
            'gemini_weight': '60%',
            'ml_enabled': ml_info.get('is_trained', False),
            'ml_weight': '40%',
            'ml_model_type': ml_info.get('model_type', 'Not Trained'),
            'ml_accuracy': ml_info.get('model_accuracy', 0),
            'predictions_made': self.predictions_count,
            'supports_multimodal': True,
            'supports_pdf': True,
            'pdf_text_extraction_fallback': PDFPLUMBER_AVAILABLE or PYPDF_AVAILABLE,
            'last_updated': datetime.now().isoformat()
        }