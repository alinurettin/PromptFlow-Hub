# ✨ PromptFlow-Hub
> **Version-Controlled AI Prompt Engineering, Token Estimation & Cost Benchmarking Studio**  
> *Developed autonomously by the 7-Agent SDLC Team for [Ali Nurettin Demir](https://github.com/alinurettin)*

[![CI/CD Pipeline](https://github.com/alinurettin/PromptFlow-Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/alinurettin/PromptFlow-Hub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![Node: 18+](https://img.shields.io/badge/Node-18%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

---

## 🌟 Overview

**PromptFlow-Hub** is a zero-dependency, local-first prompt engineering studio designed for AI developers and LLM application builders.

- **Prompt Version Control:** Commit prompt iterations (`v1.0.0`, `v1.1.0`) with changelog messages and rollback support.
- **Real-Time Token & Cost Estimation:** Instant token counting and pricing calculation for Google Gemini 2.0 Flash, OpenAI GPT-4o, and Anthropic Claude 3.5 Sonnet.
- **Template Variables:** Auto-detection of `{{variable_name}}` tags with dynamic interpolation.
- **Zero External Dependencies:** Built with native Node.js standard libraries for maximum security and zero maintenance.

---

## 🚀 Quick Start

### 1. Web Studio GUI
```bash
git clone https://github.com/alinurettin/PromptFlow-Hub.git
cd PromptFlow-Hub
npm start
```
Open **`http://localhost:5000`** in your browser.

### 2. Docker Compose
```bash
docker-compose up -d
```

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/prompts` | List all version-controlled prompts. |
| `POST` | `/api/prompts` | Create a new prompt template. |
| `POST` | `/api/prompts/:id/version` | Commit a new version to an existing prompt. |
| `POST` | `/api/estimate` | Calculate token counts and model costs for text. |
| `POST` | `/api/interpolate` | Fill `{{variables}}` inside a template with JSON values. |

---

## 👤 Author & License

- **Author:** Ali Nurettin Demir ([@alinurettin](https://github.com/alinurettin))
- **Autonomous Team:** 7-Agent SDLC Software Factory
- **License:** [MIT License](LICENSE)
