from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Embedding Model
embedding_model = SentenceTransformer(
    "BAAI/bge-small-en-v1.5"
)

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))

with open("data/news.txt", "r", encoding="utf-8") as f:
    documents = f.readlines()

# Pinecone prefers batch upserts
vectors = []
for i, doc in enumerate(documents):
    text = doc.strip()
    if not text:
        continue

    embedding = embedding_model.encode(text).tolist()

    # Pinecone structure: (id, vector, metadata)
    vectors.append({
        "id": str(i),
        "values": embedding,
        "metadata": {"text": text}
    })

# Upsert in batches of 100
batch_size = 100
for i in range(0, len(vectors), batch_size):
    index.upsert(vectors=vectors[i : i + batch_size])

print(f"Successfully embedded {len(vectors)} documents to Pinecone.")