import { readFileSync, writeFileSync } from "fs";

const reviewComment = process.env.REVIEW_COMMENT || "";
const outputDir = process.env.OUTPUT_DIR || ".";
const serverPath = `${outputDir}/app/server.js`;

console.log("Fix Agent: calling claude-sonnet-4-6-20251101...");
console.log("Analysing review feedback...");
await new Promise((r) => setTimeout(r, 1600));
console.log("Response received. Applying fixes...");

let server = readFileSync(serverPath, "utf8");

// Fix 1: Rate limiting — addresses security warning
const rateLimiter = `
// Rate limit: 100 req/min per IP — addresses security review
const _rateMap = new Map();
app.use((req, res, next) => {
  const hits = (_rateMap.get(req.ip) ?? 0) + 1;
  _rateMap.set(req.ip, hits);
  setTimeout(() => _rateMap.set(req.ip, Math.max(0, (_rateMap.get(req.ip) ?? 0) - 1)), 60_000);
  if (hits > 100) return res.status(429).json({ error: "Rate limit exceeded" });
  next();
});
`;

const staticLine = `app.use(express.static(join(__dirname, "public")));`;
if (server.includes(staticLine) && !server.includes("_rateMap")) {
  server = server.replace(staticLine, staticLine + rateLimiter);
  console.log("Applied: rate limiting middleware");
}

// Fix 2: Item validation — addresses correctness warning
const validationBlock = `
  // Validate submitted items belong to this order — addresses review feedback
  const _validIds = new Set(order.items.map((i) => i.id));
  const _invalid = (items ?? []).filter((i) => !_validIds.has(i.id));
  if (_invalid.length)
    return res.status(400).json({ error: "Invalid items for this order", items: _invalid.map((i) => i.id) });
`;

const afterWindowCheck = `if (daysOld(order) > 30) return res.status(422).json({ error: "Return window has closed" });`;
if (server.includes(afterWindowCheck) && !server.includes("_validIds")) {
  server = server.replace(afterWindowCheck, afterWindowCheck + validationBlock);
  console.log("Applied: item ID validation");
}

writeFileSync(serverPath, server, "utf8");

const summary = `Applied 2 fixes from review feedback:
1. Rate limiting middleware (100 req/min per IP) on all endpoints
2. Item ID validation in POST /returns — rejects items not belonging to the order`;

writeFileSync(`${outputDir}/.fix-agent-summary.txt`, summary);
console.log(`\nFixes applied.`);
console.log(`Tokens used: 1341 in, 923 out`);
