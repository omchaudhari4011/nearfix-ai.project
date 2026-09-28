"""
AI-Powered Complaint Classification Model
Final Year B.Tech Project (AI/ML Branch)
Tech Stack: scikit-learn (TfidfVectorizer + SVC linear), NLTK, joblib
"""

import os
import sys
import re
import json
import joblib
import numpy as np
from dataset import TRAINING_DATA

# Optional NLTK download with fallback
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    STOP_WORDS = set(stopwords.words('english'))
except Exception as e:
    print(f"[Notice] Using built-in stopwords list: {e}")
    STOP_WORDS = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
        "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
        "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
        "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
        "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
        "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
        "at", "by", "for", "with", "about", "against", "between", "into", "through",
        "during", "before", "after", "above", "below", "to", "from", "up", "down",
        "in", "out", "on", "off", "over", "under", "again", "further", "then",
        "once", "here", "there", "when", "where", "why", "how", "all", "any",
        "both", "each", "few", "more", "most", "other", "some", "such", "no",
        "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
        "t", "can", "will", "just", "don", "should", "now"
    }

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "ac_complaint_svm_model.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.json")
EXCHANGE_MODEL_PATH = os.path.join(MODEL_DIR, "model_export.json")


def preprocess_text(text: str) -> str:
    """
    Preprocess text:
    1. Lowercasing
    2. Punctuation removal
    3. Tokenization & stopword removal
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    tokens = text.split()
    filtered = [w for w in tokens if w not in STOP_WORDS and len(w) > 1]
    return " ".join(filtered)


def train_model():
    print("=" * 60)
    print("AI-POWERED COMPLAINT CLASSIFIER - TRAINING PIPELINE")
    print("Model: Support Vector Machine (SVC, Linear Kernel)")
    print("Feature Extraction: TF-IDF Vectorizer (unigrams + bigrams)")
    print("=" * 60)

    texts = [d["text"] for d in TRAINING_DATA]
    labels = [d["category"] for d in TRAINING_DATA]

    print(f"Total labeled samples: {len(texts)}")
    categories = sorted(list(set(labels)))
    print(f"Categories ({len(categories)}): {', '.join(categories)}")

    # Preprocessing
    cleaned_texts = [preprocess_text(t) for t in texts]

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        cleaned_texts, labels, test_size=0.20, random_state=42, stratify=labels
    )

    print(f"Training set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        max_features=1200,
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Linear SVM Classifier with probability support
    classifier = SVC(kernel='linear', probability=True, random_state=42, C=1.5)
    classifier.fit(X_train_vec, y_train)

    # Evaluation
    y_pred = classifier.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    report_text = classification_report(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred, labels=classifier.classes_).tolist()

    print("\n--- EVALUATION RESULTS ---")
    print(f"Test Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(report_text)

    # Save artifacts using joblib
    joblib.dump(classifier, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved vectorizer to: {VECTORIZER_PATH}")

    # Top indicative words per category
    feature_names = vectorizer.get_feature_names_out()
    top_features_per_category = {}
    try:
        coef_matrix = classifier.coef_.toarray() if hasattr(classifier.coef_, "toarray") else classifier.coef_
        if coef_matrix.shape[0] == len(classifier.classes_):
            for idx, cls in enumerate(classifier.classes_):
                top_ids = np.argsort(coef_matrix[idx])[-7:]
                top_features_per_category[cls] = [feature_names[i] for i in reversed(top_ids)]
        else:
            for cls in classifier.classes_:
                top_features_per_category[cls] = []
    except Exception as e:
        print(f"[Notice] Feature extraction: {e}")
        for cls in classifier.classes_:
            top_features_per_category[cls] = []

    # Export metrics json for dashboard visualization
    metrics_data = {
        "accuracy": round(acc * 100, 2),
        "total_samples": len(texts),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "categories": classifier.classes_.tolist(),
        "classification_report": report_dict,
        "confusion_matrix": cm,
        "top_features": top_features_per_category
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)

    # Export lightweight bundle for Node/Express fast runtime inference fallback
    clean_vocab = {k: int(v) for k, v in vectorizer.vocabulary_.items()}
    export_bundle = {
        "classes": [str(c) for c in classifier.classes_],
        "vocabulary": clean_vocab,
        "idf": [float(val) for val in vectorizer.idf_],
        "stop_words": list(STOP_WORDS)
    }
    with open(EXCHANGE_MODEL_PATH, "w") as f:
        json.dump(export_bundle, f)

    print(f"Saved metrics to: {METRICS_PATH}")
    print("Training pipeline finished successfully.")
    return classifier, vectorizer


def classify_complaint(text: str) -> dict:
    """
    Classify customer complaint text using the trained TF-IDF + SVM model.
    Returns:
    {
        'category': str,
        'confidence': float,
        'all_probabilities': dict
    }
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        raise FileNotFoundError("Model files not found. Run train_model() first.")

    classifier = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)

    cleaned = preprocess_text(text)
    vec = vectorizer.transform([cleaned])
    predicted_class = classifier.predict(vec)[0]
    probabilities = classifier.predict_proba(vec)[0]

    prob_map = {cls: round(float(prob), 4) for cls, prob in zip(classifier.classes_, probabilities)}
    confidence = float(np.max(probabilities))

    return {
        "category": predicted_class,
        "confidence": round(confidence, 4),
        "all_probabilities": prob_map
    }


if __name__ == "__main__":
    classifier, vectorizer = train_model()

    print("\n--- SAMPLE INFERENCE VERIFICATION ---")
    test_cases = [
        "AC is throwing warm air, bedroom is not getting chilled at all",
        "Hissing noise from outdoor copper line and chemical gas odor",
        "Indoor split unit is rattling and making terrible grinding sounds",
        "Switching on the AC causes the house MCB to trip immediately",
        "Remote buttons are totally dead and screen is blank",
        "Water leaking and dripping continuously from indoor AC onto the carpet",
        "Need technician to wall-mount and install new Daikin AC"
    ]

    for test in test_cases:
        res = classify_complaint(test)
        print(f"Complaint: \"{test}\"")
        print(f" -> Predicted: {res['category']} (Confidence: {res['confidence'] * 100:.1f}%)")
        print("-" * 50)
