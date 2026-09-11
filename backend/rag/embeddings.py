import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
MODEL_ID = "@cf/baai/bge-small-en-v1.5"
EXPECTED_DIM = 384
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def get_embedding(text: str) -> list[float]:
    """
    Generates a 384-dimensional embedding vector for the given text using
    the Cloudflare Workers AI REST API.
    """
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise ValueError("CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set in environment variables.")

    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{MODEL_ID}"

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {"text": text}

    attempt = 0
    while attempt < MAX_RETRIES:
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)

            # 1. Verify HTTP success
            if response.status_code != 200:
                # Retry on 5xx errors
                if 500 <= response.status_code < 600:
                    attempt += 1
                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY * attempt)
                        continue
                raise Exception(f"Cloudflare API error: {response.status_code} - {response.text}")

            data = response.json()

            # 2. Verify Cloudflare reports success
            if not data.get("success"):
                raise Exception(f"Cloudflare API returned failure: {data.get('errors', 'Unknown error')}")

            # 3. Inspect and extract the embedding vector
            # Cloudflare Workers AI returns result.data as a list of vectors
            result = data.get("result")
            if not result or "data" not in result:
                raise Exception(f"Unexpected response format: 'result.data' not found. Response: {data}")

            embeddings = result["data"]

            # Since we send a single string, we expect a list containing one vector
            if not isinstance(embeddings, list) or len(embeddings) == 0:
                raise Exception("Cloudflare API returned empty or invalid embedding data.")

            vector = embeddings[0]

            # 4. Verify flat vector of exactly 384 floats
            if not isinstance(vector, list):
                raise TypeError(f"Expected embedding vector to be a list, got {type(vector)}")

            if len(vector) != EXPECTED_DIM:
                raise ValueError(
                    f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(vector)}"
                )

            return vector

        except requests.exceptions.RequestException as e:
            attempt += 1
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
                continue
            raise Exception(f"Network error calling Cloudflare API: {str(e)}")

    raise Exception("Max retries exceeded while calling Cloudflare API.")
