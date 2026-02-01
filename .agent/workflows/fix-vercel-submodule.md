---
description: Fix Vercel "No Next.js version detected" error in monorepo with orphan submodules
---

# Vercel Monorepo Deployment Fix

This workflow fixes a common Vercel deployment error where Next.js is not detected in a monorepo setup.

## Symptoms

- Vercel build fails with: `Error: No Next.js version detected`
- Warning: `Failed to fetch one or more git submodules`
- `pnpm install` or `npm install` runs but installs very few packages
- Root Directory is set correctly but Vercel still can't find the framework

## Root Cause

A subdirectory (e.g., `tikprofil-v2`) was previously an independent git repository or was incorrectly added as a submodule. It has its own `.git` folder but no corresponding `.gitmodules` entry in the parent repo.

This causes:

1. GitHub to treat it as an empty submodule reference
2. Vercel to clone an empty directory
3. No `package.json` with Next.js is found

## Solution Steps

// turbo-all

### 1. Verify the issue

```powershell
git submodule status
```

If you see `fatal: no submodule mapping found in .gitmodules for path 'FOLDER_NAME'`, you have an orphan submodule.

### 2. Remove the .git folder from the subdirectory

```powershell
Remove-Item -Recurse -Force FOLDER_NAME\.git
```

### 3. Remove from git cache (untrack the submodule reference)

```powershell
git rm --cached FOLDER_NAME
```

### 4. Re-add as regular directory

```powershell
git add FOLDER_NAME
```

### 5. Add vercel.json inside the subdirectory

Create `FOLDER_NAME/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### 6. Commit and push

```powershell
git commit -m "fix(monorepo): Convert FOLDER_NAME from submodule to regular directory"
git push origin main
```

### 7. Verify Vercel Dashboard Settings

- Go to Project Settings → General
- Set **Root Directory** to the subdirectory name (e.g., `tikprofil-v2`)
- Enable "Include files outside the root directory in the Build Step"
- Save and redeploy

## Prevention

- Never initialize a separate git repo inside a monorepo subdirectory
- Use proper Turborepo/pnpm workspace setup from the start
- If migrating existing repos, always remove `.git` before adding to monorepo
