import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

describe("Node Version Consistency (Issue #109)", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const packageJsonPath = path.join(rootDir, "package.json");
  const nvmrcPath = path.join(rootDir, ".nvmrc");
  const readmePath = path.join(rootDir, "README.md");
  const ciPath = path.join(rootDir, ".github/workflows/ci.yml");

  it("ensures .nvmrc exists and specifies Node 20", () => {
    expect(fs.existsSync(nvmrcPath)).toBe(true);
    const nvmrcContent = fs.readFileSync(nvmrcPath, "utf-8").trim();
    expect(nvmrcContent).toBe("20");
  });

  it("ensures package.json engines specifies node >=18.18.0", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBe(">=18.18.0");
  });

  it("ensures CI NODE_VERSION matches .nvmrc", () => {
    const ciContent = fs.readFileSync(ciPath, "utf-8");
    const nvmrcContent = fs.readFileSync(nvmrcPath, "utf-8").trim();
    expect(ciContent).toContain(`NODE_VERSION: "${nvmrcContent}"`);
  });

  it("ensures README mentions .nvmrc and nvm use", () => {
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    expect(readmeContent).toContain(".nvmrc");
    expect(readmeContent).toContain("nvm use");
  });
});
