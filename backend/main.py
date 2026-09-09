from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv

from rag.retrieve import retrieve_context

import json

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cloud API Client (Groq)
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

# Request schema
class NewsRequest(BaseModel):
    text: str

# System Prompt
SYSTEM_PROMPT = """
You are an AI NEWS CLASSIFIER.

You must ALWAYS return STRICT VALID JSON.

Rules:
- Use double quotes for ALL keys
- Use double quotes for ALL strings
- Do NOT add explanations
- Do NOT add markdown
- Do NOT add ```json
- Output ONLY raw JSON

JSON format:

{
  "verdict": "REAL",
  "confidence": 90,
  "summary": "Short explanation.",
  "signals": [
    {
      "type": "green",
      "label": "Credible Sources",
      "detail": "The article references official institutions."
    }
  ],
  "breakdown": {
    "language": 85,
    "sourcing": 90,
    "logic": 88,
    "factual": 92,
    "structure": 87
  },
  "recommendation": "Verify using trusted sources."
}
"""


# Root Route
@app.get("/")
async def root():

    return {
        "status": "Backend running successfully",
        "model": os.getenv("MODEL_NAME", "qwen/qwen3.8-27b"),
        "rag": "enabled"
    }

# Analyze Route
@app.post("/analyze")
async def analyze_news(request: NewsRequest):

    try:

        # Retrieve RAG context
        context_docs = retrieve_context(request.text)

        context = "\n".join(context_docs)

        # Phi-3 Response
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "qwen/qwen3.8-27b"),
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": f"""
Retrieved Context:
{context}

News To Analyze:
{request.text}

Use the retrieved context while analyzing.
"""
                }
            ]
        )

        raw_output = response.choices[0].message.content

        print("\n========== RAW OUTPUT ==========\n")
        print(raw_output)
        print("\n================================\n")

        # Extract JSON safely
        start = raw_output.find("{")
        end = raw_output.rfind("}") + 1

        json_string = raw_output[start:end]

        # Parse JSON
        parsed = json.loads(json_string)

        # Return directly for frontend compatibility
        return parsed

    except Exception as e:

        print("BACKEND ERROR:", str(e))

        # Frontend-safe error response
        return {
            "verdict": "UNCERTAIN",
            "confidence": 0,
            "summary": "Backend processing failed.",
            "signals": [
                {
                    "type": "red",
                    "label": "System Error",
                    "detail": str(e)
                }
            ],
            "breakdown": {
                "language": 0,
                "sourcing": 0,
                "logic": 0,
                "factual": 0,
                "structure": 0
            },
            "recommendation": "Check backend logs."
        }