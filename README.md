# API-comparison-rest-graphql

Master - Thesis

## ⚙️ Programme Preparation Manual (ENG)

To prepare the application environment after cloning the repository, follow the steps below:

---

### 1. Configure environment variables

Create a `.env` file in the project root by copying the template:

```bash
cp .env.template .env
```

Then fill in the required values accordingly.

### 1. Install dependencies

To install all dependencies for the entire monorepo:

```bash
npm install
```

To install dependencies for a specific workspace only (e.g., backend-graphql), run:

```bash
npm install -w backend-graphql
```

### 2. Additional requirements

If you're using the backend-graphql, firstly generate the Prisma client based on the current schema:

```bash
npx prisma generate --schema=backend-graphql/db/schema.prisma
```

### 3. Run a specific workspace

Start a specific workspace using its name. For example, to start the GraphQL backend:

Development:

```bash
npm run dev --workspace backend-graphql
```

Production:

```bash
npm run start --workspace backend-graphql
```
