# Launch Checklist

Repeatable pre-deploy / post-deploy checklist for SocialMusicFi MVP.

---

## 1. Database

- [ ] PostgreSQL instance provisioned (e.g. Railway, Neon, Supabase)
- [ ] `DATABASE_URL` set in backend environment
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] (Optional) Seed demo data: `npm run db:seed`

## 2. Backend Secrets

Set these in the hosting dashboard (Railway, Render, etc.):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string (≥32 chars) |
| `JWT_REFRESH_SECRET` | Recommended | Defaults to `JWT_SECRET + "_refresh"` if omitted |
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` for production, `sk_test_...` for staging |
| `STRIPE_WEBHOOK_SECRET` | Yes | From Stripe dashboard → Webhooks |
| `FRONTEND_URL` | Yes | `https://socialmusicfi.com` in production |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `NODE_ENV` | Yes | `production` |

### On-Chain Payouts (optional for MVP soft-launch)

| Variable | Notes |
|---|---|
| `RPC_URL` | Polygon RPC (Alchemy / Infura / public) |
| `TOKEN_CONTRACT_ADDRESS` | Deployed ERC-20 address |
| `OPERATOR_PRIVATE_KEY` | Hot wallet private key — **keep secret** |
| `CHAIN_ID` | `137` (Polygon) or `11155111` (Sepolia testnet) |

> If these are not set, withdrawals are queued for manual admin batch (`POST /api/admin/rewards/distribute`).

- [ ] Operator wallet funded with enough tokens + native gas (MATIC/ETH)
- [ ] Verify operator balance via `GET /api/admin/payout-health` after deploy

### File Uploads (optional for MVP soft-launch)

| Variable | Notes |
|---|---|
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` | IAM / R2 access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |
| `S3_REGION` | `auto` for R2, or AWS region |
| `S3_ENDPOINT` | Required for Cloudflare R2 |
| `S3_CDN_URL` | Public URL prefix (optional) |

- [ ] Bucket created with appropriate access policy
- [ ] CORS on bucket allows frontend origin

### Email (optional for MVP soft-launch)

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | From Resend dashboard |
| `FROM_EMAIL` | Verified sender domain |

## 3. Backend Deploy

- [ ] Railway service linked to the correct project/service
- [ ] Build: `npm run build` (compiles to `dist/`)
- [ ] Start: `npm start` (runs `node dist/index.js`)
- [ ] Health check: `GET /api/health` returns `200`
- [ ] Verify production API: `https://socialfiapp-production.up.railway.app/api/health`

## 4. Stripe Webhook

- [ ] Create webhook endpoint in Stripe dashboard: `https://<backend>/webhooks/stripe`
- [ ] Subscribe to events:
  - `checkout.session.completed`
  - `payment_intent.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Copy signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Test with Stripe CLI: `stripe trigger checkout.session.completed`

## 5. Frontend Deploy

- [ ] Confirm the frontend project is deployed from Vercel for `https://socialmusicfi.com`
- [ ] Set `VITE_API_URL=https://socialfiapp-production.up.railway.app` in Vercel
- [ ] Set `VITE_DEMO_API_URL=<demo backend url>` in Vercel for the `/demo` showcase path
- [ ] Deploy frontend from the repo root on Vercel (`vercel.json` handles SPA routing)
- [ ] Verify SPA routing works (refresh on any page should not 404)
- [ ] Netlify is optional only; do not enable multiple live frontend hosts for the same domain

## 5A. Demo Backend Deploy

- [ ] Create a separate demo backend service (do not reuse production)
- [ ] Attach a separate Postgres database for demo only
- [ ] Set `DEMO_MODE=true` on the demo backend
- [ ] Set `FRONTEND_URL=https://socialmusicfi.com`
- [ ] Set `CORS_ORIGINS=https://socialmusicfi.com`
- [ ] Run `npx prisma migrate deploy` against the demo database
- [ ] Run `npm run db:seed` and `npm run db:seed:demo` against the demo database
- [ ] Verify `<demo backend>/api/health` returns `demoMode: true`
- [ ] Verify `https://socialmusicfi.com/demo` shows seeded showcase content

## 6. Smoke Tests

Run these manually after deploy:

- [ ] **Register** — new account with email + password
- [ ] **Login** — existing account
- [ ] **Email verification** — click link in email (if Resend configured)
- [ ] **Link wallet** — MetaMask connect + SIWE sign
- [ ] **Upload track** — MP3 file uploads and plays back (if S3 configured)
- [ ] **Subscribe** — Creator plan checkout completes, tier updates
- [ ] **Withdraw** — request withdrawal, verify on-chain tx or queued status
- [ ] **Admin panel** — `/admin` stats load, payout health shows correct data

## 7. Post-Deploy Monitoring

- [ ] Check `GET /api/health` periodically (uptime monitor)
- [ ] Watch server logs for `[payout]` warnings (indicates on-chain not configured)
- [ ] Monitor operator wallet balance (set up alert if below threshold)
- [ ] Review Stripe webhook delivery in dashboard (look for failures)

## Rollback

If something breaks after deploy:
1. Revert to previous deploy (Railway: redeploy previous, Vercel/Netlify: instant rollback)
2. Database: Prisma migrations are forward-only; to revert, create a new migration
3. Stripe: webhooks continue delivering; failed events auto-retry for 72 hours
4. Do not re-enable GitHub Pages for this repo unless the frontend hosting strategy is intentionally changed
