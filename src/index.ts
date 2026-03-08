#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { transportTools, handleTransport } from "./modules/transport.js";
import { weatherTools, handleWeather } from "./modules/weather.js";
import { geodataTools, handleGeodata } from "./modules/geodata.js";
import { companiesTools, handleCompanies } from "./modules/companies.js";
import { holidaysTools, handleHolidays } from "./modules/holidays.js";
import { parliamentTools, handleParliament } from "./modules/parliament.js";
import { avalancheTools, handleAvalanche } from "./modules/avalanche.js";
import { airqualityTools, handleAirQuality } from "./modules/airquality.js";
import { postTools, handlePost } from "./modules/post.js";

const server = new Server(
  { name: "mcp-swiss", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const allTools = [
  ...transportTools,
  ...weatherTools,
  ...geodataTools,
  ...companiesTools,
  ...holidaysTools,
  ...parliamentTools,
  ...avalancheTools,
  ...airqualityTools,
  ...postTools,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    let result: string;

    if (transportTools.some((t) => t.name === name)) {
      result = await handleTransport(name, safeArgs);
    } else if (weatherTools.some((t) => t.name === name)) {
      result = await handleWeather(name, safeArgs);
    } else if (geodataTools.some((t) => t.name === name)) {
      result = await handleGeodata(name, safeArgs);
    } else if (companiesTools.some((t) => t.name === name)) {
      result = await handleCompanies(name, safeArgs);
    } else if (holidaysTools.some((t) => t.name === name)) {
      result = await handleHolidays(name, safeArgs);
    } else if (parliamentTools.some((t) => t.name === name)) {
      result = await handleParliament(name, safeArgs);
    } else if (avalancheTools.some((t) => t.name === name)) {
      result = await handleAvalanche(name, safeArgs as Record<string, string>);
    } else if (airqualityTools.some((t) => t.name === name)) {
      result = await handleAirQuality(name, safeArgs);
    } else if (postTools.some((t) => t.name === name)) {
      result = await handlePost(name, safeArgs);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("mcp-swiss running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
