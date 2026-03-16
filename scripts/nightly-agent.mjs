import OpenAI from "openai";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const issueNumber = process.env.ISSUE_NUMBER;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] }).trim();
}

function extractSection(body, title) {
  const regex = new RegExp(`## ${title}\\n([\\s\\S]*?)(\\n## |$)`, "i");
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}

function parseBulletList(text) {
  return text.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON not found");
  return JSON.parse(text.slice(start, end + 1));
}

const issueRaw = run(`gh issue view ${issueNumber} --json number,title,body`);
const issue = JSON.parse(issueRaw);

const allowedFiles = parseBulletList(extractSection(issue.body, "Allowed files"));
const goal = extractSection(issue.body, "Goal");
const why = extractSection(issue.body, "Why");
const doNotTouch = extractSection(issue.body, "Do not touch");
const acceptance = extractSection(issue.body, "Acceptance checks");

if (allowedFiles.length === 0) {
  throw new Error("Allowed files is empty. Refusing to run.");
}

const filePayload = [];
for (const file of allowedFiles) {
  try {
    const content = await fs.readFile(file, "utf8");
    filePayload.push({ path: file, content });
  } catch {
    filePayload.push({ path: file, content: "" });
  }
}

const prompt = `
You are a careful coding agent working on a React + Vite + Firebase app.
Solve this GitHub issue with the smallest safe change.

Issue #${issue.number}: ${issue.title}
Goal: ${goal}
Why: ${why}
Do not touch: ${doNotTouch}
Acceptance checks: ${acceptance}
Allowed files: ${allowedFiles.join(", ")}

Current files:
${JSON.stringify(filePayload)}

Return ONLY JSON:
{
  "summary": "short summary",
  "files": [
    { "path": "src/example.jsx", "content": "FULL FILE CONTENT" }
  ]
}

If unsafe, return: {"summary":"unsafe","files":[]}
`;

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 4000,
});

const result = extractJson(response.choices[0].message.content);

if (result.summary === "unsafe" || !Array.isArray(result.files) || result.files.length === 0) {
  run(`gh issue comment ${issueNumber} --body "⚠️ AI skipped: not safe to apply."`);
  process.exit(0);
}

for (const file of result.files) {
  if (!allowedFiles.includes(file.path)) {
    throw new Error(`Model tried to edit disallowed file: ${file.path}`);
  }
  await fs.writeFile(file.path, file.content, "utf8");
}

run(`gh issue comment ${issueNumber} --body "✅ AI generated changes. Checks running."`);
