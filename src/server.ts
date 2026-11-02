import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  annotationsFor,
  callTool,
  CALL_TOOL,
  DISCOVERY_TOOLS,
  LIST_MODULES_TOOL,
  listModules,
  searchTools,
  SEARCH_TOOLS_TOOL,
} from "./discovery.js";
import { errorMessage } from "./utils/errors.js";
import { validateArgs, type ValidatableTool } from "./utils/validate.js";

export interface ServerTool {
  name: string;
  description: string;
  inputSchema: object;
}

export type ServerToolHandler = (name: string, args: Record<string, unknown>) => Promise<string>;

export interface ServerModule {
  name: string;
  description?: string;
  tools: ServerTool[];
  handler: ServerToolHandler;
}

export interface CreateServerOptions {
  version: string;
  modules: ServerModule[];
  /** List only the search/call/module meta-tools. */
  discovery?: boolean;
}

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/**
 * One MCP server instance. stdio uses a single instance; Streamable HTTP
 * creates one per session so session state cannot leak between clients.
 */
export function createServer({ version, modules, discovery = false }: CreateServerOptions): Server {
  const tools = modules.flatMap((mod) => mod.tools);
  const handlers = new Map<string, ServerToolHandler>();
  for (const mod of modules) {
    for (const tool of mod.tools) handlers.set(tool.name, mod.handler);
  }

  const server = new Server(
    { name: "mcp-swiss", version },
    { capabilities: { tools: {} } }
  );

  const listedTools = discovery
    ? DISCOVERY_TOOLS.map((tool) => ({ ...tool, annotations: annotationsFor(tool) }))
    : tools.map((tool) => ({ ...tool, annotations: TOOL_ANNOTATIONS }));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listedTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args ?? {}) as Record<string, unknown>;

    try {
      let result: string;
      if (discovery && name === SEARCH_TOOLS_TOOL.name) {
        result = searchTools(modules, safeArgs);
      } else if (discovery && name === LIST_MODULES_TOOL.name) {
        result = listModules(modules);
      } else if (discovery && name === CALL_TOOL.name) {
        result = await callTool(modules, safeArgs);
      } else if (discovery) {
        throw new Error(
          `Tool ${name} is not listed in discovery mode. Use swiss_search_tools, then swiss_call_tool.`
        );
      } else {
        const handler = handlers.get(name);
        if (!handler) throw new Error(`Unknown tool: ${name}`);
        const definition = tools.find((tool) => tool.name === name) as ValidatableTool | undefined;
        const validated = definition ? validateArgs(definition, safeArgs) : safeArgs;
        result = await handler(name, validated);
      }
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${errorMessage(error)}` }],
        isError: true,
      };
    }
  });

  return server;
}
