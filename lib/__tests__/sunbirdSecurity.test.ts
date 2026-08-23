import { readFileSync } from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("Sunbird client security", () => {
  it("does not ship Sunbird bearer tokens or direct credential headers in client helpers", () => {
    const helperFiles = [
      "lib/lugandaTTS.ts",
      "lib/sunbirdApi.ts",
    ];

    const combined = helperFiles.map(readProjectFile).join("\n");

    expect(combined).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
    expect(combined).not.toContain(["YOUR", "ACCESS_TOKEN"].join("_"));
    expect(combined).not.toMatch(/Authorization\s*:/);
    expect(combined).not.toMatch(/Bearer\s+/);
  });
});
