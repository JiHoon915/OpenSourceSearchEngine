import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const MOCK_REPOS = [
  {
    id: 1,
    full_name: "facebook/react",
    description: "A JavaScript library for building user interfaces",
    language: "JavaScript",
    languages: ["JavaScript", "TypeScript", "HTML"],
    stargazers_count: 220000,
    html_url: "https://github.com/facebook/react",
    updated_at: "2026-02-01T00:00:00Z",
    score: 0.91,
  },
  {
    id: 2,
    full_name: "fastapi/fastapi",
    description:
      "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
    language: "Python",
    languages: ["Python", "Shell", "HTML"],
    stargazers_count: 80000,
    html_url: "https://github.com/fastapi/fastapi",
    updated_at: "2026-01-25T00:00:00Z",
    score: 0.72,
  },
  {
    id: 3,
    full_name: "vercel/next.js",
    description: "The React Framework for the Web",
    language: "JavaScript",
    languages: ["JavaScript", "TypeScript", "Rust"],
    stargazers_count: 130000,
    html_url: "https://github.com/vercel/next.js",
    updated_at: "2026-02-10T00:00:00Z",
    score: 0.84,
  },
];

const API = axios.create({
  baseURL: "",
  timeout: 120000,
});

const RECENT_SEARCHES_KEY = "open_source_recent_searches";
const LAST_SEARCH_STATE_KEY = "open_source_last_search_state";
const MAX_RECENT_SEARCHES = 8;

