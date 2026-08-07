# 🚀 HeroPips — Institutional-Grade AI Trading Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.26.1-F69220?style=flat-square&logo=pnpm)](https://pnpm.io)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-3.7_KRaft-231F20?style=flat-square&logo=apachekafka)](https://kafka.apache.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)]()

**HeroPips** ([heropips.com](https://heropips.com)) is an institutional-grade, event-driven AI trading automation, signal engine, risk management, and academy platform.

---

## 🏛️ System Architecture

HeroPips is constructed as an **event-driven microservices monorepo** managed via `pnpm` workspaces and `Turborepo`. 

```
                               ┌───────────────────────────┐
                               │   Cloudflare CDN & WAF    │
                               └─────────────┬─────────────┘
                                             │
                               ┌─────────────▼─────────────┐
                               │ Next.js App Router (web)  │
                               └─────────────┬─────────────┘
                                             │
       ┌─────────────────────────────────────┴─────────────────────────────────────┐
       │                                                                           │
       ▼ (gRPC / Sub-ms Fail-Closed)                                               ▼ (Kafka Event Bus)
┌──────────────┐                                                         ┌──────────────────┐
│   risk-svc   │                                                         │  hp.order.intents│
└──────┬───────┘                                                         └────────┬─────────┘
       │                                                                          │
┌──────▼───────┐                                                         ┌────────▼─────────┐
│execution-svc │◄────────────────────────────────────────────────────────┤  connector-svc   │
└──────────────┘                                                         └────────┬─────────┘
                                                                                  │
                                                                         ┌────────▼─────────┐
                                                                         │  MetaAPI / MT5   │
                                                                         └──────────────────┘
```

### 🧩 Monorepo Structure

```
heropips/
├── apps/
│   ├── web/                     # Next.js 15 App Router (Standalone Docker container)
│   └── services/
│       ├── identity/            # AuthN/AuthZ, TOTP 2FA, Argon2id, Sessions, Chat
│       ├── billing/             # Crypto Billing via NOWPayments, LTD Seats, Invoices
│       ├── growth/              # Waitlist, Referral Queue-Jump, Academy Progress, Messaging
│       ├── signal/              # Signal Strategy Engine & Bar-Close Evaluators
│       └── trading/             # Broker Connections, Positions, Orders, Equity Curves
├── packages/
│   ├── contracts/               # Shared Protobuf & Zod Schemas
│   └── ui/                      # "Volt on Ink" Design System UI Components & Tokens
├── infra/
│   ├── compose/                 # Docker Compose profiles (local, staging, production)
│   ├── mocks/                   # NOWPayments Sandbox Proxy Mock Server
│   └── sql/                     # PostgreSQL Migrations & Seed DDL Scripts
└── scripts/                     # Preflight checks, Stack Orchestrator, Security Scanners
```

---

## ⚙️ Core Technical Highlights

* **Fail-Closed Risk Execution**: Synchronous gRPC pre-trade risk evaluation (`risk-svc`) enforcing strict drawdowns, maximum position sizing, and panic breakers. If `risk-svc` is unavailable, execution fails closed instantly.
* **Database-per-Service Isolation**: Each service owns its dedicated PostgreSQL database (`hp_identity`, `hp_billing`, `hp_growth`, `hp_signal`, `hp_trading`) with Row-Level Security (`RLS`) and case-insensitive `citext` indexing.
* **Non-Card Crypto Subscriptions**: Crypto payments powered by NOWPayments IPNs, featuring auto-converting USDT treasury settlements, seat hold reservations, and automated renewal engines.
* **Double-Entry Financial Ledger**: `ledger-svc` enforces double-entry accounting ($\sum \text{Debits} = \sum \text{Credits}$) for affiliate rewards, referral bonuses, and lifetime seat grants.
* **Security & Envelope Encryption**: Broker credentials (MetaAPI/CCXT) are encrypted using envelope encryption (HashiCorp Vault) and exist only in `connector-svc` memory.
* **Dynamic UI Theming**: Features a polished "Volt on Ink" design system with robust light/dark mode support and seamless state transitions across the platform.

---

## 🛠️ Getting Started (Local Development)

### 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `>= 22.0.0`
- **Package Manager**: `pnpm >= 10.26` (via Corepack)
- **Container Runtime**: Docker Desktop or Docker Engine + Docker Compose v2

---

### 🚀 1. Setup Environment

Clone the repository and copy the development environment file:

```bash
git clone https://github.com/hxmmxd/heropips.git
cd heropips
cp .env.local.example .env.local
```

Enable Corepack for `pnpm`:

```bash
corepack enable
```

---

### 🐳 2. Start the Local Docker Stack

To launch the complete platform (all 10 microservice containers, databases, Kafka, and Mailpit) in a single command:

```bash
pnpm stack:up
```

*This command automatically validates toolchains, boots PostgreSQL, Kafka, and Redis, compiles all microservices, and runs database migrations.*

---

### 🌐 3. Local Service Endpoints

Once `pnpm stack:up` reports `Local stack ready`, access the local endpoints:

| Service | Protocol | Local URL / Connection |
| :--- | :--- | :--- |
| **Web Application** | HTTP | [http://localhost:3000](http://localhost:3000) |
| **Identity Service** | HTTP/WS | `http://localhost:4003` |
| **Billing Service** | HTTP | `http://localhost:4002` |
| **Signal Service** | HTTP | `http://localhost:4004` |
| **Trading Service** | HTTP | `http://localhost:4005` |
| **Mailpit (Local Email UI)** | Web UI | [http://localhost:8025](http://localhost:8025) |
| **NOWPayments Mock** | HTTP | `http://localhost:4090` |
| **PostgreSQL 16** | TCP | `postgres://hp:hp@localhost:5432` |
| **Apache Kafka** | TCP | `localhost:9094` |

---

### 🔑 Pre-Seeded Admin & Demo Credentials

Use these credentials to log in on **[http://localhost:3000/app/login](http://localhost:3000/app/login)**:

- **Admin Account**: `hero2@heropips.dev`
- **Password**: `volt-ink-2026!`
- **Role**: `Admin` & `Founding Hero`

---

## 🧰 Project Scripts & Commands

```bash
# Stack Management
pnpm stack:up        # Boot full local container stack & run migrations
pnpm stack:ps        # View live container status & health checks
pnpm stack:logs      # Tail logs across all running containers
pnpm stack:down      # Stop and tear down local container stack

# Database Operations
pnpm db:seed         # Seed demo leaderboard, waitlist, and certificates
pnpm db:verify       # Verify PostgreSQL database schemas and migrations

# Preflight & Security Guardrails
pnpm preflight       # Run pre-flight health & toolchain diagnostic checks
pnpm security:scan   # Run secret scanner, brand guard, and vulnerability audit
pnpm typecheck       # Perform TypeScript type checking across monorepo
pnpm lint            # Run ESLint across web app & microservices
```

---

## 🚢 Staging & Production Deployment

HeroPips is built for containerized deployment (ADR-009) on any Linux server (Ubuntu 22.04/24.04 LTS) or Kubernetes cluster (`k3s`):

```bash
# Staging deployment
pnpm stack:staging:up

# Production deployment
pnpm stack:prod:up
```

---

## 📄 License

Proprietary Software. All rights reserved. © HeroPips.
