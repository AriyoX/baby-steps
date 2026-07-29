import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const minimatchPath = fileURLToPath(
  new URL("../node_modules/minimatch/minimatch.js", import.meta.url),
);
const legacyImport = "var expand = require('brace-expansion')";
const compatibleImport = [
  "var braceExpansion = require('brace-expansion')",
  "var expand = typeof braceExpansion === 'function'",
  "  ? braceExpansion",
  "  : braceExpansion.expand",
  "",
  "if (typeof expand !== 'function') {",
  "  throw new TypeError('Unsupported brace-expansion API')",
  "}",
].join("\n");

const source = await readFile(minimatchPath, "utf8");

if (source.includes(compatibleImport)) {
  process.exit(0);
}

if (!source.includes(legacyImport)) {
  throw new Error(
    "Cannot patch minimatch: expected brace-expansion import was not found",
  );
}

await writeFile(
  minimatchPath,
  source.replace(legacyImport, compatibleImport),
  "utf8",
);
