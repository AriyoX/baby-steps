import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "..");
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const readTypeScriptTree = (relativeDirectory: string): string => {
  const directory = path.join(repositoryRoot, relativeDirectory);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return [readTypeScriptTree(relativePath)];
      return /\.(?:ts|tsx)$/.test(entry.name) ? [read(relativePath)] : [];
    })
    .join("\n");
};

describe("closed-beta release hygiene", () => {
  it("pins the permanent Android identity without changing the app scheme", () => {
    const appConfig = JSON.parse(read("app.json")) as {
      expo: { scheme: string; android: { package: string } };
    };

    expect(appConfig.expo.android.package).toBe("com.babystepslearn.app");
    expect(appConfig.expo.android.package).not.toMatch(/prototype/i);
    expect(appConfig.expo.scheme).toBe("babysteps");
  });

  it("uses npm's lockfile workflow and contains the required runtime support", () => {
    const packageManifest = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
    };
    const workflow = read(".github/workflows/android-apk-build.yml");

    expect(workflow).toContain("npm ci");
    expect(workflow).not.toMatch(/\byarn(?:\s+install)?\b/);
    expect(packageManifest.dependencies).toEqual(
      expect.objectContaining({
        "expo-application": expect.any(String),
        "expo-secure-store": expect.any(String),
        "expo-system-ui": expect.any(String),
      }),
    );
    expect(packageManifest.dependencies).not.toHaveProperty("expo-sharing");
    expect(packageManifest.dependencies).not.toHaveProperty(
      "react-native-webview",
    );
  });

  it("keeps child source free of external web, browser, and system-share APIs", () => {
    const childSource = [
      readTypeScriptTree("app/child"),
      readTypeScriptTree("components/child"),
      readTypeScriptTree("components/coloring"),
    ].join("\n");

    expect(childSource).not.toMatch(
      /react-native-webview|\bWebView\b|expo-sharing|\bShare\.share\b/i,
    );
    expect(childSource).not.toMatch(
      /youtube\.com|youtu\.be|exampleVideo|Linking\.openURL|openBrowserAsync/i,
    );
  });

  it("does not restore removed fake/internal beta routes", () => {
    expect(fs.existsSync(path.join(repositoryRoot, "app/parent/child-progress.tsx"))).toBe(
      false,
    );
    expect(
      fs.existsSync(
        path.join(repositoryRoot, "app/parent/settings/[placeholder].tsx"),
      ),
    ).toBe(false);

    const parentSource = readTypeScriptTree("app/parent");
    expect(parentSource).not.toContain("Developer Info");
    expect(parentSource).not.toMatch(/Math\.random\(\).*progress/i);

    const childListSource = read("app/child-list.tsx");
    expect(childListSource).not.toContain("Lv1");
    expect(childListSource).not.toMatch(/placeholder level|Last activity/i);
    expect(childListSource).toContain("Profile created");
  });

  it("documents only public Expo variables and strips console calls in production", () => {
    const environmentExample = read(".env.example");
    const babelConfig = read("babel.config.js");

    expect(environmentExample).toContain("EXPO_PUBLIC_SUPABASE_URL=");
    expect(environmentExample).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY=");
    expect(environmentExample).not.toMatch(
      /^(?:EXPO_PUBLIC_)?SUPABASE_SERVICE_ROLE_KEY\s*=/m,
    );
    expect(environmentExample).not.toMatch(
      /^(?:EXPO_PUBLIC_)?ACCOUNT_DELETION_ADMIN_SECRET\s*=/m,
    );
    expect(environmentExample).toMatch(
      /never.*service-role.*deletion.*secret/is,
    );
    expect(babelConfig).toContain('process.env.NODE_ENV === "production"');
    expect(babelConfig).toContain("transform-remove-console");
  });

  it("keeps account reactivation and child restoration behind lifecycle RPCs", () => {
    const accountManagement = read("lib/accountManagement.ts");

    expect(accountManagement).toContain(
      'supabase.rpc(REACTIVATE_ACCOUNT_DELETION_RPC)',
    );
    expect(accountManagement).not.toMatch(
      /\.from\(["']account_deletion_requests["']\)[\s\S]{0,160}\.update\(/,
    );
    expect(accountManagement).not.toMatch(
      /\.from\(["']children["']\)[\s\S]{0,220}\.update\(\s*\{[\s\S]{0,120}deleted_at/,
    );
  });
});
