import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const issueNumber = process.env.ISSUE_NUMBER;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set.");
}
if (!issueNumber) {
  throw new Error("ISSUE_NUMBER is not set.");
}

function run(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  }).trim();
}

function normalizeNewlines(text = "") {
  return text.replace(/\r\n/g, "\n");
}

function extractSection(body, title) {
  const normalized = normalizeNewlines(body);
  const regex = new RegExp(`## ${title}\\n([\\s\\S]*?)(\\n## |$)`, "i");
  const match = normalized.match(regex);
  return match ? match[1].trim() : "";
}

function parseBulletList(text) {
  return normalizeNewlines(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function isPathAllowed(filePath, allowedFiles) {
  return allowedFiles.includes(filePath);
}

async function ensureDebugDir() {
  const dir = path.resolve(".nightly-agent-debug");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function saveDebugFile(fileName, content) {
  const dir = await ensureDebugDir();
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function commentIssueSafe(message) {
  try {
    run(`gh issue comment ${issueNumber} --body ${JSON.stringify(message)}`);
  } catch (err) {
    console.error("Failed to comment on issue:", err);
  }
}

const issueRaw = run(`gh issue view ${issueNumber} --json number,title,body`);
const issue = JSON.parse(issueRaw);

const body = normalizeNewlines(issue.body || "");
const allowedFiles = parseBulletList(extractSection(body, "Allowed files"));
const goal = extractSection(body, "Goal");
const why = extractSection(body, "Why");
const doNotTouch = extractSection(body, "Do not touch");
const acceptance = extractSection(body, "Acceptance checks");

if (allowedFiles.length === 0) {
  throw new Error("Allowed files is empty. Refusing to run.");
}

const MAX_FILE_CHARS = 2000;
const filePayload = [];

for (const file of allowedFiles) {
  try {
    const content = await fs.readFile(file, "utf8");
    const truncated = content.length > MAX_FILE_CHARS;
    const visibleContent = truncated
      ? content.slice(0, MAX_FILE_CHARS) + "\n// ... (truncated)"
      : content;

    filePayload.push({
      path: file,
      truncated,
      content: visibleContent,
    });
  } catch {
    filePayload.push({
      path: file,
      truncated: false,
      content: "",
    });
  }
}

const hasTruncatedFiles = filePayload.some((f) => f.truncated);

const prompt = `
You are a careful coding agent.
Make the smallest safe change to solve this issue.

Issue: ${issue.title}

Goal:
${goal || "(not provided)"}

Why:
${why || "(not provided)"}

Do not touch:
${doNotTouch || "(not provided)"}

Acceptance checks:
${acceptance || "(not provided)"}

Allowed files:
${allowedFiles.join(", ")}

Important safety rules:
- Only edit files listed in "Allowed files".
- If the change cannot be made safely, return safe=false.
- If a target file is truncated and you cannot safely reconstruct the FULL updated file, return safe=false.
- Do not include markdown, code fences, or explanations outside JSON.
- Return full updated file contents only for files you are changing.
- If no change is needed, return safe=false with a short reason in summary.

Files:
${filePayload
  .map(
    (f) => `=== ${f.path} ===
TRUNCATED: ${f.truncated ? "yes" : "no"}
${f.content}`
  )
  .join("\n\n")}
`.trim();

await saveDebugFile("prompt.txt", prompt);

let parsed;

try {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a coding agent. Return ONLY valid JSON that matches the provided schema.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "nightly_agent_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            safe: { type: "boolean" },
            files: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  path: { type: "string" },
                  content: { type: "string" },
                },
                required: ["path", "content"],
              },
            },
          },
          required: ["summary", "safe", "files"],
        },
      },
    },
    max_tokens: 2500,
  });

  const rawText = (response.choices?.[0]?.message?.content || "").trim();
  await saveDebugFile("raw-response.json.txt", rawText);

  if (!rawText) {
    throw new Error("Model returned empty content.");
  }

  parsed = JSON.parse(rawText);
} catch (err) {
  console.error("nightly-agent failed:", err);
  await commentIssueSafe(
    `⚠️ AI failed before applying changes.\n\nReason: ${err.message || String(err)}`
  );
  process.exit(1);
}

if (
  typeof parsed !== "object" ||
  parsed === null ||
  typeof parsed.summary !== "string" ||
  typeof parsed.safe !== "boolean" ||
  !Array.isArray(parsed.files)
) {
  await commentIssueSafe("⚠️ AI returned invalid JSON shape. No changes applied.");
  process.exit(1);
}

if (parsed.safe === false || parsed.files.length === 0) {
  const reason = parsed.summary || "Not safe to apply automatically.";
  await commentIssueSafe(`⚠️ AI skipped: ${reason}`);
  process.exit(0);
}

for (const file of parsed.files) {
  if (
    !file ||
    typeof file.path !== "string" ||
    typeof file.content !== "string"
  ) {
    throw new Error("Model returned an invalid file entry.");
  }

  if (!isPathAllowed(file.path, allowedFiles)) {
    throw new Error(`Model tried to edit disallowed file: ${file.path}`);
  }

  await fs.writeFile(file.path, file.content, "utf8");
}

const truncatedNote = hasTruncatedFiles
  ? "\n\nNote: Some input files were truncated in the prompt. Please review carefully."
  : "";

await commentIssueSafe(
  `✅ AI generated changes.\n\nSummary: ${parsed.summary}${truncatedNote}`
);