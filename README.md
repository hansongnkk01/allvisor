# Allvisor

Multi-niche SaaS for Malaysian SMEs — **Clinic** and **Retail** first.

Stack: **Next.js** (Vercel) + **Supabase** + **GitHub** · Bilingual **BM / EN**

## Features

- Niche picker on landing (clinic / retail) with themed UI
- Multi-tenant organizations + roles (`owner` / `admin` / `staff`)
- CRM (patients / customers)
- Clinic appointments
- Retail POS (sale → invoice + stock deduct)
- Inventory + stock adjustments
- Invoices + payments
- Light accounting (income / expense / P&L)
- LHDN e-Invoice sandbox submission layer
- Subscription plan gating (Free / Starter / Growth / Pro)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
3. Authentication → enable Email provider
4. Copy Project URL + anon key + service role key

### 2. App env

```bash
cd allvisor
cp .env.example .env.local
```

Fill:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/ms](http://localhost:3000/ms)

### 4. Deploy (GitHub → Vercel)

1. Push this repo to GitHub
2. Import in Vercel (root directory: `allvisor` if monorepo parent)
3. Add the same env vars in Vercel
4. Deploy

## Soft-launch checklist

- [ ] Migration applied on production Supabase
- [ ] Auth email templates configured
- [ ] Env vars set on Vercel
- [ ] Test clinic: register → patient → appointment → invoice → LHDN sandbox
- [ ] Test retail: register → product → POS sale → stock → accounting
- [ ] Confirm RLS: user A cannot see org B data
- [ ] Staff role cannot delete organization / manage billing
- [ ] Connect Billplz/Stripe when ready (plan upgrade UI already exists)

## Scripts

- `npm run dev` — development
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint
