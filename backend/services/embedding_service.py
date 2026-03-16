import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_DIR = os.path.join(BASE_DIR, "faiss_index")
INDEX_PATH = os.path.join(INDEX_DIR, "repo.index")
ID_PATH = os.path.join(INDEX_DIR, "repo_ids.npy")

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


def ensure_index_dir():
    os.makedirs(INDEX_DIR, exist_ok=True)


def embed_texts(texts):
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.astype("float32")


def embed_query(text):
    embedding = model.encode(
        [text],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embedding.astype("float32")


def save_faiss_index(index, repo_ids):
    ensure_index_dir()
    faiss.write_index(index, INDEX_PATH)
    np.save(ID_PATH, np.array(repo_ids, dtype=np.int64))


def load_faiss_index():
    if not os.path.exists(INDEX_PATH) or not os.path.exists(ID_PATH):
        return None, None
    index = faiss.read_index(INDEX_PATH)
    repo_ids = np.load(ID_PATH)
    return index, repo_ids


def build_faiss_index(repo_ids, texts):
    ensure_index_dir()

    embeddings = embed_texts(texts)
    dim = embeddings.shape[1]

    index = faiss.IndexFlatIP(dim)  # cosine similarity
    index.add(embeddings)

    save_faiss_index(index, repo_ids)
    return index, repo_ids


def search_similar(query_text, top_k=10):
    index, repo_ids = load_faiss_index()
    if index is None or repo_ids is None:
        raise ValueError("FAISS index not found. Build the index first.")

    query_vec = embed_query(query_text)
    scores, indices = index.search(query_vec, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        results.append({
            "repo_id": int(repo_ids[idx]),
            "score": float(score),
        })

    return results