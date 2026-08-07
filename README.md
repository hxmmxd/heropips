# 🚀 HeroPips — Institutional-Grade AI Trading Automation Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

**HeroPips** ([heropips.com](https://heropips.com)) is an institutional-grade, AI-driven trading terminal, signal engine, and risk management platform.

---

## 🏛️ System Architecture

HeroPips is built as a modern full-stack web application leveraging the **Next.js App Router** for server-rendered UI and seamless API integrations. 

### ⚙️ Core Technologies
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend/API**: Next.js API Routes (`src/app/api`)
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Auth)
- **Trading Integration**: MT5 Farm / Broker API integrations (`src/lib/mt5farm.ts`, `src/lib/broker.ts`)
- **Design System**: Custom "Volt on Ink" UI with dynamic Light/Dark mode support.

---

## 🛠️ Key Features

* **AI Trading Terminal**: Institutional-grade UI for managing automated trading bots and analyzing market matrices.
* **Dynamic UI Theming**: Polished design system with seamless state transitions and a fully integrated light/dark mode.
* **Broker & MT5 Farm Connectors**: Fast, robust integration for position fetching, ticket tracking, and fast-path execution.
* **Advanced Security Gateways**: 256-bit encrypted gateways including mandatory 2-Factor Phone Verification for high-risk accounts.
* **Signal Engine**: Real-time signal parsing and webhook evaluation.

---

## 🚀 Getting Started (Local Development)

### 📋 Prerequisites
- **Node.js**: `>= 20.0.0`
- **Package Manager**: `npm` or `pnpm`

### 1. Setup Environment
Clone the repository and install dependencies:

```bash
git clone https://github.com/hxmmxd/heropips.git
cd heropips
npm install
```

### 2. Environment Variables
Copy the example environment file and configure your Supabase and MT5 Farm credentials:

```bash
cp .env.local.example .env.local
```

Ensure your `.env.local` contains the required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Start the Development Server
Launch the local Next.js development server:

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 🧰 Project Structure

```
heropips/
├── public/                 # Static assets, logos, and design system HTML
├── src/
│   ├── app/                # Next.js App Router pages, API routes, and global CSS
│   ├── components/         # Reusable React UI components (Sidebar, Terminal, Modals)
│   ├── lib/                # Core business logic, Supabase client, MT5 Farm adapters
│   └── types/              # TypeScript interfaces and type definitions
├── supabase/
│   └── migrations/         # Supabase SQL migrations (e.g. phone verification schema)
└── package.json
```

---

## 🚢 Deployment

HeroPips is optimized for deployment on **Vercel** or any standard Next.js hosting environment. Ensure all Supabase environment variables are securely configured in your production deployment settings.

---

## 📄 License
Proprietary Software. All rights reserved. © 2026 HeroPips Inc.
