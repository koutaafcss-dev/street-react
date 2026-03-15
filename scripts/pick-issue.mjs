import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const raw = run(
  `gh issue list --label ai-task --state open --limit 20 --json number,title,body,labels`
);

const issues = JSON.parse(raw);

const target = issues.find((issue) => {
  const labels = issue.labels.map((l) => l.name);
  return !labels.includes("unsafe") && !labels.includes("in-progress");
});

const outputFile = process.env.GITHUB_OUTPUT;

if (!target) {
  fs.appendFileSync(outputFile, `issue_number=\n`);
  process.exit(0);
}

run(`gh issue edit ${target.number} --add-label in-progress`);
run(`gh issue comment ${target.number} --body "🤖 Nightly job started."`);

fs.appendFileSync(outputFile, `issue_number=${target.number}\n`);