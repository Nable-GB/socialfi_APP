# SocialMusicFi

Full-stack social music platform with token rewards, NFT music ownership, Stripe subscriptions, and automatic on-chain payouts.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express 4, Prisma (PostgreSQL), Stripe, ethers.js |
| Storage | S3 / Cloudflare R2 for media uploads |
| Blockchain | Polygon (or Sepolia testnet) — ERC-20 payouts |
| Email | Resend transactional emails |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Stripe account (test mode is fine for dev)

### 1. Backend

```bash
cd server
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, STRIPE keys
npm install
npx prisma migrate deploy     # run database migrations
npx prisma db seed             # seed demo data (optional)
npm run dev                    # starts on http://localhost:4000
```

### 2. Frontend

```bash
# from the app root
cp .env.example .env.local     # set VITE_API_URL if needed
npm install
npm run dev                    # starts on http://localhost:5173
```

## Project Structure

```
app/
├── server/                    # Express API
│   ├── prisma/                # Schema, migrations, seeds
│   └── src/
│       ├── config/env.ts      # All env variables
│       ├── controllers/       # Route handlers
│       ├── services/          # Business logic (onchain, upload, reward, email)
│       ├── webhooks/          # Stripe webhook handler
│       ├── middleware/        # Auth, rate-limit, sanitize, rawBody
│       └── routes/            # Express routers
├── src/                       # React frontend
│   ├── components/            # Pages & UI
│   ├── contexts/              # Auth, Player, Language
│   ├── hooks/                 # useFeed, useRewards, useWallet, etc.
│   ├── lib/api.ts             # API client with auto-refresh
│   └── locales/               # i18n (en, ko)
├── contracts/                 # Hardhat / Solidity (SocialFiTreasury)
└── public/                    # Static assets
```

## Key Flows

### Authentication
- Email/password registration + login
- SIWE (Sign-In With Ethereum) wallet login
- JWT access + refresh token rotation
- Email verification & password reset (via Resend)

### Music & Uploads
- Track upload (MP3/WAV/FLAC, up to 50 MB) → S3/R2
- Avatar, post media, NFT image uploads
- Music NFT minting (fractional ownership, royalties)
- Streaming with play-count tracking

### Monetisation
- **Ad campaigns** — merchants pay via Stripe; viewers earn token rewards
- **Subscriptions** — PRO / PREMIUM tiers via Stripe recurring checkout
- **Paid services** — verified badge, post boost (one-time Stripe checkout)
- **Withdrawals** — automatic ERC-20 payout when on-chain is configured, otherwise queued for admin batch
- **SMFI → ETH swap** — instant swap at configured rate

### Referrals
- Each user has a unique referral code
- 5 % commission on referred-user earnings (configurable via `REFERRAL_RATE`)

## Environment Variables

See **`server/.env.example`** for the full list.  
Key groups: Database · JWT · Stripe · Blockchain / Payouts · S3/R2 · Email · App.

The frontend only needs `VITE_API_URL` (see `.env.example` in the app root).

## Deployment

- **Frontend** — Vercel is the active production host for `https://socialmusicfi.com`. Set `VITE_API_URL` in the Vercel project. `vercel.json` is included for SPA routing.
- **Backend** — Railway is the active production host for `https://socialfiapp-production.up.railway.app`. Set all `server/.env.example` variables as Railway secrets.
- **Database** — Any PostgreSQL provider. Run `npx prisma migrate deploy` on first deploy.
- **Stripe webhook** — Point `https://<backend>/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET`.
- **Netlify** — `netlify.toml` is kept as an optional alternative frontend target, but it is not the current production path.
- **GitHub Pages** — Removed from this repo to avoid conflicting frontend deployment paths.

## Demo Deployment

The repo now supports a separate showcase experience at `/demo` on the same frontend host.

- **Frontend behavior** — `/` continues using the main API. `/demo` switches to `VITE_DEMO_API_URL` at runtime.
- **Demo backend** — Deploy a second backend service with a separate `DATABASE_URL` and `DEMO_MODE=true`.
- **Demo database** — Use a different Postgres instance or database from production.
- **Demo seeding** — After `npx prisma migrate deploy`, run:

```bash
cd server
npm run db:seed
npm run db:seed:demo
```

- **Demo reset** — To clear and rebuild the showcase dataset:

```bash
cd server
npm run db:clear:demo
npm run db:seed:demo
```

- **Demo safety** — Stripe checkout, service checkout, ad checkout, withdrawals, swaps, and Stripe webhooks are blocked or ignored when `DEMO_MODE=true`.
- **Env examples** — Use `.env.example` for the frontend plus `server/.env.example` for the backend. Copy the new demo-focused examples as a starting point when provisioning the demo services.

## License

MIT
