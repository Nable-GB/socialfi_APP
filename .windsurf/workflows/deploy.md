description: Deploy SocialFi app (backend to Railway, frontend to Vercel)
---

# Deploy SocialFi App

## 1. Pre-deploy: Verify builds pass

// turbo
```bash
cd server && npm run build
```

// turbo
```bash
npm run build
```

If either build fails, fix errors before proceeding.

## 2. Git commit & push

Stage all changed files, commit with a descriptive message, and push to `origin/main`:

```bash
git add -A
git commit -m "<descriptive message>"
git push origin main
```

- **Remote**: `origin` → `github.com/Nable-GB/socialfi_APP.git`
- **Branch**: `main`

Push is required before deployment if the local workspace contains uncommitted UI or backend changes.

## 3. Backend deploy via Railway CLI

### 3a. Check Railway CLI login

```bash
npx @railway/cli whoami
```

If it shows `Unauthorized`, login first:

```bash
npx @railway/cli login
```

Use the Railway account and workspace that own the production service.

### 3b. Link project (if not already linked)

```bash
npx @railway/cli status
```

If it shows `No linked project`, link it:

```bash
npx @railway/cli link -p tender-nurturing
```

When prompted:
- **Project**: `tender-nurturing`
- **Service**: `socialfi_APP`

### 3c. Deploy

```bash
npx @railway/cli up
```

This uploads the project, builds on Railway, and deploys. Wait for `Deploy complete` message.

### 3d. Apply database migrations

Run Prisma migrations against production before or immediately after the deploy if they are not part of the service startup:

```bash
cd server
npx prisma migrate deploy
```

## 4. Frontend deploy via Vercel

### 4a. Verify Vercel project settings

- Project root: repository root (`app/`)
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://socialfiapp-production.up.railway.app`

### 4b. Deploy

If Vercel is connected to the repository, the push to `main` triggers the production deploy automatically.

If you need a manual production deploy:

```bash
vercel --prod
```

## 5. Post-deploy verification

### 5a. Check Railway deploy logs

```bash
npx @railway/cli logs
```

Look for:
- `🚀 SocialFi API server running on http://localhost:4000`
- `Environment: production`
- `Frontend: https://socialmusicfi.com`

### 5b. Check API health

```bash
curl https://socialfiapp-production.up.railway.app/api/health
```

### 5c. Check frontend

Open `https://socialmusicfi.com` in a browser and verify the site loads correctly.

## Key reference

| Item | Value |
|------|-------|
| Railway project | `tender-nurturing` |
| Railway service | `socialfi_APP` |
| Production API | `https://socialfiapp-production.up.railway.app` |
| Production domain | `https://socialmusicfi.com` |
| Frontend host | `Vercel` |
| Frontend build cmd | `npm run build` (Vite → `dist/`) |
| Backend build cmd | `cd server && npm run build` (tsc → `server/dist/`) |
| Git branch | `main` |

## Troubleshooting

- **Railway CLI not found**: Use `npx @railway/cli <command>` instead of `railway <command>`
- **Unauthorized**: Run `npx @railway/cli login` and complete browser auth
- **No linked project**: Run `npx @railway/cli link -p tender-nurturing` and select service `socialfi_APP`
- **Prisma error after deploy**: Check `DATABASE_URL` env var in Railway dashboard
- **CORS errors**: Verify `FRONTEND_URL` and `CORS_ORIGINS` env vars in Railway include `https://socialmusicfi.com`
- **Old UI still live**: Confirm the latest changes were committed and pushed, then verify the Vercel production deployment used the updated commit
- **Conflicting frontend host**: Do not deploy this repo to GitHub Pages; Vercel is the active production frontend
