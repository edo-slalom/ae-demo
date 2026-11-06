# Accelerated Engineering Demo

An end-to-end AI-powered engineering pipeline where agents write the code and humans approve the outcomes — all inside GitHub.

```
Issue (brief)
    │
    ▼  [label: needs-spec]
┌───────────────────────────────┐
│  🤖 Spec Agent                │  GitHub Action
│  Reads issue → writes SPEC.md │
│  Opens spec PR                │
└───────────────────────────────┘
    │
    ▼
◆ GATE 1 — Spec Approval
  Human reviews spec PR and merges
    │
    ▼  [spec PR merged]
┌───────────────────────────────┐
│  🤖 Dev Agent                 │  GitHub Action
│  Reads SPEC.md → writes app   │
│  Opens feature PR             │
└───────────────────────────────┘
    │   simultaneously ↓
┌───────────────────────────────┐
│  🤖 Review Agent              │  GitHub Action
│  Reads diff + spec            │
│  Posts inline findings to PR  │
└───────────────────────────────┘
    │
    ▼
◆ GATE 2 — Acceptance
  Human reviews code + agent findings, merges PR
    │
    ▼  [feature PR merged]
┌───────────────────────────────┐
│  🚀 Staging Deploy            │  GitHub Action
│  Runs smoke tests             │
│  Posts test results to PR     │
└───────────────────────────────┘
    │
    ▼
◆ GATE 3 — Release
  Human creates a GitHub Release
    │
    ▼  [release published]
┌───────────────────────────────┐
│  🎯 Production Deploy         │  GitHub Action
│  Deploys to production        │
│  Updates release notes        │
└───────────────────────────────┘
```

## Demo Scenario

**Smart Returns Portal** — a retail self-service returns feature.

Customers enter an order number to validate their return window, select items and reason, and receive a Return Authorization number with a prepaid shipping label. An admin dashboard shows all pending returns.

## Prerequisites

1. **Anthropic API key** — Add `ANTHROPIC_API_KEY` as a repository secret:
   - Go to **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com](https://console.anthropic.com)

2. **GitHub Actions** — enabled by default on public repos.

3. **Labels** — created automatically when you run the setup below.

## Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/ae-demo
cd ae-demo

# Create required labels
gh label create "needs-spec"     --color "0075ca" --description "Triggers the Spec Agent"
gh label create "spec"           --color "e4e669" --description "Spec PR — awaiting Gate 1"
gh label create "feature"        --color "7057ff" --description "Feature PR — awaiting Gate 2"
gh label create "feature-request" --color "d93f0b" --description "New feature brief"
```

Branch protection (recommended for demos — enforces the gates):
- Go to **Settings → Branches → Add rule** for `main`
- Enable: **Require a pull request before merging**, **Require approvals: 1**

## Demo Walkthrough

### Step 1 — Submit the brief

Create a new issue using the **Feature Request** template:
- **Feature Name:** Smart Returns Portal
- **Problem Statement:** Customers must call support to initiate returns, creating long wait times and high call volume. 15% of calls are return-related.
- **Key Requirements:**
  - Customer enters order number and email to look up order
  - System validates order is within 30-day return window
  - Customer selects items to return and provides a reason
  - System generates a Return Authorization (RA) number
  - System shows a prepaid shipping label (mocked URL)
  - Admin dashboard shows all pending returns
- **Priority:** High
- **Out of Scope:** Actual carrier API integration, refund processing, email notifications

### Step 2 — Trigger the Spec Agent (Gate 1)

Add the label **`needs-spec`** to the issue. The Spec Agent runs automatically (~30s):
- Calls Claude to generate a full technical specification
- Creates a `spec/issue-N` branch with `SPEC.md`
- Opens a spec PR and posts a link back to the issue

**Review the spec PR.** Check that it accurately reflects the requirements, the API contracts make sense, and the acceptance criteria are testable. **Merge to approve.**

### Step 3 — Dev Agent builds the app (Gate 2)

Merging the spec PR triggers the Dev Agent (~60-90s):
- Reads `SPEC.md` and calls Claude to generate a full Node.js implementation
- Commits the app to a `feature/issue-N` branch
- Opens a feature PR

Simultaneously, the **Review Agent** runs on the new PR:
- Diffs the code against `SPEC.md`
- Posts a structured review comment with security, correctness, quality, and spec-compliance findings

**Review the code and the agent review.** Address any critical findings. **Merge to approve.**

### Step 4 — Staging (automated)

Merging the feature PR triggers staging:
- Installs app dependencies
- Runs smoke tests
- Posts a staging summary comment on the PR

### Step 5 — Release (Gate 3)

Go to **Releases → Draft a new release**:
- Tag: `v1.0.0`
- Title: `Smart Returns Portal v1.0.0`
- Publish the release

The Release Agent runs, posts a mock production deploy, and updates the release notes with deployment details.

## Resetting for a Fresh Demo

```bash
# Delete all branches created by agents
git push origin --delete $(git branch -r | grep -E 'spec/|feature/' | sed 's/origin\///')

# Delete SPEC.md from main if it was merged
git checkout main
git pull
git rm -f SPEC.md app/ 2>/dev/null || true
git commit -m "reset: clean state for fresh demo" --allow-empty
git push

# Close and delete any open issues/PRs via GitHub UI or:
gh issue list --state open --json number -q '.[].number' | xargs -I{} gh issue close {}
gh pr list --state open --json number -q '.[].number' | xargs -I{} gh pr close {}
```

## Architecture

| Component | Technology |
|-----------|------------|
| Orchestration | GitHub Actions |
| AI Agent model | Claude claude-sonnet-4-6 (Anthropic) |
| Agent scripts | Node.js ESM |
| App backend | Express.js |
| App frontend | Vanilla HTML/CSS/JS |
| Data store | In-memory (demo) |
| Tests | Node built-in `node:test` |

## Files

```
.github/
  ISSUE_TEMPLATE/
    feature-request.yml   # Structured brief form
  PULL_REQUEST_TEMPLATE.md
  workflows/
    01-spec.yml           # Gate 1: Spec Agent
    02-develop.yml        # Dev Agent (triggered after Gate 1)
    03-review.yml         # Review Agent (runs on feature PRs)
    04-staging.yml        # Staging deploy (triggered after Gate 2)
    05-release.yml        # Gate 3: Production deploy
scripts/
  spec-agent.mjs          # Calls Claude → writes SPEC.md
  dev-agent.mjs           # Calls Claude → writes app code
  review-agent.mjs        # Calls Claude → posts PR review
  package.json
app/                      # Populated by Dev Agent at runtime
```
