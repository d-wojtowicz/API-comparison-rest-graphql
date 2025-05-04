# Installation

## Root package installer

npm install

## Module new package installer

npm install -w backend-rest lib1 libN
npm install -w backend-rest -D devLib1 devLibN
npm install -w backend-graphql lib1 libN
npm install -w backend-graphql -D devLib1 devLibN

# Run

## Start backend

### [DEV]

npm run dev --workspace backend-rest
npm run dev --workspace backend-graphql

### [PROD]

npm run start --workspace backend-rest
npm run start --workspace backend-graphql

# Develop

## Init project - package.json

npm init -y

## Init ESLint - .eslintrc.json

npx eslint --init

## Init Prisma schema for database

npx prisma init

## Fetch Prisma schema from database

npx prisma db pull --schema=backend-graphql/db/schema.prisma

## Generate Prisma Client

npx prisma generate --schema=backend-graphql/db/schema.prisma

# TMP Notes:

1. High vulnerabilities came from npm install (for both of frontend)

2. Prisma warnings:
   These fields are not supported by Prisma Client, because Prisma currently does not support their types:

- Model: "projects", field: "search_vector", original data type: "tsvector"
- Model: "task_comments", field: "search_vector", original data type: "tsvector"
- Model: "tasks", field: "search_vector", original data type: "tsvector"

These constraints are not supported by Prisma Client, because Prisma currently does not fully support check constraints. Read more: https://pris.ly/d/check-constraints

- Model: "tasks", constraint: "tasks_priority_check"
- Model: "users", constraint: "users_role_check"

TODO: For fields with tsvector eventually implement queries and mutations with manual SQL instead of ORM's of Prisma.
TODO: Checking constraints - create data validation for these fields before saving to the database
