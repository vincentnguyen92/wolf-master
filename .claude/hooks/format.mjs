// PostToolUse: format the file Claude just edited with the repo's Prettier.
import { execFileSync } from "node:child_process";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path;
if (file && /\.(tsx?|mjs|js|json|css|md)$/.test(file))
  try {
    execFileSync("npx", ["prettier", "--write", "--ignore-unknown", file], {
      stdio: "ignore",
    });
  } catch {
    // A file Prettier cannot parse is not worth blocking the edit over.
  }
