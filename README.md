# 🔎 Open Source Search & Recommendation System

An intelligent search and recommendation system designed to help developers discover useful open-source repositories more efficiently.

This project improves repository discovery by integrating **semantic search**, **query refinement**, and **cross-encoder re-ranking** techniques.

---

# 📌 Overview

Finding relevant open-source projects is often difficult when using traditional keyword-based search systems.
This project aims to improve search quality by combining **semantic understanding** with **ranking techniques**.

The system analyzes repository information and returns more meaningful search results to users.

---

# 🎯 Motivation

Many developers struggle to find suitable open-source repositories using simple keyword searches.

This project addresses that problem by introducing:

* Semantic-based repository search
* Intelligent ranking algorithms
* Interactive query refinement

These techniques allow users to find more relevant and high-quality open-source projects.

---

# ✨ Key Features

🔎 **Semantic Search**
Search repositories based on meaning rather than exact keywords.

📊 **Cross-Encoder Re-ranking**
Improve search result relevance using advanced ranking models.

🔁 **Interactive Query Refinement**
Users can refine their search queries for better results.

💡 **Repository Recommendation**
Suggest related open-source projects based on search results.

🖥 **Web-based Interface**
User-friendly UI built with React.

---

# 🏗 System Architecture

The system consists of a **frontend interface**, **backend API**, and **database layer**.

```
User
  │
  ▼
React Frontend
  │
  ▼
FastAPI Backend
  │
  ▼
Search & Ranking Engine
  │
  ▼
Repository Database
```

---

# 🛠 Tech Stack

## Frontend

* ⚛️ React
* Axios

## Backend

* ⚡ FastAPI
* Python

## Database

* 🗄 MySQL

## Search / ML

* Semantic Search
* Cross-Encoder Re-ranking

---

# 📂 Project Structure

```
open_source_recommendation
│
├── backend
│   ├── main.py
│   ├── models.py
│   ├── db.py
│   └── requirements.txt
│
├── public
├── src
│   ├── App.js
│   └── components
│
├── package.json
└── README.md
```

---

# ⚙️ Installation

## 1️⃣ Backend Setup

```
pip install -r backend/requirements.txt
```

Run FastAPI server:

```
uvicorn backend.main:app --reload
```

---

## 2️⃣ Frontend Setup

Install dependencies:

```
npm install
```

Run React development server:

```
npm start
```

---

# 🚀 Usage

1️⃣ Start the backend server
2️⃣ Start the frontend server
3️⃣ Open the web interface in your browser

You can now search for open-source repositories using the system.

---

# 🔮 Future Work

* Improve recommendation accuracy
* Integrate GitHub API
* Add personalized recommendations
* Deploy the system to a cloud environment

---

# 👨‍💻 Author

**JiHoon Yoo**

Software Engineering Student
Sungkyunkwan University

---
