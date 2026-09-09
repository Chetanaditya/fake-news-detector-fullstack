from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import os
import threading
from dotenv import load_dotenv

load_dotenv()

# Global caches for lazy initialization
_embedding_model = None
_pc_index = None

# Locks to prevent duplicate initialization in concurrent environments
_model_lock = threading.Lock()
_index_lock = threading.Lock()

def _get_embedding_model():
    global _embedding_model
    with _model_lock:
        if _embedding_model is None:
            _embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _embedding_model

def _get_pinecone_index():
    global _pc_index
    with _index_lock:
        if _pc_index is None:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            _pc_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    return _pc_index

def retrieve_context(query, top_k=3):

    # Initialize lazily
    embedding_model = _get_embedding_model()
    index = _get_pinecone_index()

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