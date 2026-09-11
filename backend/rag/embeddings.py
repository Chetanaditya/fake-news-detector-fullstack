import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Model URL for BGE-small-en-v1.5 on Hugging Face Inference API
API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5"
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

def get_embedding(text: str) -> list[float]:
    """
    Generates an embedding vector for the given text using Hugging Face Inference API.
    """
    if not HF_TOKEN:
        raise ValueError("HUGGINGFACE_API_TOKEN is not set in environment variables.")

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {"inputs": text}

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=10)

        # Handle API errors
        if response.status_code != 200:
            # Hugging Face sometimes returns 503 if the model is still loading
            if response.status_code == 503:
                # In a real production app, we might implement a retry loop here
                raise Exception("Model is currently loading on Hugging Face. Please try again in a few seconds.")

            raise Exception(f"Hugging Face API error: {response.status_code} - {response.text}")

        # The Inference API for feature-extraction returns a list of floats directly
        embedding = response.json()

        if not isinstance(embedding, list):
            raise Exception(f"Unexpected API response format: {type(embedding)}")

        return embedding

    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error calling Hugging Face API: {str(e)}")
