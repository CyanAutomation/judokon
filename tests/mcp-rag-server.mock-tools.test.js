import { beforeEach, describe, expect, it } from "vitest";

async function extractText(result) {
  const textEntry = result.content?.find((entry) => entry.type === "text");
  if (!textEntry) {
    throw new Error("Expected text content from MCP tool response");
  }
  return textEntry.text;
}

function createMockToolClient() {
  const tools = [
    {
      name: "query_rag",
      description: "Semantic search over repository knowledge",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" }
        }
      }
    },
    {
      name: "judokon.search",
      description: "Judoka search with filters",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          topK: { type: "integer", minimum: 1, maximum: 50 }
        }
      }
    },
    {
      name: "judokon.getById",
      description: "Fetch judoka by identifier",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: ["string", "number"] }
        }
      }
    }
  ];

  const rankedResults = [
    {
      id: 0,
      name: "Tatsuuma Ushiyama",
      rarity: "Legendary",
      weightClass: "+100",
      stats: { power: 9, speed: 9, technique: 9 },
      score: 0.92
    },
    {
      id: 1,
      name: "Mizuki Yamada",
      rarity: "Epic",
      weightClass: "-81",
      stats: { power: 8, speed: 7, technique: 8 },
      score: 0.81
    }
  ];

  return {
    async listTools() {
      return { tools };
    },
    async callTool({ name, arguments: args }) {
      if (name === "judokon.search") {
        if (!args?.query) {
          throw new Error("Query parameter is required");
        }

        const requestedTopK = args.topK ?? 8;
        const baseResults = args.query.toLowerCase().includes("powerful")
          ? rankedResults
          : rankedResults.slice(0, 1);
        const limitedResults = baseResults.slice(0, Math.min(requestedTopK, baseResults.length));

        return {
          isError: false,
          query: args.query,
          topK: limitedResults.length,
          results: limitedResults,
          content: [
            {
              type: "text",
              text: `Found ${limitedResults.length} judoka matching "${args.query}"`
            }
          ]
        };
      }

      if (name === "judokon.getById") {
        if (args?.id === 0 || args?.id === "0") {
          return {
            isError: false,
            found: true,
            judoka: rankedResults[0],
            content: [
              {
                type: "text",
                text: `${rankedResults[0].name} (${rankedResults[0].weightClass})`
              }
            ]
          };
        }

        return {
          isError: false,
          found: false,
          content: [{ type: "text", text: "Judoka not found" }]
        };
      }

      if (name === "query_rag") {
        if (!args?.query) {
          throw new Error("Query parameter is required");
        }
        return {
          isError: false,
          content: [
            {
              type: "text",
              text: `Top match for "${args.query}" is progressRAG.md`
            }
          ]
        };
      }

      throw new Error(`Unhandled tool ${name}`);
    }
  };
}

describe("MCP RAG tools (mocked)", () => {
  let client;

  beforeEach(() => {
    client = createMockToolClient();
  });

  it("exposes tool registration with schemas", async () => {
    const { tools } = await client.listTools({});

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toEqual(
      expect.arrayContaining(["query_rag", "judokon.search", "judokon.getById"])
    );

    const searchTool = tools.find((tool) => tool.name === "judokon.search");
    expect(searchTool?.inputSchema?.properties?.query?.type).toBe("string");
    expect(searchTool?.inputSchema?.properties?.topK?.minimum).toBe(1);

    const getByIdTool = tools.find((tool) => tool.name === "judokon.getById");
    expect(getByIdTool?.inputSchema?.properties?.id?.type).toEqual(["string", "number"]);

    const ragTool = tools.find((tool) => tool.name === "query_rag");
    expect(ragTool?.inputSchema?.required).toContain("query");
  });

  it("judokon.search returns ranked results with scores", async () => {
    const result = await client.callTool({
      name: "judokon.search",
      arguments: { query: "powerful judoka", topK: 2 }
    });

    expect(result.isError).toBe(false);
    expect(result.results).toHaveLength(result.topK);
    expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    expect(result.results[0]).toMatchObject({ rarity: "Legendary", weightClass: "+100" });
    expect(await extractText(result)).toContain(`Found ${result.topK} judoka matching`);
  });

  it("judokon.getById returns detailed record and not-found state", async () => {
    const foundResult = await client.callTool({ name: "judokon.getById", arguments: { id: 0 } });
    expect(foundResult.found).toBe(true);
    expect(foundResult.judoka).toMatchObject({ id: 0, weightClass: "+100" });

    const missingResult = await client.callTool({
      name: "judokon.getById",
      arguments: { id: "missing-id" }
    });
    expect(missingResult.found).toBe(false);
    expect(await extractText(missingResult)).toBe("Judoka not found");
  });

  it("tools reject invalid payloads", async () => {
    await expect(
      client.callTool({ name: "judokon.search", arguments: { topK: 2 } })
    ).rejects.toThrow(/Query parameter is required/);

    await expect(client.callTool({ name: "query_rag", arguments: {} })).rejects.toThrow(
      /Query parameter is required/
    );
  });
});
