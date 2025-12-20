import { test, expect } from "./fixtures/commonSetup.js";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_READY_PATTERN = /JU-DO-KON! RAG MCP server started/i;

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

const runMcpSmoke = !!process.env.RUN_MCP_SMOKE;

test.describe.serial("MCP RAG server smoke", () => {
  test.skip(!runMcpSmoke, "Set RUN_MCP_SMOKE=1 to run smoke test");

  const cwd = path.join(__dirname, "..");

  test("lists tools from live MCP server", async () => {
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
    } finally {
      await client.close();
      await transport.close();
    }
  });
});
