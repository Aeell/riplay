# Implementation Prerequisites & Context7 Fix Guide

> **Date:** 2026-02-19  
> **Purpose:** Exact credentials, configuration values, and environment details needed to implement the infrastructure plan  
> **Reference:** [`plans/kilo-code-mcp-infrastructure-plan.md`](plans/kilo-code-mcp-infrastructure-plan.md)

---

## Table of Contents

1. [Context7 MCP — Diagnosis & Fix](#1-context7-mcp--diagnosis--fix)
2. [Required Credentials & Configuration Values](#2-required-credentials--configuration-values)
3. [Per-Section Implementation Requirements](#3-per-section-implementation-requirements)

---

## 1. Context7 MCP — Diagnosis & Fix

### What Went Wrong

I found **three separate MCP configuration locations** on your system, and the Context7 setup has issues in two of them:

#### Location 1: VS Code Global MCP — `C:/Users/Stan/AppData/Roaming/Code/User/mcp.json`

```json
"io.github.upstash/context7": {
  "type": "stdio",
  "command": "npx",
  "args": ["@upstash/context7-mcp@1.0.31"],
  "env": {
    "CONTEXT7_API_KEY": "${input:CONTEXT7_API_KEY}"
  }
}
```

**Problem:** This is the **VS Code native MCP configuration** (used by GitHub Copilot Chat). It uses `${input:CONTEXT7_API_KEY}` which prompts for the key via VS Code input. **Kilo Code does NOT read this file.** This config only works for VS Code's built-in Copilot MCP integration, not for Kilo Code.

#### Location 2: Kilo Code Global MCP — `C:/Users/Stan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp", "--ctx7sk-3166d103-e286-489d-a4c8-429b6cc6febd", "ctx7sk-3166d103-e286-489d-a4c8-429b6cc6febd"]
      }
    }
  }
}
```

**Problems identified:**
1. **Wrong argument format** — The API key is passed as two separate CLI arguments (`--ctx7sk-...` and `ctx7sk-...`). Context7 MCP expects the API key as an **environment variable**, not as CLI arguments.
2. **Package name may be outdated** — `@upstash/context7-mcp` was the original package name. The current recommended package is `@context7/mcp` (rebranded).
3. **Missing `-y` flag** — Actually present, this is correct.

#### Location 3: Workspace MCP — `c:/develop/riplay/.kilocode/mcp.json`

```json
{"mcpServers":{}}
```

**Problem:** Empty. No workspace-level MCP servers configured.

### How Kilo Code MCP Configuration Works

Kilo Code has **two levels** of MCP configuration:

| Level | File Location | Scope | How to Edit |
|-------|--------------|-------|-------------|
| **Global** | `C:/Users/Stan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` | All workspaces | Kilo Code sidebar → MCP Servers → Edit Global Config |
| **Workspace** | `<project>/.kilocode/mcp.json` | Current project only | Kilo Code sidebar → MCP Servers → Edit Workspace Config |

**Important:** The VS Code native `C:/Users/Stan/AppData/Roaming/Code/User/mcp.json` is a **completely separate system** used by VS Code's built-in Copilot Chat MCP support. Kilo Code ignores this file entirely.

### Step-by-Step Fix for Context7

#### Step 1: Determine the correct package and API key format

Context7 MCP has been through naming changes:
- **Old:** `@upstash/context7-mcp` (Upstash era)
- **Current:** `@context7/mcp` (rebranded, latest)

Your API key `ctx7sk-3166d103-e286-489d-a4c8-429b6cc6febd` appears to be a valid Context7 secret key.

#### Step 2: Fix the Kilo Code Global MCP Configuration

Open the Kilo Code MCP settings via the sidebar (click the MCP Servers icon → Edit Global Config), or directly edit:

**File:** `C:/Users/Stan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`

**Replace the entire contents with:**

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp@latest"],
        "env": {
          "DEFAULT_MINIMUM_TOKENS": "10000",
          "CONTEXT7_API_KEY": "ctx7sk-3166d103-e286-489d-a4c8-429b6cc6febd"
        }
      }
    }
  }
}
```

**Key changes:**
- Removed the API key from `args` — it was being passed as CLI arguments which Context7 does not support
- Added `env.CONTEXT7_API_KEY` — this is the correct way to pass the API key
- Added `DEFAULT_MINIMUM_TOKENS` — ensures substantial documentation is returned
- Used `@upstash/context7-mcp@latest` — keeping the Upstash package name since that is what you have installed, with `@latest` to get the newest version

> **Note:** If `@upstash/context7-mcp` fails to resolve, try `@context7/mcp@latest` instead. The package may have been migrated.

#### Step 3: Verify the fix

1. After saving the file, **restart VS Code** (or reload the window with `Ctrl+Shift+P` → "Developer: Reload Window")
2. Open the Kilo Code sidebar
3. Click on "MCP Servers" section
4. Context7 should show a green status indicator (connected)
5. If it shows red/error, click on it to see the error log

