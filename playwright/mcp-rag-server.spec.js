import { test, expect } from "./fixtures/commonSetup.js";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_READY_PATTERN = /JU-DO-KON! RAG MCP server started/i;

// Runtime expectations:
// - Only run when explicitly opted in because this spawns the live MCP RAG server via
//   scripts/mcp-rag-server.mjs (loads embeddings and judoka data, so startup can take a few seconds).
// - Requires access to node and the local embeddings JSON under src/data.
// - Set RUN_MCP_SMOKE=live to enable; otherwise the suite is skipped to avoid accidental CI usage.

async function waitForServerReadiness(transport, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        transport.stderr?.off("data", onData);
      }
    };

    const timeout = setTimeout(() => {
      if (!isResolved) {
        cleanup();
        reject(new Error("Timed out waiting for MCP server readiness"));
      }
    }, timeoutMs);

    const onData = (chunk) => {
      if (SERVER_READY_PATTERN.test(chunk.toString())) {
        isResolved = true;
        clearTimeout(timeout);
        transport.stderr?.off("data", onData);
        resolve();
      }
    };

    transport.stderr?.on("data", onData);
    transport.onerror = (error) => {
      cleanup();
      reject(error);
    };
  });
}

function extractTextContent(response) {
  return (response?.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function createMcpToolClient(cwd) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["scripts/mcp-rag-server.mjs"],
    cwd,
    stderr: "pipe"
  });

  const client = new Client({
    name: "playwright-mcp-client",
    version: "1.0.0"
  });

  return { transport, client };
}

const runMcpSmoke = process.env.RUN_MCP_SMOKE === "live";

test.describe.serial("MCP RAG server smoke", () => {
  test.skip(!runMcpSmoke, "Set RUN_MCP_SMOKE=live to start the live MCP server smoke");

  const cwd = path.join(__dirname, "..");

  test("lists tools and executes live judokon.search", async () => {
    const { client, transport } = createMcpToolClient(cwd);

    try {
      const readyPromise = waitForServerReadiness(transport);
      await client.connect(transport);
      await readyPromise;

      const { tools } = await client.listTools({});
      expect(tools.length).toBeGreaterThanOrEqual(3);
      expect(tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["query_rag", "judokon.search", "judokon.getById"])
      );

      const sampleQuery = "judoka search smoke check";
      const sampleQuery = "judoka search smoke check";
      let toolResult;
      try {
        toolResult = await client.callTool({
          name: "judokon.search",
          arguments: { query: sampleQuery, topK: 1 }
        });
      } catch (error) {
        throw new Error(`Tool call failed: ${error.message}`);
      }

      expect(toolResult.isError ?? false).toBe(false);
      const responseText = extractTextContent(toolResult);
      // More flexible assertion that handles various response formats
      expect(responseText.length).toBeGreaterThan(0);
      expect(responseText.toLowerCase()).toMatch(/found|judoka|matching|search/);
      expect(responseText).toContain(sampleQuery);
    } finally {
      await client.close();
      await transport.close();
    }
  });
});
