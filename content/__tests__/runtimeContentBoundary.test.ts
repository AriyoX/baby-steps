import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const repositoryRoot = path.join(__dirname, "..", "..");
const productionRoots = ["app", "components", "content", "context", "hooks", "lib"];

const productionTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    const relativePath = path.relative(repositoryRoot, absolutePath);

    if (
      relativePath.split(path.sep).some((part) => part === "__tests__") ||
      relativePath.split(path.sep).some((part) => part === "testFixtures")
    ) {
      return [];
    }

    if (statSync(absolutePath).isDirectory()) {
      return productionTypeScriptFiles(absolutePath);
    }

    return /\.(?:ts|tsx)$/.test(entry) && !/\.test\.(?:ts|tsx)$/.test(entry)
      ? [absolutePath]
      : [];
  });

describe("production content boundary", () => {
  it("has no production import of the former Hub JSON or removed local registries", () => {
    const forbiddenImport =
      /learningHubContent\.json|content\/(?:games\/(?:lugandawords|countingGameStages|wordgamewords)|runyankole|luganda\/index)|from\s+["']@\/content["']/;
    const offenders = productionRoots
      .flatMap((root) => productionTypeScriptFiles(path.join(repositoryRoot, root)))
      .filter((file) => forbiddenImport.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(repositoryRoot, file));

    expect(offenders).toEqual([]);
  });

  it("keeps the obsolete local game registries deleted", () => {
    const removedFiles = [
      "content/index.ts",
      "content/luganda/index.ts",
      "content/runyankole/index.ts",
      "content/games/lugandawords.ts",
      "content/games/countingGameStages.ts",
      "content/games/wordgamewords.ts",
    ];

    expect(
      removedFiles.filter((file) => existsSync(path.join(repositoryRoot, file))),
    ).toEqual([]);
  });
});
