import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface ServerTool {
  name: string;
  description: string;
  inputSchema: object;
}

export type ServerToolHandler = (name: string, args: Record<string, unknown>) => Promise<string>;

export interface ServerModule {
  name: string;
  tools: ServerTool[];
  handler: ServerToolHandler;
}

export interface CreateServerOptions {
  version: string;
  modules: ServerModule[];
}

/**
 * One MCP server instance. stdio uses a single instance; Streamable HTTP
 * creates one per session so session state cannot leak between clients.
 */
export function createServer({ version, modules }: CreateServerOptions): Server {
  const tools = modules.flatMap((mod) => mod.tools);
  const handlers = new Map<string, ServerToolHandler>();
  for (const mod of modules) {
    for (const tool of mod.tools) handlers.set(tool.name, mod.handler);
  }

  const server = new Server(
    { name: "mcp-swiss", version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args ?? {}) as Record<string, unknown>;
    try {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`Unknown tool: ${name}`);
      const result = await handler(name, safeArgs);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
