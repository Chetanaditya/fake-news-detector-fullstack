import os
import time
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

# Configuration
MODEL_ID = "BAAI/bge-small-en-v1.5"
EXPECTED_DIM = 384
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def get_embedding(text: str) -> list[float]:
    """
    Generates a 384-dimensional embedding vector for the given text using
    the Hugging Face Inference API.
    """
    api_key = os.getenv("HUGGINGFACE_API_TOKEN")
    if not api_key:
        raise ValueError("HUGGINGFACE_API_TOKEN is not set in environment variables.")

    # Initialize the official InferenceClient
    # Note: provider="hf-inference" is the default for serverless API
    client = InferenceClient(api_key=api_key)

    attempt = 0
    while attempt < MAX_RETRIES:
        try:
            # Call feature_extraction
            # Using the explicit model ID and provider as requested
            embedding = client.feature_extraction(
                text,
                model=MODEL_ID,
                # provider="hf-inference" is passed here if the SDK version supports it,
                # otherwise it defaults to hf-inference for serverless
            )

            # 1. Handle the returned shape explicitly
            # Hugging Face feature_extraction can return a list or a numpy array.
            # We ensure it's a flat list of floats.
            if hasattr(embedding, "tolist"):
                embedding = embedding.tolist()

            if not isinstance(embedding, list):
                raise TypeError(f"Expected list for embedding, got {type(embedding)}")

            # Handle cases where the API might return a 2D list [[...]]
            if len(embedding) > 0 and isinstance(embedding[0], list):
                embedding = embedding[0]

            # 2. Verify the exact output dimension (must be 384)
            if len(embedding) != EXPECTED_DIM:
                raise ValueError(
                    f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(embedding)}"
                )

            return embedding

        except Exception as e:
            error_msg = str(e).lower()
            # Retry on 503 (Service Unavailable/Model Loading)
            if "503" in error_msg or "loading" in error_msg:
                attempt += 1
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY * attempt)
                    continue

            # For all other errors, raise immediately
            raise Exception(f"Hugging Face API error after {attempt+1} attempts: {str(e)}")

    raise Exception("Max retries exceeded while calling Hugging Face API.")