#### Step 4: Test Context7

Ask Kilo Code something like: "Using Context7, look up the Three.js STLLoader API documentation"

If it works, you'll see Context7 being invoked in the tool calls.

### Common Context7 Failure Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Server failed to start" | npx can't find package | Run `npx @upstash/context7-mcp@latest --help` in terminal to verify |
| "Connection refused" | Node.js not in PATH | Ensure Node.js 18+ is installed and `npx` works from cmd.exe |
| "Authentication failed" | Invalid API key | Verify key at context7.com dashboard |
| "Timeout" | Slow npx cold start | First run downloads the package; wait 30-60 seconds |
| Server starts but no tools appear | Wrong JSON structure | Ensure the `"mcp": { "servers": { ... } }` nesting is correct |

---

## 2. Required Credentials & Configuration Values

### Summary Table

| Item | Needed For | Do You Have It? | Fallback If Missing |
|------|-----------|----------------|-------------------|
| **Context7 API Key** | Context7 MCP server | ✅ Yes — `ctx7sk-3166d103-...` found in config | Free tier available at context7.com |
| **GitHub Personal Access Token** | GitHub MCP server | ❓ Need to create/provide | Can skip GitHub MCP; use git CLI instead |
| **Docker Desktop** | Docker MCP server | ❓ Need to verify installed | Can skip Docker MCP; use docker CLI instead |
| **Node.js 18+** | All npx-based MCP servers | ❓ Need to verify version | Required — no fallback |
| **Sentry DSN** | Error monitoring (Phase 2) | ❓ Need to create account | Can defer; use console.error logging |
| **Plausible API Key** | Analytics (Phase 2) | ❓ Need to create account | Can defer; use no analytics initially |
| **OVHcloud VPS SSH credentials** | Server deployment (Phase 4) | ❓ Need to provide | Required for server-side features |
| **Domain DNS access** | CDN setup (Phase 4) | ❓ Need to verify | Required for Cloudflare/CDN |

### Detailed Requirements Per Credential

#### 2.1 GitHub Personal Access Token (PAT)

- **Why needed:** GitHub MCP server uses this to interact with your repository — create issues, manage PRs, trigger Actions, read workflow status
- **Where used:** `env.GITHUB_TOKEN` in MCP server config
- **How to create:**
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token (classic)" or "Fine-grained token"
  3. For fine-grained: scope to `Aeell/riplay` repository
  4. Permissions needed: `repo` (full), `workflow`, `read:org`
  5. Copy the token (starts with `ghp_` or `github_pat_`)
- **Fallback:** Skip the GitHub MCP server entirely. You can still use `git` commands via terminal. The GitHub MCP is a convenience, not a requirement.

#### 2.2 Docker Desktop Installation

- **Why needed:** Docker MCP server communicates with the Docker daemon to build images, manage containers, inspect logs
- **Where used:** Docker MCP server config
- **How to verify:** Run `docker --version` in terminal
- **Fallback:** If Docker Desktop is not installed or you prefer not to use it locally, skip the Docker MCP. You can manage Docker on the VPS via SSH instead.

#### 2.3 Node.js Version

- **Why needed:** All npx-based MCP servers require Node.js to run. Context7, Filesystem, Fetch, Puppeteer — all use npx.
- **Where used:** Every MCP server that uses `"command": "npx"`
- **How to verify:** Run `node --version` in terminal. Must be 18.0.0 or higher.
- **Fallback:** None. Node.js 18+ is a hard requirement. Install from https://nodejs.org/

#### 2.4 Sentry DSN (Phase 2 — Not Needed Now)

- **Why needed:** Client-side error tracking for WASM crashes and conversion failures
- **Where used:** Sentry SDK initialization in converter JavaScript
- **How to create:**
  1. Sign up at https://sentry.io (free tier: 5K errors/month)
  2. Create a new JavaScript project
  3. Copy the DSN string (looks like `https://abc123@o456.ingest.sentry.io/789`)
- **Fallback:** Defer entirely. Use `console.error` and browser DevTools for debugging. Add Sentry later when traffic grows.

#### 2.5 Plausible Analytics (Phase 2 — Not Needed Now)

- **Why needed:** Privacy-friendly usage tracking to understand which converters are most used
- **Where used:** Script tag in HTML pages
- **How to create:**
  1. Sign up at https://plausible.io (paid) or self-host (free, requires Docker on VPS)
  2. Add site domain `riplay.cz`
  3. Get the script snippet
- **Fallback:** Defer entirely. Or use a simpler alternative like GoatCounter (free, hosted).

#### 2.6 OVHcloud VPS SSH Credentials (Phase 4 — Not Needed Now)

- **Why needed:** Deploying the backend API, Redis, FreeCAD workers, and Nginx configuration
- **Where used:** SSH access for deployment scripts, Docker Compose on VPS
- **What's needed:**
  - VPS IP address
  - SSH username (typically `root` or a sudo user)
  - SSH key or password
  - Current Nginx configuration on the VPS
