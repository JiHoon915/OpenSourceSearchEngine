import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const MOCK_REPOS = [
  {
    id: 1,
    full_name: "facebook/react",
    description: "A JavaScript library for building user interfaces",
    language: "JavaScript",
    stargazers_count: 220000,
    html_url: "https://github.com/facebook/react",
    updated_at: "2026-02-01T00:00:00Z",
    readme_preview: "React lets you build user interfaces from reusable components.",
    score: 0.91,
  },
  {
    id: 2,
    full_name: "fastapi/fastapi",
    description:
      "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
    language: "Python",
    stargazers_count: 80000,
    html_url: "https://github.com/fastapi/fastapi",
    updated_at: "2026-01-25T00:00:00Z",
    readme_preview:
      "FastAPI framework, high performance, easy to learn, fast to code, ready for production.",
    score: 0.72,
  },
];

const API = axios.create({
  baseURL: "",
  timeout: 20000,
});

function formatStars(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function formatScore(score) {
  if (score === undefined || score === null) return null;
  return Number(score).toFixed(3);
}

function RepoCard({ repo }) {
  return (
    <a className="card" href={repo.html_url} target="_blank" rel="noreferrer">
      <div className="cardHeader">
        <div className="repoName">{repo.full_name}</div>
        <div className="stars">★ {formatStars(repo.stargazers_count ?? 0)}</div>
      </div>

      <div className="desc">{repo.description || "No description"}</div>

      {repo.readme_preview && (
        <div
          className="desc"
          style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}
        >
          {repo.readme_preview}
        </div>
      )}

      <div className="meta">
        <span className="pill">{repo.language || "Unknown"}</span>
        <span className="muted">
          Updated: {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : "-"}
        </span>
      </div>

      {repo.score !== undefined && repo.score !== null && (
        <div className="scoreBox">Semantic Score: {formatScore(repo.score)}</div>
      )}
    </a>
  );
}

export default function App() {
  const [query, setQuery] = useState("react note taking app similar to notion");
  const [limit, setLimit] = useState(10);

  const [repos, setRepos] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [message, setMessage] = useState("");
  const [useMock, setUseMock] = useState(false);

  const canSubmit = useMemo(
    () => query.trim().length > 0 && Number(limit) > 0,
    [query, limit]
  );

  async function fetchRepos(fetchLimit = 10) {
    setStatus("loading");
    setMessage("Loading repositories...");

    try {
      const res = await API.get(`/repos?limit=${fetchLimit}`);
      const items = res.data?.items ?? [];

      setRepos(items);
      setUseMock(false);
      setStatus("idle");
      setMessage(`Loaded ${items.length} repositories.`);
    } catch (e) {
      setRepos(MOCK_REPOS);
      setUseMock(true);
      setStatus("idle");
      setMessage("Backend not available. Showing mock data.");
    }
  }

  async function ingest() {
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("Ingesting repositories from GitHub...");

    try {
      const res = await API.post("/ingest", {
        query: query.trim(),
        limit: Number(limit),
      });

      const ingested = res.data?.ingested_count ?? 0;
      setMessage(`Ingest completed. ${ingested} repositories saved.`);
      setStatus("idle");
      setUseMock(false);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Unknown error";
      setStatus("error");
      setMessage(`Ingest failed: ${detail}`);
    }
  }

  async function buildIndex() {
    setStatus("loading");
    setMessage("Building FAISS index...");

    try {
      const res = await API.post("/build-index");
      const indexedCount = res.data?.indexed_count ?? 0;
      setStatus("idle");
      setUseMock(false);
      setMessage(`FAISS index built successfully. Indexed ${indexedCount} repositories.`);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Unknown error";
      setStatus("error");
      setMessage(`Build index failed: ${detail}`);
    }
  }

  async function searchRepos() {
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("Searching repositories with semantic search...");

    try {
      const res = await API.get(
        `/semantic-search?q=${encodeURIComponent(query.trim())}&limit=${Number(limit)}`
      );

      const items = res.data?.items ?? [];
      const count = res.data?.count ?? items.length;

      setRepos(items);
      setUseMock(false);
      setStatus("idle");
      setMessage(`Found ${count} semantically similar repositories.`);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Unknown error";
      setStatus("error");
      setMessage(`Semantic search failed: ${detail}`);
    }
  }

  useEffect(() => {
    fetchRepos(10);
  }, []);

  return (
    <div className="wrap">
      <header className="header">
        <div className="title">Open Source Search & Recommendation</div>
        <div className="subtitle">
          Semantic README-based search using GitHub + MySQL + FAISS
        </div>
      </header>

      <section className="panel">
        <div className="row">
          <div className="field">
            <label>Query</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g., "react note taking app similar to notion"'
            />
          </div>

          <div className="field small">
            <label>Limit</label>
            <input
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>

          <div className="actions">
            <button disabled={!canSubmit || status === "loading"} onClick={ingest}>
              {status === "loading" ? "Working..." : "Ingest"}
            </button>

            <button disabled={status === "loading"} onClick={buildIndex}>
              Build Index
            </button>

            <button disabled={!canSubmit || status === "loading"} onClick={searchRepos}>
              Search
            </button>

            <button
              disabled={status === "loading"}
              className="secondary"
              onClick={() => fetchRepos(Number(limit))}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className={`status ${status === "error" ? "error" : ""}`}>
          {message}
          {useMock && <span className="mockBadge">MOCK</span>}
        </div>
      </section>

      <section className="list">
        {repos.length === 0 ? (
          <div className="empty">No results</div>
        ) : (
          repos.map((repo) => <RepoCard key={repo.id ?? repo.full_name} repo={repo} />)
        )}
      </section>
    </div>
  );
}