# API-comparison-rest-graphql

## 📊 Project Overview

This project is a comprehensive comparison between REST and GraphQL APIs, implemented as part of my Master's Thesis. The application demonstrates practical differences, performance characteristics, and implementation approaches of both API paradigms.

### Key Features
- Dual API implementation (REST & GraphQL) for the same functionality
- Performance benchmarking and analysis
- Modern tech stack implementation
- Real-world use case demonstration

### Technical Architecture
![Schemat bazy danych wersja 2 - 2025-05-18 162940](https://github.com/user-attachments/assets/c8095da4-2a58-4183-9b84-8d09fe77ecaa)
*Database schema visualization showing the core data model*

| REST API | GraphQL API |
|----------|-------------|
| <img width="100%" alt="REST" src="https://github.com/user-attachments/assets/63bd11bf-c7aa-44ca-9230-ab1326ad13e7" /> | <img width="100%" alt="GraphQL" src="https://github.com/user-attachments/assets/17bfc474-16e8-45c0-871f-e101307f3c35" /> |

<p align="center"><em>System Architecture Diagrams – REST vs GraphQL</em></p>

---
### Implementation Highlights
- [To be added: Screenshots of the application]
- [To be added: Performance comparison results]
- [To be added: Key technical challenges and solutions]

## ⚙️ Programme Preparation Manual (ENG)

To prepare the application environment after cloning the repository, follow the steps below:

---

### 1. Configure environment variables

Create a `.env` file in the project root by copying the template:

```bash
cp .env.template .env
```

Then fill in the required values accordingly.

### 2. Install dependencies

To install all dependencies for the entire monorepo:

```bash
npm install
```

To install dependencies for a specific workspace only (e.g., backend-graphql), run:

```bash
npm install -w backend-graphql
```

### 3. Additional requirements

If you're using the backend-graphql, firstly generate the Prisma client based on the current schema:

```bash
npx prisma generate --schema=backend-graphql/db/schema.prisma
```

### 4. Run a specific workspace

Start a specific workspace using its name. For example, to start the GraphQL backend:

Development:

```bash
npm run dev --workspace backend-graphql
```

Production:

```bash
npm run start --workspace backend-graphql
```
