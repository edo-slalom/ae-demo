import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";

const client = new Anthropic();

const diff = process.env.PR_DIFF || "";
const specPath = process.env.SPEC_PATH || "SPEC.md";
const spec = existsSync(specPath) ? readFileSync(specPath, "utf8") : "";

if (!diff) {
  console.error("PR_DIFF environment variable is required");
  process.exit(1);
}

const response = await client.messages.create({
  model: "claude-sonnet-4-6-20251101",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: `You are a senior code reviewer at a software consultancy. Review this pull request.

${spec ? `TECHNICAL SPECIFICATION:\n${spec}\n\n---\n\n` : ""}PULL REQUEST DIFF:
${diff}

Write a thorough code review in Markdown. Use this exact structure:

## 🤖 Code Review — Automated Agent Analysis

### Overall Assessment
One paragraph summary of the implementation quality.

### Findings

For each finding use this format:
**[🔴 Critical | 🟡 Warning | 🟢 Info]** \`filename:line\` — description of issue and suggested fix

Group findings under these categories:
- **Security** (injection, auth, data exposure)
- **Correctness** (bugs, edge cases, logic errors)
- **Quality** (naming, structure, maintainability)
- **Test Coverage** (what's tested, what's missing)

### Spec Compliance
Check each acceptance criterion from the spec. Use ✅ / ❌ / ⚠️.

### Verdict
**[APPROVE ✅ | REQUEST CHANGES ❌ | COMMENT 💬]**

> Findings that must be addressed before merge: [count or "none"]`,
    },
  ],
});

process.stdout.write(response.content[0].text);
