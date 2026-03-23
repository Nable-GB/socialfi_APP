---
description: Deploy SocialFi app (backend to Railway, frontend auto-deploys via Railway GitHub integration)
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

## 3. Backend deploy via Railway CLI

### 3a. Check Railway CLI login

```bash
npx @railway/cli whoami
```

If it shows `Unauthorized`, login first:

```bash
npx @railway/cli login
```

- **Account**: `info@nableth.com`
- **Workspace**: `nable-gb`

### 3b. Link project (if not already linked)

```bash
npx @railway/cli status
```

If it shows `No linked project`, link it:

```bash
npx @railway/cli link -p tender-nurturing
```

When prompted:
- **Workspace**: `nable-gb's Projects`
- **Project**: `tender-nurturing`
- **Service**: `socialfi_APP`

### 3c. Deploy

```bash
npx @railway/cli up
```

This uploads the project, builds on Railway, and deploys. Wait for `Deploy complete` message.

## 4. Post-deploy verification

### 4a. Check Railway deploy logs

```bash
npx @railway/cli logs
```

Look for:
- `🚀 SocialFi API server running on http://localhost:4000`
- `Environment: production`
- `Frontend: https://socialmusicfi.com`

### 4b. Check API health

```bash
curl https://socialfiapp-production.up.railway.app/api/health
```

### 4c. Check frontend

Open `https://socialmusicfi.com` in a browser and verify the site loads correctly.

## Key reference

| Item | Value |
|------|-------|
| Railway project | `tender-nurturing` |
| Railway service | `socialfi_APP` |
| Production API | `https://socialfiapp-production.up.railway.app` |
| Production domain | `https://socialmusicfi.com` |
| Frontend build cmd | `npm run build` (Vite → `dist/`) |
| Backend build cmd | `cd server && npm run build` (tsc → `server/dist/`) |
| Git branch | `main` |

## Troubleshooting

- **Railway CLI not found**: Use `npx @railway/cli <command>` instead of `railway <command>`
- **Unauthorized**: Run `npx @railway/cli login` and complete browser auth
- **No linked project**: Run `npx @railway/cli link -p tender-nurturing` and select service `socialfi_APP`
- **Prisma error after deploy**: Check `DATABASE_URL` env var in Railway dashboard
- **CORS errors**: Verify `FRONTEND_URL` and `CORS_ORIGINS` env vars in Railway include `https://socialmusicfi.com`
