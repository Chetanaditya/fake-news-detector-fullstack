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

def retrieve_context(query, top_k=3):

    # Encode the query
    query_embedding = embedding_model.encode(query).tolist()

    # Query Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    # Extract text from metadata
    return [match["metadata"]["text"] for match in results["matches"]]