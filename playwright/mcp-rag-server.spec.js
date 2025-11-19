import { test, expect } from "./fixtures/commonSetup.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright tests for MCP RAG Server
 * These tests validate that the MCP server can be started and responds correctly
 */

test.describe("MCP RAG Server Health Checks", () => {
  let serverProcess;
  const cwd = path.join(__dirname, "..");

  const SERVER_READY_PATTERN = /RAG MCP server started/i;

  async function waitForServerStartup(proc, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for MCP server readiness"));
      }, timeoutMs);

      const onOutput = (chunk) => {
        const text = chunk.toString();
        if (SERVER_READY_PATTERN.test(text)) {
          cleanup();
          resolve();
        }
      };

      const onExit = (code, signal) => {
        cleanup();
        reject(new Error(`MCP server exited before readiness (code: ${code}, signal: ${signal})`));
      };

      const cleanup = () => {
        clearTimeout(timer);
        proc.stderr?.off("data", onOutput);
        proc.stdout?.off("data", onOutput);
        proc.off("exit", onExit);
      };

      proc.stderr?.on("data", onOutput);
      proc.stdout?.on("data", onOutput);
      proc.on("exit", onExit);
    });
  }

  async function probeServerHealth(proc, timeoutMs = 5000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (proc.exitCode === null && proc.pid) {
        try {
          process.kill(proc.pid, 0);
          return;
        } catch (error) {
          if (error.code !== "ESRCH") {
            throw error;
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("MCP server health probe failed");
  }

  async function waitForProcessExit(proc, timeoutMs = 5000) {
    if (!proc) return;
    if (proc.exitCode !== null) return;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for MCP server to exit")), timeoutMs);

      const onExit = () => {
        clearTimeout(timer);
        resolve();
      };

      proc.once("exit", onExit);
    });
  }

  test.beforeEach(async () => {
    // Start the MCP server as a subprocess
    serverProcess = spawn("npm", ["run", "rag:mcp"], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });

    await waitForServerStartup(serverProcess);
    await probeServerHealth(serverProcess);
  });

  test.afterEach(async () => {
    // Clean up the server process
    if (serverProcess) {
      serverProcess.kill();
      await waitForProcessExit(serverProcess);
    }
  });

  test("should verify data files exist", async () => {
    const judokaPath = path.join(cwd, "src/data/judoka.json");
    const embeddingsPath = path.join(cwd, "src/data/client_embeddings.json");

    expect(fs.existsSync(judokaPath)).toBe(true);
    expect(fs.existsSync(embeddingsPath)).toBe(true);
  });

  test("should load judoka data correctly", async () => {
    const judokaPath = path.join(cwd, "src/data/judoka.json");
    const judokaData = JSON.parse(fs.readFileSync(judokaPath, "utf8"));

    expect(Array.isArray(judokaData)).toBe(true);
    expect(judokaData.length).toBeGreaterThan(0);

    // Verify first judoka has required fields
    const firstJudoka = judokaData[0];
    expect(firstJudoka).toHaveProperty("id");
    expect(firstJudoka).toHaveProperty("firstname");
    expect(firstJudoka).toHaveProperty("surname");
    expect(firstJudoka).toHaveProperty("country");
    expect(firstJudoka).toHaveProperty("rarity");
    expect(firstJudoka).toHaveProperty("stats");
  });

  test("should load embeddings data correctly", async () => {
    const embeddingsPath = path.join(cwd, "src/data/client_embeddings.json");
    const embeddingsData = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));

    expect(Array.isArray(embeddingsData)).toBe(true);
    expect(embeddingsData.length).toBeGreaterThan(0);

    // Verify first embedding has required fields
    const firstEmbedding = embeddingsData[0];
    expect(firstEmbedding).toHaveProperty("id");
    expect(firstEmbedding).toHaveProperty("text");
    expect(firstEmbedding).toHaveProperty("embedding");
    expect(Array.isArray(firstEmbedding.embedding)).toBe(true);
  });

  test("should verify MCP server script exists", async () => {
    const serverPath = path.join(cwd, "scripts/mcp-rag-server.mjs");
    expect(fs.existsSync(serverPath)).toBe(true);

    // Verify it's a readable file with MCP imports
    const content = fs.readFileSync(serverPath, "utf8");
    expect(content).toContain("@modelcontextprotocol/sdk");
    expect(content).toContain("query_rag");
    expect(content).toContain("judokon.search");
    expect(content).toContain("judokon.getById");
  });

  test("should have proper tool definitions in server", async () => {
    const serverPath = path.join(cwd, "scripts/mcp-rag-server.mjs");
    const content = fs.readFileSync(serverPath, "utf8");

    // Check for tool definitions
    expect(content).toContain('name: "query_rag"');
    expect(content).toContain('name: "judokon.search"');
    expect(content).toContain('name: "judokon.getById"');

    // Check for input schemas
    expect(content).toContain("inputSchema");
  });

  test("should verify test files are in place", async () => {
    const unitTestPath = path.join(cwd, "tests/mcp-rag-server.test.js");
    const integrationTestPath = path.join(cwd, "tests/mcp-rag-server-integration.test.js");

    expect(fs.existsSync(unitTestPath)).toBe(true);
    expect(fs.existsSync(integrationTestPath)).toBe(true);

    // Verify test content
    const unitTestContent = fs.readFileSync(unitTestPath, "utf8");
    expect(unitTestContent).toContain("describe");
    expect(unitTestContent).toContain("judokon.search");
    expect(unitTestContent).toContain("judokon.getById");

    const integrationTestContent = fs.readFileSync(integrationTestPath, "utf8");
    expect(integrationTestContent).toContain("describe");
    expect(integrationTestContent).toContain("Tool Discovery");
  });

  test("should have valid npm scripts for RAG operations", async () => {
    const packageJsonPath = path.join(cwd, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    expect(packageJson.scripts).toHaveProperty("rag:mcp");
    expect(packageJson.scripts).toHaveProperty("rag:query");
    expect(packageJson.scripts).toHaveProperty("rag:validate");
    expect(packageJson.scripts).toHaveProperty("check:rag");

    // Verify scripts reference correct files
    expect(packageJson.scripts["rag:mcp"]).toContain("mcp-rag-server.mjs");
    expect(packageJson.scripts["rag:query"]).toContain("queryRagCli.mjs");
  });

  test("should have agent documentation", async () => {
    const agentsPath = path.join(cwd, "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(true);

    const content = fs.readFileSync(agentsPath, "utf8");
    expect(content).toContain("MCP Server Integration");
    expect(content).toContain("judokon.search");
    expect(content).toContain("judokon.getById");
  });

  test("should verify judoka.json has diverse data", async () => {
    const judokaPath = path.join(cwd, "src/data/judoka.json");
    const judokaData = JSON.parse(fs.readFileSync(judokaPath, "utf8"));

    // Check for diversity in countries
    const countries = new Set(judokaData.map((j) => j.country));
    expect(countries.size).toBeGreaterThan(1);

    // Check for diversity in rarities
    const rarities = new Set(judokaData.map((j) => j.rarity));
    expect(["Common", "Epic", "Legendary"].some((r) => rarities.has(r))).toBe(true);

    // Check for diversity in weight classes
    const weightClasses = new Set(judokaData.map((j) => j.weightClass));
    expect(weightClasses.size).toBeGreaterThan(1);
  });

  test("should verify embeddings have consistent dimensions", async () => {
    const embeddingsPath = path.join(cwd, "src/data/client_embeddings.json");
    const embeddingsData = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));

    // Get dimension from first embedding
    const firstDim = embeddingsData[0]?.embedding?.length;
    expect(firstDim).toBeGreaterThan(0);

    // Verify all embeddings have same dimension (sample check)
    const sample = embeddingsData.slice(0, 10);
    for (const embedding of sample) {
      expect(embedding.embedding.length).toBe(firstDim);
    }
  });
});

test.describe("MCP Server Tool Configuration", () => {
  const cwd = path.join(__dirname, "..");

  test("should have correct tool input schemas", async () => {
    const serverPath = path.join(cwd, "scripts/mcp-rag-server.mjs");
    const content = fs.readFileSync(serverPath, "utf8");

    // Check query_rag schema
    expect(content).toContain("query_rag");
    expect(content).toContain("Search query");

    // Check judokon.search schema
    expect(content).toContain("judokon.search");
    expect(content).toContain("topK");
    expect(content).toContain("filters");

    // Check judokon.getById schema
    expect(content).toContain("judokon.getById");
  });

  test("should have handlers for all tools", async () => {
    const serverPath = path.join(cwd, "scripts/mcp-rag-server.mjs");
    const content = fs.readFileSync(serverPath, "utf8");

    // Check for handler functions
    expect(content).toContain("handleJudokonSearch");
    expect(content).toContain("handleJudokonGetById");
  });

  test("should have CallToolRequestSchema handler", async () => {
    const serverPath = path.join(cwd, "scripts/mcp-rag-server.mjs");
    const content = fs.readFileSync(serverPath, "utf8");

    expect(content).toContain("CallToolRequestSchema");
    expect(content).toContain("setRequestHandler");
  });
});
