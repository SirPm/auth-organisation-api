# Auth Organisation API

A REST API handling user authentication and organization management, built with 
Node.js, Express, Sequelize, and PostgreSQL.

## Features

- JWT-based authentication (jsonwebtoken)
- Password hashing with bcrypt
- Request validation with express-validator
- Organization management endpoints
- Tested with Jest and Supertest

## Tech stack

Node.js, Express, Sequelize, PostgreSQL, JWT, bcrypt, express-validator

## Running locally

\`bash
git clone https://github.com/SirPm/auth-organisation-api.git
cd auth-organisation-api
yarn install
yarn dev
\`

Requires a `.env` file with your PostgreSQL connection string and JWT secret.

## Tests

\`\`\`bash
yarn test
\`\`\`
