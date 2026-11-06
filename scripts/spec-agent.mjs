import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";

const client = new Anthropic();

const issueTitle = process.env.ISSUE_TITLE || "";
const issueBody = process.env.ISSUE_BODY || "";
const outputPath = process.env.OUTPUT_PATH || "SPEC.md";

const response = await client.messages.create({
  model: "claude-sonnet-4-6-20251101",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: `You are a senior technical architect at a software consultancy. Convert this feature request into a detailed technical specification document.

Feature Request Title: ${issueTitle}

Feature Request Body:
${issueBody}

Write a complete SPEC.md document with exactly these sections:

# ${issueTitle} — Technical Specification

## 1. Overview
One paragraph describing what we're building and the business value.

## 2. Acceptance Criteria
Given/When/Then format. Number each criterion. These will be used for QA gate.

## 3. API Contracts
For each endpoint: method, path, request body schema, response schema, error responses. Use JSON examples.

## 4. Data Model
Every entity with field names, types, and descriptions. Markdown table format.

## 5. Implementation Plan
Ordered numbered list of implementation tasks. Be specific.

## 6. Out of Scope
Bullet list of what we are explicitly NOT building in this iteration.

Be concrete and specific. This spec will be used to generate working code.`,
    },
  ],
});

const spec = response.content[0].text;
writeFileSync(outputPath, spec);
console.log(`Spec written to ${outputPath}`);
console.log(`Tokens used: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
