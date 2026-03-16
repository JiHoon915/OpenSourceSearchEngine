# 🔎 Open Source Semantic Search & Recommendation System

An intelligent search system designed to help developers **discover relevant open-source repositories using natural language queries**.

This project enhances traditional keyword-based search by integrating **semantic search, repository embeddings, and vector similarity search**.

The system analyzes **repository metadata and README content** to provide more meaningful search results.

---

# 📌 Overview

Finding useful open-source repositories using traditional keyword search can be difficult because it relies heavily on exact word matches.

This project improves repository discovery by applying **semantic understanding to repository descriptions and README files**.

The system allows users to search repositories using **natural language queries**, and returns repositories that are **semantically similar to the query**.

Example query:

```
react note taking app similar to notion
```

Instead of matching keywords only, the system finds repositories whose **README content and project descriptions are semantically related**.

---

# 🎯 Motivation

Developers often struggle to find suitable open-source repositories using traditional keyword-based search.

Common problems include:

- Relevant repositories not appearing in search results
- Difficulty discovering projects with similar functionality
- Inefficient exploration of open-source ecosystems

This project aims to solve these issues by introducing:

- **Semantic repository search**
- **Vector similarity search**
- **Natural language query support**

---

# ✨ Key Features

### 🔎 Semantic Repository Search

Search repositories using **natural language queries** instead of exact keywords.

Example:

```
react app similar to notion for note taking
```

The system finds repositories whose **README and description match the meaning of the query**.

---

### 🧠 Vector Similarity Search

Repository information is converted into **vector embeddings** and indexed for fast similarity search using **FAISS (Facebook AI Similarity Search)**.

---

### 📦 GitHub Repository Ingestion

The system retrieves repository data from GitHub including:

- Repository metadata
- Repository README content

These data are stored in a database and used to build the search index.

---

### 🖥 Web-Based Interface

A simple web interface built with **React** allows users to:

- Search repositories
- View repository information
- Open GitHub repository pages directly

---

# 🏗 System Architecture

The system consists of three main components:

```
User
 │
 ▼
React Frontend
 │
 ▼
FastAPI Backend
 │
 ├── GitHub API (Repository Data)
 │
 ├── MySQL Database
 │
 └── FAISS Vector Index
       │
       ▼
Semantic Search Engine
```

---

# ⚙️ Search Pipeline

The semantic search pipeline works as follows:

```
User Query
   │
   ▼
SentenceTransformer Embedding
   │
   ▼
Vector Similarity Search
   │
   ▼
Top-K Repository Results
   │
   ▼
Repository Metadata Retrieval
   │
   ▼
Search Results Display
```

---

# 🛠 Tech Stack

## Frontend

- React  
- Axios  

## Backend

- FastAPI  
- Python  

## Database

- MySQL  

## Machine Learning / Search

- SentenceTransformers  
- FAISS (Vector Similarity Search)

## External API

- GitHub REST API

---

# 📂 Project Structure

```
open_source_recommendation
│
├── backend
│   ├── main.py
│   ├── db.py
│   ├── models.py
│   │
│   ├── services
│   │   └── embedding_service.py
│   │
│   ├── faiss_index
│   │
│   └── requirements.txt
│
├── src
│   ├── App.js
│   └── App.css
│
├── public
│
├── package.json
└── README.md
```

---

# ⚙️ Installation

## Backend Setup

Install Python dependencies:

```
pip install -r backend/requirements.txt
```

Run the backend server:

```
uvicorn backend.main:app --reload
```

---

## Frontend Setup

Install frontend dependencies:

```
npm install
```

Start the frontend development server:

```
npm start
```

---

# 🚀 Usage

Typical workflow:

### 1️⃣ Import repositories from GitHub

```
POST /ingest
```

Example request:

```
{
  "query": "react note app",
  "limit": 20
}
```

---

### 2️⃣ Build the search index

```
POST /build-index
```

This step generates vector embeddings for repositories and builds the search index.

---

### 3️⃣ Perform semantic search

```
GET /semantic-search
```

Example query:

```
/semantic-search?q=react note taking app similar to notion&limit=10
```

The system returns repositories that are **semantically similar to the query**.

---

# 🔮 Future Work

Planned improvements include:

- Cross-Encoder re-ranking for better search accuracy
- Interactive query refinement
- Personalized repository recommendations
- Automated repository ingestion pipeline
- Scalable deployment in a cloud environment

---

# 👨‍💻 Author

**JiHoon Yoo**

Software Engineering  
Sungkyunkwan University

---

# 📜 License

This project is developed for **academic and research purposes**.