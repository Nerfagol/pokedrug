# PokeDrug 🟡💊

**PokeDrug** is a small interactive quiz-experiment:  
can you tell a **Pokémon name** from a **real drug name**?

The project explores how similar fictional and scientific naming can sound —
and how easily our intuition gets confused between imagination and reality.

---

## 🎮 How it works
- Each round shows a name
- Choose: **🟡 Pokémon** or **💊 Drug**
- After answering, the corresponding image is revealed  
  (official Pokémon artwork or PubChem 2D structure)
- Automatic transition after 2 seconds
- After at least 20 questions, results can be submitted to the global leaderboard

---

## 📊 Metrics
- Total accuracy
- Accuracy split by category (drugs vs Pokémon)
- Session profile with a short sarcastic interpretation
- Global Top-10 leaderboard

Split format in the leaderboard: 💊82 / 🐭41 (percentages excluding skipped questions)

---

## 🧠 Motivation
This project was built as:
- a small UX and naming experiment
- a lightweight pet project / portfolio piece
- an example of clean vanilla JS without frameworks
- a demonstration of content-first UI for technical audiences

---

## 🛠️ Tech stack
- Vanilla **HTML / CSS / ES Modules**
- **FLUX.2** front page,logo, favicon generation
- **Supabase** (public anon key + Row Level Security)
- **PokéAPI** — official Pokémon artwork
- **PubChem PUG REST** — 2D structures for drug molecules
- **GitHub Pages** — static hosting

---

## 🔒 Security notes
Supabase is accessed using a public `anon` key.  
All write and read permissions are restricted via **Row Level Security (RLS)**.  
No private secrets are exposed in the frontend.

---

## 🚀 Deployment
The project is deployed as a static site using **GitHub Pages**.

---

## 👤 Author
[@epi_pharm](https://t.me/epi_pharm)

