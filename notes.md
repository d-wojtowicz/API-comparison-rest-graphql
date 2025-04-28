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

# TMP Notes:

High vulnerabilities came from npm install (for both of frontend)