- **Fallback:** None for server-side features. Phase 4 cannot proceed without VPS access.

#### 2.7 Domain DNS Access (Phase 4 — Not Needed Now)

- **Why needed:** Setting up CDN (Cloudflare/BunnyCDN) for WASM binary delivery
- **Where used:** DNS records, SSL certificate management
- **What's needed:**
  - Access to DNS management for riplay.cz
  - Current DNS provider (registrar or Cloudflare)
- **Fallback:** Skip CDN. Serve everything directly from VPS/GitHub Pages. Performance will be lower for WASM binaries but functional.

---

## 3. Per-Section Implementation Requirements

### Phase 1: Foundation — MCP & Dev Environment

| Task | What You Need to Provide | What I Can Do Without You |
|------|-------------------------|--------------------------|
| Fix Context7 MCP | **Nothing** — I have the API key and know the fix | Apply the fix to `mcp_settings.json` |
| Install Filesystem MCP | **Nothing** — no credentials needed | Add to MCP config |
| Install GitHub MCP | **GitHub PAT token** | Everything else |
| Install Docker MCP | **Confirm Docker Desktop is installed** | Add to MCP config |
| Install Fetch MCP | **Nothing** — no credentials needed | Add to MCP config |
| Install Memory MCP | **Nothing** — no credentials needed | Add to MCP config |
| Create project rules | **Nothing** — derived from codebase analysis | Write `.kilocode/rules/` files |
| Create custom modes | **Nothing** — derived from project structure | Write `custom_modes.yaml` |

**Bottom line for Phase 1:** I need from you:
1. ✅ Context7 API key — already have it
2. ❓ GitHub PAT — create one or tell me to skip GitHub MCP
3. ❓ Confirm Docker Desktop is installed (run `docker --version`)
4. ❓ Confirm Node.js 18+ is installed (run `node --version`)

### Phase 2: CI/CD & Quality

| Task | What You Need to Provide | What I Can Do Without You |
|------|-------------------------|--------------------------|
| GitHub Actions for converter | **Nothing** — uses existing GitHub setup | Write workflow YAML |
| Vitest unit tests | **Nothing** | Write test files |
| Playwright E2E tests | **Nothing** | Write test files |
| Sentry integration | **Sentry DSN** (or defer) | Everything else |
| Analytics | **Plausible account** (or defer) | Everything else |

**Bottom line for Phase 2:** Entirely self-contained except for optional Sentry DSN and analytics account. Can proceed with zero input from you.

### Phase 3: Converter Enhancement

| Task | What You Need to Provide | What I Can Do Without You |
|------|-------------------------|--------------------------|
| PDF output in dxfHandler | **Nothing** | Implement with jsPDF |
| svg-to-dxf handler | **Nothing** | Implement new handler |
| Handler auto-discovery | **Nothing** | Refactor index.ts |
| Handler metadata schema | **Nothing** | Design and implement |
| Tool scaffolding template | **Nothing** | Create template |

**Bottom line for Phase 3:** Zero input needed. Pure code implementation.

### Phase 4: Backend & Scale

| Task | What You Need to Provide | What I Can Do Without You |
|------|-------------------------|--------------------------|
| Express/Fastify API | **VPS SSH access** | Write all code locally |
| Redis + BullMQ | **VPS SSH access** | Write Docker Compose |
| FreeCAD worker | **VPS SSH access** | Write Dockerfile |
| API versioning | **Nothing** | Implement in code |
| CDN setup | **DNS access + CDN account** | Configure CDN |
| npm workspaces | **Nothing** | Refactor project structure |

**Bottom line for Phase 4:** VPS SSH credentials and DNS access are required for deployment. All code can be written without them.

### Phase 5: Production Hardening

| Task | What You Need to Provide | What I Can Do Without You |
|------|-------------------------|--------------------------|
| Feature flags | **Nothing** | Implement in code |
| File size validation | **Nothing** | Implement in code |
| Service Worker | **Nothing** | Implement with Workbox |
| Grafana + Prometheus | **VPS SSH access** | Write Docker Compose |
| Backup strategy | **VPS SSH access** | Write backup scripts |

**Bottom line for Phase 5:** VPS access needed for monitoring deployment only.

---

## Quick Start Checklist

To begin implementation immediately, I need you to:

- [ ] **Verify Node.js version** — Run `node --version` in terminal and confirm 18+
- [ ] **Verify Docker** — Run `docker --version` in terminal (or tell me to skip Docker MCP)
- [ ] **GitHub PAT** — Create one at https://github.com/settings/tokens (or tell me to skip GitHub MCP)
- [ ] **Approve Context7 fix** — I'll update `mcp_settings.json` with the corrected configuration
- [ ] **Confirm which phases to start** — Phase 1 can begin immediately; Phase 2-3 need no additional input; Phase 4-5 need VPS access

Once you provide these, I can switch to Code mode and begin implementing Phase 1 immediately.
