// PreToolUse: refuse edits to generated output, the lock file, the original
// card scans and env files. Exit code 2 sends the reason back to Claude.
import { relative } from "node:path";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { tool_input, cwd } = JSON.parse(input);
const file = tool_input?.file_path;
if (!file) process.exit(0);
const rel = relative(cwd ?? process.cwd(), file);
const rules = [
  [/^package-lock\.json$/, "lock file: change dependencies with npm instead"],
  [
    /^(out|\.next|node_modules|playwright-report|test-results)\//,
    "generated output",
  ],
  [
    /^cards\//,
    "original card scans: replace them by hand, then run npm run cards",
  ],
  [/(^|\/)\.env/, "env file"],
];
const hit = rules.find(([re]) => re.test(rel));
if (hit) {
  console.error(`Blocked edit to ${rel} (${hit[1]}).`);
  process.exit(2);
}
