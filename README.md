# text-to-sql-agent-cli

Ask questions about your database with AI. This CLI uses Google Gemini (via LangChain) to generate SQL from natural language, executes it, prints the results as a table, and summarizes the answer. It also lets you run raw SQL and inspect your schema.

Features

- Ask: natural-language questions → SQL generation → execution → table preview → final answer
- SQL: execute a SQL script; on error, LLM explains the issue and suggests a fixed query
- Schema: print tables/columns and list relationships (FKs)
- Connect: set your DATABASE_URL
- Set LLM key: save your Gemini API key
- Supported DBs: PostgreSQL, MySQL, SQL Server (MSSQL)

Requirements

- Node.js
- Network access to your database and to Gemini API you can get free access from Google AI Studio

Setup

1. Install dependencies

```sh
npm install
```

2. (Optional) Build TypeScript

```sh
npm run build
```

Configure

- Save your Gemini API key (stored in %USERPROFILE%/.llmclirc)

```sh
./bin/dev.cmd set-llm-key
```

- Set your database URL

```sh
./bin/dev.cmd connect
```

Run (development)

- Show help

```sh
./bin/dev.cmd help
```

- Ask a question (flag)

```sh
./bin/dev.cmd ask --q "How many users signed up last week?"
```

- Ask a question (interactive)

```sh
./bin/dev.cmd ask
```

- Execute SQL

```sh
./bin/dev.cmd sql --sql "SELECT 1"
```

- Show schema and relationships

```sh
./bin/dev.cmd schema
```

Notes

- Config file path: %USERPROFILE%\.llmclirc (keys: GEMINI_API_KEY, DATABASE_URL)
- If you prefer running the compiled CLI, use `./bin/run.js` or on Windows `./bin/run.cmd`.
