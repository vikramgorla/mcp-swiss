import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  annotationsFor,
  callTool,
  CALL_TOOL,
  DEFAULT_PINNED,
  LIST_MODULES_TOOL,
  listModules,
  pinnedTools,
  searchToolFor,
  searchTools,
  SEARCH_TOOLS_TOOL,
  serverInstructions,
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
  /** List the search/call/module meta-tools plus pinned tools (the default mode). */
  discovery?: boolean;
  /** Tools listed directly next to the meta-tools in discovery mode. */
  pinned?: string[];
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
/** What tools/list returns and what initialize says, for a given setup. */
export function listing(modules: ServerModule[], discovery: boolean, pinned: string[] = DEFAULT_PINNED) {
  if (!discovery) {
    return {
      tools: modules.flatMap((mod) => mod.tools).map((tool) => ({ ...tool, annotations: TOOL_ANNOTATIONS })),
      instructions: undefined as string | undefined,
    };
  }
  const pins = pinnedTools(modules, pinned);
  const meta = [searchToolFor(modules), CALL_TOOL, LIST_MODULES_TOOL];
  return {
    tools: [
      ...meta.map((tool) => ({ ...tool, annotations: annotationsFor(tool) })),
      ...pins.map((tool) => ({ ...tool, annotations: TOOL_ANNOTATIONS })),
    ],
    instructions: serverInstructions(modules, pins),
  };
}

export function createServer({
  version,
  modules,
  discovery = false,
  pinned = DEFAULT_PINNED,
}: CreateServerOptions): Server {
  const tools = modules.flatMap((mod) => mod.tools);
  const handlers = new Map<string, ServerToolHandler>();
  for (const mod of modules) {
    for (const tool of mod.tools) handlers.set(tool.name, mod.handler);
  }

  const { tools: listedTools, instructions } = listing(modules, discovery, pinned);
  const directNames = new Set(
    discovery ? pinnedTools(modules, pinned).map((tool) => tool.name) : tools.map((tool) => tool.name)
  );

  const server = new Server(
    { name: "mcp-swiss", version },
    { capabilities: { tools: {} }, ...(instructions ? { instructions } : {}) }
  );

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
      } else if (discovery && !directNames.has(name) && handlers.has(name)) {
        // A client that remembers a tool name from an earlier session: serve it
        // anyway rather than fail, the same way swiss_call_tool would.
        result = await callTool(modules, { name, arguments: safeArgs });
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
