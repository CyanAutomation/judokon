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

async function extractText(result) {
  const textEntry = result.content?.find((entry) => entry.type === "text");
  if (!textEntry) {
    throw new Error("Expected text content from MCP tool response");
  }
  return textEntry.text;
}

test.describe("MCP RAG Server", () => {
  const cwd = path.join(__dirname, "..");
  let client;
  let transport;

  test.beforeEach(async () => {
    ({ client, transport } = createMcpToolClient(cwd));

    const readyPromise = waitForServerReadiness(transport);
    await client.connect(transport);
    await readyPromise;
  });

  test.afterEach(async () => {
    try {
      await client?.close();
    } catch (error) {
      console.warn("Failed to close MCP client:", error);
    }
    try {
      await transport?.close();
    } catch (error) {
      console.warn("Failed to close transport:", error);
    }
  });

  test("should expose RAG tools with input schemas", async () => {
    const { tools } = await client.listTools({});

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toEqual(
      expect.arrayContaining(["query_rag", "judokon.search", "judokon.getById"])
    );

    const searchTool = tools.find((tool) => tool.name === "judokon.search");
    expect(searchTool?.inputSchema?.properties?.query?.type).toBe("string");
    expect(searchTool?.inputSchema?.required).toContain("query");

    const getByIdTool = tools.find((tool) => tool.name === "judokon.getById");
    expect(getByIdTool?.inputSchema?.required).toContain("id");

    const ragTool = tools.find((tool) => tool.name === "query_rag");
    expect(ragTool?.inputSchema?.required).toContain("query");
  });

  test("judokon.getById should return card details for known ID", async () => {
    const result = await client.callTool({ name: "judokon.getById", arguments: { id: 0 } });

    expect(result.isError).toBeFalsy();
    const text = await extractText(result);

    expect(text).toMatch(/Tatsuuma Ushiyama/i);
    expect(text).toMatch(/Country: \w+/);
    expect(text).toMatch(/Weight Class: \+?\d+/);
    expect(text).toContain("Card Code");
  });

  test("judokon.getById should surface not-found responses", async () => {
    const result = await client.callTool({ name: "judokon.getById", arguments: { id: "missing-id" } });

    expect(result.isError).toBeFalsy();
    const text = await extractText(result);
    expect(text).toMatch(/Judoka not found/i);
  });

  test("judokon.search should return ranked text output", async () => {
    const result = await client.callTool({
      name: "judokon.search",
      arguments: { query: "powerful judoka", topK: 3 }
    });

    const text = await extractText(result);
    if (result.isError) {
      expect(text).toMatch(/Search failed/i);
      expect(text).toMatch(/RAG_STRICT_OFFLINE|RAG_ALLOW_LEXICAL_FALLBACK|MiniLM/i);
    } else {
      expect(text).toMatch(/Found \d+ judoka matching/);
      expect(text).toMatch(/Stats: Power=/);
    }
  });

  test("tools should reject invalid payloads", async () => {
    await expect(
      client.callTool({ name: "judokon.search", arguments: { topK: 2 } })
    ).rejects.toThrow(/Query parameter is required/);

    await expect(
      client.callTool({ name: "query_rag", arguments: {} })
    ).rejects.toThrow(/Query parameter is required/);
  });
});
