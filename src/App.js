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
  },
  {
    id: 2,
    full_name: "fastapi/fastapi",
    description: "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
    language: "Python",
    stargazers_count: 80000,
    html_url: "https://github.com/fastapi/fastapi",
    updated_at: "2026-01-25T00:00:00Z",
  },
];

function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
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
        <div className="desc" style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}>
          {repo.readme_preview}
        </div>
      )}

      <div className="meta">
        <span className="pill">{repo.language || "Unknown"}</span>
        <span className="muted">
          Updated: {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : "-"}
        </span>
      </div>
    </a>
  );
}

export default function App() {
  const [query, setQuery] = useState("react authentication");
  const [limit, setLimit] = useState(20);

  const [repos, setRepos] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [message, setMessage] = useState("");

  const [useMock, setUseMock] = useState(false);

  const canSubmit = useMemo(() => query.trim().length > 0 && limit > 0, [query, limit]);

  async function fetchRepos() {
    setStatus("loading");
    setMessage("Loading repositories...");
    try {
      const res = await axios.get(`/repos?limit=10`);
      setRepos(res.data?.items ?? res.data ?? []);
      setUseMock(false);
      setStatus("idle");
      setMessage(`Loaded ${res.data?.items?.length ?? (res.data?.length ?? 0)} repos`);
    } catch (e) {
      // 백엔드 없을 때도 UI 확인 가능하게 mock으로 폴백
      setRepos(MOCK_REPOS);
      setUseMock(true);
      setStatus("idle");
      setMessage("Backend not available. Showing mock data.");
    }
  }

  async function ingest() {
    if (!canSubmit) return;
    setStatus("loading");
    setMessage("Ingesting from GitHub...");

    try {
      const res = await axios.post("/ingest", {
        query: query.trim(),
        limit: Number(limit),
      });

      const ingested = res.data?.ingested_count ?? 0;
      setMessage(`Ingest done. ingested_count=${ingested}. Refreshing...`);

      // ingest 후 리스트 재조회
      await fetchRepos();
    } catch (e) {
      setStatus("error");
      setMessage(
        `Ingest failed. Is backend running on port 8000?\n` +
          (e?.response?.data?.detail ? `detail: ${e.response.data.detail}` : "")
      );
    }
  }

  useEffect(() => {
    fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wrap">
      <header className="header">
        <div className="title">Open Source Search & Recommendation (Demo UI)</div>
        <div className="subtitle">
          Step1 Query Refinement → Step2 Retrieve → Step3 Re-rank (Cross-Encoder)
        </div>
      </header>

      <section className="panel">
        <div className="row">
          <div className="field">
            <label>Query</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g., "react authentication"'
            />
          </div>

          <div className="field small">
            <label>Ingest limit</label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>

          <div className="actions">
            <button disabled={!canSubmit || status === "loading"} onClick={ingest}>
              {status === "loading" ? "Working..." : "Ingest"}
            </button>
            <button disabled={status === "loading"} className="secondary" onClick={fetchRepos}>
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
          repos.map((r) => <RepoCard key={r.id ?? r.full_name} repo={r} />)
        )}
      </section>
    </div>
  );
}
