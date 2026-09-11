from pinecone import Pinecone
import os
import threading
from dotenv import load_dotenv

from rag.embeddings import get_embedding

load_dotenv()

# Global caches for lazy initialization
_pc_index = None

# Locks to prevent duplicate initialization in concurrent environments
_index_lock = threading.Lock()

def _get_pinecone_index():
    global _pc_index
    with _index_lock:
        if _pc_index is None:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            _pc_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    return _pc_index

def retrieve_context(query, top_k=3):
    # Use external API for embedding (Cloudflare Workers AI)
    query_embedding = get_embedding(query)

    # Initialize Pinecone lazily
    index = _get_pinecone_index()

    # Query Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    # Extract text from metadata
    return [match["metadata"]["text"] for match in results["matches"]]
