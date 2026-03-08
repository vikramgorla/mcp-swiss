import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { resolve } from 'path';

const SERVER_PATH = resolve(__dirname, '../../dist/index.js');

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface Tool {
  name: string;
  description: string;
  inputSchema: unknown;
}

/**
 * Send a JSON-RPC message to the MCP server process and collect the response.
 * The MCP SDK may emit multiple newline-delimited JSON objects on stdout;
 * we collect lines until we find one that contains our request id.
 */
function sendMcpRequest(
  request: Record<string, unknown>,
  timeoutMs = 8000
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error(`MCP request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      // Try to parse each newline-delimited line
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as JsonRpcResponse;
          if (parsed.id === request.id) {
            clearTimeout(timer);
            proc.kill();
            resolve(parsed);
            return;
          }
        } catch {
          // Not valid JSON yet, keep collecting
        }
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      if (!timedOut) {
        clearTimeout(timer);
        // Try one last parse of everything we got
        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as JsonRpcResponse;
            if (parsed.id === request.id) {
              resolve(parsed);
              return;
            }
          } catch {
            // ignore
          }
        }
        reject(new Error(`Process exited with code ${code} before response. stdout: ${stdout.slice(0, 500)}`));
      }
    });

    // Write request then close stdin to signal EOF (server reads line by line)
    proc.stdin.write(JSON.stringify(request) + '\n');
    proc.stdin.end();
  });
}

// ── tools/list ────────────────────────────────────────────────────────────────

describe('MCP protocol: tools/list', () => {
  it('responds with valid JSON-RPC structure', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
  });

  it('result.tools is an array', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    expect(Array.isArray(result.tools)).toBe(true);
  });

  it('returns exactly 65 tools', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    expect(result.tools).toHaveLength(65);
  });

  it('each tool has name, description, inputSchema', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    for (const tool of result.tools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('contains expected transport tools', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('search_stations');
    expect(names).toContain('get_connections');
    expect(names).toContain('get_departures');
    expect(names).toContain('get_arrivals');
    expect(names).toContain('get_nearby_stations');
  });

  it('contains expected weather tools', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('get_weather');
    expect(names).toContain('list_weather_stations');
    expect(names).toContain('get_weather_history');
    expect(names).toContain('get_water_level');
    expect(names).toContain('list_hydro_stations');
    expect(names).toContain('get_water_history');
  });

  it('contains expected geodata tools', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('geocode');
    expect(names).toContain('reverse_geocode');
    expect(names).toContain('search_places');
    expect(names).toContain('get_solar_potential');
    expect(names).toContain('identify_location');
    expect(names).toContain('get_municipality');
  });

  it('contains expected companies tools', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/list',
    });

    const result = response.result as { tools: Tool[] };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('search_companies');
    expect(names).toContain('get_company');
    expect(names).toContain('search_companies_by_address');
    expect(names).toContain('list_cantons');
    expect(names).toContain('list_legal_forms');
  });
});

// ── tools/call (local/no-network tools) ──────────────────────────────────────

describe('MCP protocol: tools/call', () => {
  it('list_cantons returns content array with text', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'list_cantons',
        arguments: {},
      },
    });

    expect(response.result).toBeDefined();
    const result = response.result as { content: Array<{ type: string; text: string }> };
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('list_cantons returns 26 cantons in JSON text', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'list_cantons',
        arguments: {},
      },
    });

    const result = response.result as { content: Array<{ type: string; text: string }> };
    const cantons = JSON.parse(result.content[0].text);
    expect(Array.isArray(cantons)).toBe(true);
    expect(cantons).toHaveLength(26);
  });

  it('list_legal_forms returns AG and GmbH', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'list_legal_forms',
        arguments: {},
      },
    });

    const result = response.result as { content: Array<{ type: string; text: string }> };
    const forms = JSON.parse(result.content[0].text);
    const names = forms.map((f: { name: string }) => f.name).join(' ');
    expect(names).toContain('AG');
    expect(names).toContain('GmbH');
  });

  it('unknown tool returns isError:true response', async () => {
    const response = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: {
        name: 'this_tool_does_not_exist',
        arguments: {},
      },
    });

    // MCP SDK returns the error in result.isError
    expect(response.result).toBeDefined();
    const result = response.result as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });
});
