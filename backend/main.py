from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import base64
import httpx

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from backend.db import SessionLocal, engine, Base
from backend.models import Repository, Readme
from backend.services.embedding_service import build_faiss_index, search_similar

load_dotenv()

app = FastAPI(title="OpenSourceSearchEngine API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 테이블 자동 생성
Base.metadata.create_all(bind=engine)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_API = "https://api.github.com"


class IngestRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(20, ge=1, le=50)


class RepoItem(BaseModel):
    id: int
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    stargazers_count: int = 0
    html_url: str
    updated_at: Optional[str] = None
    readme_preview: Optional[str] = None


class RepoListResponse(BaseModel):
    items: List[RepoItem]


class IndexResponse(BaseModel):
    message: str
    indexed_count: int


class SemanticSearchItem(RepoItem):
    score: float


class SemanticSearchResponse(BaseModel):
    query: str
    count: int
    items: List[SemanticSearchItem]


@app.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat()}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _github_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "open-source-reco-demo",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


async def github_search_repos(query: str, limit: int) -> List[Dict[str, Any]]:
    params = {"q": query, "per_page": min(limit, 50), "sort": "stars", "order": "desc"}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{GITHUB_API}/search/repositories",
            params=params,
            headers=_github_headers()
        )
        if r.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit/forbidden. Check token.")
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=f"GitHub search failed: {r.text}")
        return r.json().get("items", [])


async def github_fetch_readme(owner: str, repo: str) -> str:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/readme",
            headers=_github_headers()
        )
        if r.status_code == 404:
            return ""
        if r.status_code >= 400:
            return ""
        j = r.json()
        content_b64 = j.get("content", "")
        if not content_b64:
            return ""
        try:
            return base64.b64decode(content_b64).decode("utf-8", errors="ignore")
        except Exception:
            return ""


def preview_text(text: str, max_chars: int = 280) -> str:
    t = (text or "").strip().replace("\r\n", "\n")
    t = " ".join(t.split())
    return t[:max_chars]


def upsert_repo_and_readme(db: Session, repo_json: Dict[str, Any], readme_text: str):
    github_repo_id = repo_json.get("id")
    full_name = repo_json.get("full_name")
    if not github_repo_id or not full_name:
        return False

    repo = db.query(Repository).filter(Repository.github_repo_id == github_repo_id).first()
    if repo is None:
        repo = Repository(
            github_repo_id=github_repo_id,
            full_name=full_name,
            html_url=repo_json.get("html_url", "")
        )
        db.add(repo)

    repo.full_name = full_name
    repo.html_url = repo_json.get("html_url", repo.html_url)

    raw_description = repo_json.get("description")
    if raw_description:
        raw_description = raw_description[:5000]
    repo.description = raw_description

    repo.language = repo_json.get("language")
    repo.stargazers_count = repo_json.get("stargazers_count", 0)

    updated_at_str = repo_json.get("updated_at")
    if updated_at_str:
        try:
            repo.updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        except Exception:
            pass

    db.flush()

    rd = db.query(Readme).filter(Readme.repo_id == repo.id).first()
    if rd is None:
        rd = Readme(repo_id=repo.id, content=readme_text)
        db.add(rd)
    else:
        rd.content = readme_text

    return True


@app.post("/ingest")
async def ingest(req: IngestRequest):
    repos = await github_search_repos(req.query.strip(), req.limit)

    db = SessionLocal()
    try:
        ingested = 0
        for repo_json in repos[: req.limit]:
            full_name = repo_json.get("full_name")
            if not full_name or "/" not in full_name:
                continue
            owner, name = full_name.split("/", 1)

            readme = await github_fetch_readme(owner, name)
            ok = upsert_repo_and_readme(db, repo_json, readme)
            if ok:
                ingested += 1

        db.commit()
        return {"message": "ingest completed", "query": req.query, "ingested_count": ingested}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB ingest failed: {str(e)}")
    finally:
        db.close()


@app.post("/build-index", response_model=IndexResponse)
def build_index():
    db = SessionLocal()
    try:
        rows = (
            db.query(Repository, Readme)
            .outerjoin(Readme, Readme.repo_id == Repository.id)
            .all()
        )

        repo_ids = []
        texts = []

        for repo, rd in rows:
            combined_text = f"""
Repository: {repo.full_name}
Description: {repo.description or ""}
Language: {repo.language or ""}
README: {rd.content if rd and rd.content else ""}
            """.strip()

            if combined_text:
                repo_ids.append(repo.id)
                texts.append(combined_text)

        if not repo_ids:
            raise HTTPException(status_code=400, detail="No repository data found to index.")

        build_faiss_index(repo_ids, texts)

        return {
            "message": "FAISS index built successfully",
            "indexed_count": len(repo_ids),
        }
    finally:
        db.close()


@app.get("/semantic-search", response_model=SemanticSearchResponse)
def semantic_search(
    q: str = Query(..., min_length=1, description="Natural language query"),
    limit: int = Query(10, ge=1, le=20),
):
    db = SessionLocal()
    try:
        results = search_similar(q, top_k=limit)

        items = []
        for result in results:
            repo_id = result["repo_id"]
            score = result["score"]

            row = (
                db.query(Repository, Readme)
                .outerjoin(Readme, Readme.repo_id == Repository.id)
                .filter(Repository.id == repo_id)
                .first()
            )

            if not row:
                continue

            repo, rd = row
            items.append(
                {
                    "id": repo.github_repo_id,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "language": repo.language,
                    "stargazers_count": repo.stargazers_count,
                    "html_url": repo.html_url,
                    "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                    "readme_preview": preview_text(rd.content) if rd and rd.content else None,
                    "score": score,
                }
            )

        return {
            "query": q,
            "count": len(items),
            "items": items,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


@app.get("/repos", response_model=RepoListResponse)
def list_repos(limit: int = 10):
    db = SessionLocal()
    try:
        rows = (
            db.query(Repository, Readme)
            .outerjoin(Readme, Readme.repo_id == Repository.id)
            .order_by(Repository.stargazers_count.desc())
            .limit(max(1, min(limit, 50)))
            .all()
        )

        items = []
        for repo, rd in rows:
            items.append(
                {
                    "id": repo.github_repo_id,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "language": repo.language,
                    "stargazers_count": repo.stargazers_count,
                    "html_url": repo.html_url,
                    "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                    "readme_preview": preview_text(rd.content) if rd and rd.content else None,
                }
            )

        return {"items": items}
    finally:
        db.close()