function formatStars(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function formatScore(score) {
  if (score === undefined || score === null) return null;
  const numericScore = Number(score);
  const converted = Math.round(numericScore * 100);
  return Math.max(0, Math.min(100, converted));
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

function formatElapsedTime(ms) {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}초`;
}

function getTopLanguages(repo) {
  if (Array.isArray(repo.languages) && repo.languages.length > 0) {
    return repo.languages.filter(Boolean).slice(0, 3);
  }

  if (typeof repo.languages === "string" && repo.languages.trim()) {
    return repo.languages
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (repo.language) return [repo.language];
  return ["언어 정보 없음"];
}

function getErrorMessage(error) {
  if (error?.code === "ECONNABORTED") {
    return "요청 시간이 초과되었습니다. 결과 개수를 줄이거나 서버 상태를 확인해주세요.";
  }

  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) {
          const location = Array.isArray(item.loc) ? item.loc.join(" > ") : "";
          return location ? `${location}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }

  if (typeof error?.response?.data?.message === "string") {
    return error.response.data.message;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return "Unknown error";
}

function RepoCard({ repo }) {
  const displayScore = formatScore(repo.score);
  const topLanguages = getTopLanguages(repo);

  return (
    <div className="card">
      <div className="cardHeaderRow">
        <div className="repoTitleBlock">
          <div className="repoName">{repo.full_name}</div>
        </div>

        {displayScore !== null && (
          <div className="scoreBadge">
            <span className="scoreLabel">추천 점수</span>
            <div className="scoreValue">
              <span className="scoreNumber">{displayScore}</span>
              <span className="scoreUnit">점</span>
            </div>
          </div>
        )}
      </div>

      <div className="desc">{repo.description || "설명이 없습니다."}</div>

      <div className="meta">
        <div className="languageList">
          {topLanguages.map((lang, index) => (
            <span className="pill" key={`${repo.id ?? repo.full_name}-${lang}-${index}`}>
              {lang}
            </span>
          ))}
        </div>

        <span className="stars">★ {formatStars(repo.stargazers_count ?? 0)}</span>
      </div>

      <div className="cardFooterRow">
        <div className="subMeta">최근 업데이트: {formatDate(repo.updated_at)}</div>

        <a
          className="repoButton"
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
        >
          GitHub 바로가기
        </a>
      </div>
    </div>
  );
}

function LoadingSteps({ status, loadingStep }) {
  if (status !== "loading") return null;

  const steps = [
    { key: 1, label: "데이터 수집" },
    { key: 2, label: "인덱스 생성" },
    { key: 3, label: "검색 실행" },
  ];

  return (
    <div className="loadingBox">
      <div className="loadingTitle">검색 진행 상태</div>
      <div className="loadingSteps">
        {steps.map((step) => {
          const state =
            loadingStep > step.key
              ? "done"
              : loadingStep === step.key
              ? "active"
              : "todo";

          return (
            <div className={`loadingStep ${state}`} key={step.key}>
              <div className="stepCircle">{step.key}</div>
              <div className="stepLabel">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchProgress({ status, progress, elapsedMs, progressMessage }) {
  if (status !== "loading") return null;

  return (
    <div className="progressCard">
      <div className="progressTopRow">
        <span className="progressInlineMessage">{progressMessage}</span>
        <span className="progressTime">{formatElapsedTime(elapsedMs)}</span>
      </div>

      <div className="progressTrack">
        <div
          className="progressFill active"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="progressBottomRow">
        <span>{progress}%</span>
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);

  const [repos, setRepos] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [useMock, setUseMock] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const [sortBy, setSortBy] = useState("score");
  const [languageFilter, setLanguageFilter] = useState("전체");
  const [recentSearches, setRecentSearches] = useState([]);

  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const timerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const searchStartRef = useRef(null);

  const canSubmit = useMemo(
    () => query.trim().length > 0 && Number(limit) > 0,
    [query, limit]
  );

  function startSearchTimer() {
    searchStartRef.current = Date.now();
    setElapsedMs(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (searchStartRef.current) {
        setElapsedMs(Date.now() - searchStartRef.current);
      }
    }, 100);
  }

  function stopSearchTimer() {
    if (searchStartRef.current) {
      setElapsedMs(Date.now() - searchStartRef.current);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startProgressAnimation(start, end) {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    setProgress(start);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= end) return prev;
        return Math.min(prev + 1, end);
      });
    }, 400);
  }

  function stopProgressAnimation(finalValue) {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (typeof finalValue === "number") {
      setProgress(finalValue);
    }
  }

  function saveRecentSearch(searchText) {
    const trimmed = searchText.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function saveLastSearchState({
    queryValue,
    limitValue,
    reposValue,
    sortByValue,
    languageFilterValue,
    messageValue,
  }) {
    const stateToSave = {
      query: queryValue,
      limit: limitValue,
      repos: reposValue,
      sortBy: sortByValue,
      languageFilter: languageFilterValue,
      message: messageValue,
    };

    localStorage.setItem(LAST_SEARCH_STATE_KEY, JSON.stringify(stateToSave));
  }

  function handleRecentSearchClick(searchText) {
    setQuery(searchText);
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }

  async function fetchRepos(fetchLimit = 10) {
    setStatus("loading");
    setLoadingStep(0);
    setProgressMessage("저장된 저장소 목록을 불러오는 중입니다...");
    setProgress(15);

    try {
      const numericLimit = Number(fetchLimit);
      const res = await API.get(`/repos?limit=${numericLimit}`);
      const items = res.data?.items ?? [];
      const nextMessage = `${items.length}개의 저장소를 불러왔습니다.`;

      setRepos(items);
      setUseMock(false);
      setStatus("idle");
      setProgress(0);
      setProgressMessage("");
      setMessage(nextMessage);

      saveLastSearchState({
        queryValue: query,
        limitValue: numericLimit,
        reposValue: items,
        sortByValue: sortBy,
        languageFilterValue: languageFilter,
        messageValue: nextMessage,
      });
    } catch (e) {
      console.error("fetchRepos error:", e?.response?.data || e);

      const nextMessage = "백엔드에 연결할 수 없어 예시 데이터를 표시합니다.";

      setRepos(MOCK_REPOS);
      setUseMock(true);
      setStatus("idle");
      setProgress(0);
      setProgressMessage("");
      setMessage(nextMessage);

      saveLastSearchState({
        queryValue: query,
        limitValue: Number(fetchLimit),
        reposValue: MOCK_REPOS,
        sortByValue: sortBy,
        languageFilterValue: languageFilter,
        messageValue: nextMessage,
      });
    } finally {
      setLoadingStep(0);
    }
  }

  async function handleSearch() {
    if (!canSubmit) return;

    const trimmedQuery = query.trim();
    const numericLimit = Math.min(50, Math.max(1, Number(limit)));

    setLimit(numericLimit);
    setStatus("loading");
    setUseMock(false);
    setLoadingStep(0);
    setProgress(0);
    setProgressMessage("검색을 준비하는 중입니다...");
    startSearchTimer();

    try {
      setLoadingStep(1);
      setProgressMessage("1/3 관련 저장소 데이터를 가져오는 중입니다...");
      startProgressAnimation(5, 35);

      await API.post("/ingest", {
        query: trimmedQuery,
        limit: numericLimit,
      });

      stopProgressAnimation(35);

      setLoadingStep(2);
      setProgressMessage("2/3 검색 인덱스를 생성하는 중입니다...");
      startProgressAnimation(40, 70);

      await API.post("/build-index");

      stopProgressAnimation(70);

      setLoadingStep(3);
      setProgressMessage("3/3 추천 저장소를 찾는 중입니다...");
      startProgressAnimation(75, 92);

      const res = await API.get(
        `/semantic-search?q=${encodeURIComponent(trimmedQuery)}&limit=${numericLimit}`
      );

      stopProgressAnimation(100);

      const items = res.data?.items ?? [];
      const count = res.data?.count ?? items.length;
      const nextMessage = `${count}개의 관련 저장소를 찾았습니다.`;

      setRepos(items);
      setStatus("idle");
      setMessage(nextMessage);
      setProgress(0);
      setProgressMessage("");
      saveRecentSearch(trimmedQuery);

      saveLastSearchState({
        queryValue: trimmedQuery,
        limitValue: numericLimit,
        reposValue: items,
        sortByValue: sortBy,
        languageFilterValue: languageFilter,
        messageValue: nextMessage,
      });
    } catch (e) {
      console.error("handleSearch error:", e?.response?.data || e);
      stopProgressAnimation(100);

      const detail = getErrorMessage(e);
      setStatus("error");
      setMessage(`검색에 실패했습니다: ${detail}`);
      setProgress(0);
      setProgressMessage("");
    } finally {
      stopSearchTimer();
      setLoadingStep(0);
    }
  }

  async function handleClearDatabase() {
    setStatus("loading");
    setLoadingStep(0);
    setProgressMessage("저장된 데이터를 정리하는 중입니다...");
    setProgress(20);

    try {
      await API.delete("/clear-db");

      setRepos([]);
      setStatus("idle");
      setUseMock(false);
      setProgress(0);
      setProgressMessage("");
      setMessage("저장된 데이터를 모두 정리했습니다.");
      localStorage.removeItem(LAST_SEARCH_STATE_KEY);
    } catch (e) {
      console.error("handleClearDatabase error:", e?.response?.data || e);
      const detail = getErrorMessage(e);
      setStatus("error");
      setMessage(`데이터 정리에 실패했습니다: ${detail}`);
      setProgress(0);
      setProgressMessage("");
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let restored = false;

    try {
      const savedRecent = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (savedRecent) {
        const parsedRecent = JSON.parse(savedRecent);
        if (Array.isArray(parsedRecent)) {
          setRecentSearches(parsedRecent.slice(0, MAX_RECENT_SEARCHES));
        }
      }

      const savedSearchState = localStorage.getItem(LAST_SEARCH_STATE_KEY);
      if (savedSearchState) {
        const parsedState = JSON.parse(savedSearchState);

        if (parsedState && Array.isArray(parsedState.repos)) {
          setQuery(parsedState.query || "");
          setLimit(parsedState.limit || 10);
          setRepos(parsedState.repos || []);
          setSortBy(parsedState.sortBy || "score");
          setLanguageFilter(parsedState.languageFilter || "전체");
          setMessage(parsedState.message || "이전 검색 결과를 불러왔습니다.");
          setStatus("idle");
          restored = true;
        }
      }
    } catch (e) {
      console.error("저장된 검색 상태를 불러오지 못했습니다.", e);
    }

    if (!restored) {
      fetchRepos(10);
    }
  }, []);

  const availableLanguages = useMemo(() => {
    const all = repos.flatMap((repo) => getTopLanguages(repo));
    const unique = [...new Set(all.filter(Boolean))].filter(
      (lang) => lang !== "언어 정보 없음"
    );
    return ["전체", ...unique.sort((a, b) => a.localeCompare(b))];
  }, [repos]);

  const displayedRepos = useMemo(() => {
    let filtered = [...repos];

    if (languageFilter !== "전체") {
      filtered = filtered.filter((repo) =>
        getTopLanguages(repo).includes(languageFilter)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "stars") {
        return (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0);
      }

      if (sortBy === "updated") {
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      }

      return (b.score ?? -Infinity) - (a.score ?? -Infinity);
    });

    return filtered;
  }, [repos, sortBy, languageFilter]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarCard">
          <div className="sidebarTitle">최근 검색 기록</div>
          <div className="sidebarSubtitle">
            이전에 찾았던 검색어를 다시 불러올 수 있어요.
          </div>

          {recentSearches.length > 0 ? (
            <>
              <div className="sidebarSearchList">
                {recentSearches.map((item, index) => (
                  <button
                    type="button"
                    key={`${item}-${index}`}
                    className="sidebarSearchItem"
                    onClick={() => handleRecentSearchClick(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="sidebarClearButton"
                onClick={clearRecentSearches}
              >
                전체 삭제
              </button>
            </>
          ) : (
            <div className="sidebarEmpty">
              아직 저장된 검색 기록이 없습니다.
            </div>
          )}
        </div>
      </aside>

      <main className="mainContent">
        <div className="wrap">
          <header className="header">
            <div className="title">Open Source Search & Recommendation</div>
            <div className="subtitle">
              원하는 오픈소스 프로젝트를 더 쉽게 찾을 수 있도록 도와주는 추천 검색 서비스
            </div>
          </header>

          <section className="panel">
            <div className="row">
              <div className="field">
                <label>찾고 싶은 프로젝트</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="찾고 싶은 프로젝트를 입력하세요."
                />
              </div>

              <div className="field small">
                <label>결과 개수</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(e) => {
                    const value = Number(e.target.value);

                    if (Number.isNaN(value)) {
                      setLimit("");
                    } else if (value > 50) {
                      setLimit(50);
                    } else if (value < 1) {
                      setLimit(1);
                    } else {
                      setLimit(value);
                    }
                  }}
                />
              </div>

              <div className="actions">
                <button
                  className="primary"
                  disabled={!canSubmit || status === "loading"}
                  onClick={handleSearch}
                >
                  {status === "loading" ? "처리 중..." : "검색하기"}
                </button>

                <button
                  className="danger"
                  disabled={status === "loading"}
                  onClick={handleClearDatabase}
                >
                  데이터 정리
                </button>
              </div>
            </div>

            <SearchProgress
              status={status}
              progress={progress}
              elapsedMs={elapsedMs}
              progressMessage={progressMessage}
            />

            <LoadingSteps status={status} loadingStep={loadingStep} />

            <div className="toolbar">
              <div className="toolbarField">
                <label>정렬</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="score">추천 점수순</option>
                  <option value="stars">스타 많은 순</option>
                  <option value="updated">최근 업데이트순</option>
                </select>
              </div>

              <div className="toolbarField">
                <label>언어 필터</label>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="resultSummary">
                총 <strong>{displayedRepos.length}</strong>개의 프로젝트
              </div>
            </div>

            <div className={`status ${status === "error" ? "error" : ""}`}>
              {message}
              {useMock && <span className="mockBadge">예시 데이터</span>}
            </div>
          </section>

          <section className="list">
            {displayedRepos.length === 0 ? (
              <div className="empty">표시할 검색 결과가 없습니다.</div>
            ) : (
              displayedRepos.map((repo) => (
                <RepoCard key={repo.id ?? repo.full_name} repo={repo} />
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}