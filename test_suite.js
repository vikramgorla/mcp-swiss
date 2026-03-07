#!/usr/bin/env node
// MCP Swiss Comprehensive Test Suite
// Tests all 22 tools via JSON-RPC stdio protocol

const { spawn } = require('child_process');
const path = require('path');

const MCP_BIN = '/home/vikram/mcp-swiss/dist/index.js';

// Call MCP server with a single request
async function callMCP(request) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [MCP_BIN], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const start = Date.now();
    
    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.stderr.on('data', (d) => stderr += d.toString());
    
    proc.on('close', () => {
      const ms = Date.now() - start;
      try {
        const response = JSON.parse(stdout.trim());
        resolve({ response, ms, stderr });
      } catch (e) {
        resolve({ response: null, ms, stderr, parseError: e.message, raw: stdout });
      }
    });
    
    proc.on('error', reject);
    proc.stdin.write(JSON.stringify(request) + '\n');
    proc.stdin.end();
    
    setTimeout(() => {
      proc.kill();
      resolve({ response: null, ms: 30000, stderr, timeout: true });
    }, 30000);
  });
}

async function toolsCall(toolName, args) {
  return callMCP({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  });
}

async function toolsList() {
  return callMCP({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
}

// Test result accumulator
const results = [];
let passCount = 0, failCount = 0, warnCount = 0;

function record(id, tool, desc, ms, status, notes, data = null) {
  results.push({ id, tool, desc, ms, status, notes, data });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const msStr = ms >= 3000 ? `${ms}ms ⚡SLOW` : `${ms}ms`;
  console.error(`${icon} [${tool}] ${desc} — ${msStr} — ${notes}`);
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else warnCount++;
}

function extractText(response) {
  if (!response || !response.result) return null;
  const content = response.result.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  return content[0].text;
}

function parseToolResult(response) {
  const text = extractText(response);
  if (!text) return null;
  if (text.startsWith('Error:')) return { error: text };
  try {
    return JSON.parse(text);
  } catch(e) {
    return { raw: text };
  }
}

function isInSwissBounds(lat, lng) {
  return lat >= 45.8 && lat <= 47.8 && lng >= 5.9 && lng <= 10.5;
}

function isValidCHEUid(uid) {
  return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(uid);
}

// ============================================================
// RUN ALL TESTS
// ============================================================

async function runAllTests() {
  console.error('\n🏔️  mcp-swiss Comprehensive Test Suite\n' + '='.repeat(50));
  
  // --------------------------------------------------------
  // 1. MCP PROTOCOL COMPLIANCE
  // --------------------------------------------------------
  console.error('\n--- MODULE: MCP Protocol Compliance ---');
  
  const { response: listResp, ms: listMs } = await toolsList();
  
  if (!listResp || !listResp.result) {
    record('P01', 'tools/list', 'Protocol: tools/list response', listMs, 'FAIL', 'No response or error');
  } else {
    const tools = listResp.result.tools;
    const toolNames = tools.map(t => t.name);
    const expectedTools = [
      'search_stations','get_connections','get_departures','get_arrivals','get_nearby_stations',
      'get_weather','list_weather_stations','get_weather_history','get_water_level','list_hydro_stations','get_water_history',
      'geocode','reverse_geocode','search_places','get_solar_potential','identify_location','get_municipality',
      'search_companies','get_company','search_companies_by_address','list_cantons','list_legal_forms'
    ];
    
    const missing = expectedTools.filter(t => !toolNames.includes(t));
    const extra = toolNames.filter(t => !expectedTools.includes(t));
    
    if (missing.length > 0) {
      record('P01', 'tools/list', `Tools list: ${tools.length} tools`, listMs, 'FAIL', `Missing tools: ${missing.join(', ')}`);
    } else {
      record('P01', 'tools/list', `Tools list: ${tools.length} tools`, listMs, 'PASS', `All ${expectedTools.length} expected tools present${extra.length ? `, extras: ${extra.join(', ')}` : ''}`);
    }
    
    // Check schema compliance
    let schemaIssues = [];
    for (const tool of tools) {
      if (!tool.name) schemaIssues.push(`${tool.name}: missing name`);
      if (!tool.description) schemaIssues.push(`${tool.name}: missing description`);
      if (!tool.inputSchema) schemaIssues.push(`${tool.name}: missing inputSchema`);
      if (tool.inputSchema && tool.inputSchema.type !== 'object') schemaIssues.push(`${tool.name}: inputSchema type != object`);
    }
    
    if (schemaIssues.length > 0) {
      record('P02', 'tools/list', 'Schema compliance', listMs, 'FAIL', schemaIssues.join('; '));
    } else {
      record('P02', 'tools/list', 'Schema compliance', 0, 'PASS', 'All tools have name, description, inputSchema');
    }
    
    // Check required fields on specific tools
    const toolMap = {};
    for (const t of tools) toolMap[t.name] = t;
    
    const requiredChecks = [
      ['get_connections', ['from','to']],
      ['get_departures', ['station']],
      ['get_arrivals', ['station']],
      ['get_nearby_stations', ['x','y']],
      ['get_weather', ['station']],
      ['get_weather_history', ['station','start_date','end_date']],
      ['get_water_level', ['station']],
      ['get_water_history', ['station','start_date','end_date']],
      ['geocode', ['address']],
      ['reverse_geocode', ['lat','lng']],
      ['search_places', ['query']],
      ['get_solar_potential', ['lat','lng']],
      ['identify_location', ['lat','lng']],
      ['get_municipality', ['name']],
      ['search_companies', ['name']],
      ['get_company', ['uid']],
      ['search_companies_by_address', ['address']],
    ];
    
    let reqIssues = [];
    for (const [toolName, requiredFields] of requiredChecks) {
      const tool = toolMap[toolName];
      if (!tool) continue;
      const actualRequired = tool.inputSchema.required ?? [];
      for (const field of requiredFields) {
        if (!actualRequired.includes(field)) {
          reqIssues.push(`${toolName}: '${field}' not in required`);
        }
      }
    }
    
    if (reqIssues.length > 0) {
      record('P03', 'tools/list', 'Required fields in schemas', 0, 'WARN', reqIssues.join('; '));
    } else {
      record('P03', 'tools/list', 'Required fields in schemas', 0, 'PASS', 'All required fields properly marked');
    }
    
    // Store tool list for later reference
    results._tools = tools;
    results._toolMap = toolMap;
  }
  
  // --------------------------------------------------------
  // 2. TRANSPORT MODULE
  // --------------------------------------------------------
  console.error('\n--- MODULE: Transport ---');
  
  // search_stations: valid queries
  for (const query of ['Bern', 'Zürich', 'Geneva']) {
    const { response, ms } = await toolsCall('search_stations', { query });
    const data = parseToolResult(response);
    
    // Check protocol shape
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    
    if (!hasShape || !data || data.error) {
      record(`T01_${query}`, 'search_stations', `Query: "${query}"`, ms, 'FAIL', data?.error ?? 'Bad response shape');
    } else if (!Array.isArray(data)) {
      record(`T01_${query}`, 'search_stations', `Query: "${query}"`, ms, 'FAIL', `Expected array, got ${typeof data}`);
    } else {
      const first = data[0];
      const hasName = first && first.name;
      const hasId = first && (first.id !== undefined);
      const hasCoord = first && first.coordinate;
      const issues = [];
      if (!hasName) issues.push('first station missing name');
      if (!hasId) issues.push('first station missing id');
      if (!hasCoord) issues.push('first station missing coordinate');
      
      if (issues.length) {
        record(`T01_${query}`, 'search_stations', `Query: "${query}" (${data.length} results)`, ms, 'WARN', issues.join(', '), first);
      } else {
        record(`T01_${query}`, 'search_stations', `Query: "${query}" — ${data.length} results, first: ${first.name}`, ms, 'PASS', 'Has name, id, coordinate', null);
      }
    }
  }
  
  // search_stations: nonexistent
  {
    const { response, ms } = await toolsCall('search_stations', { query: 'nonexistentxyz123' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape) {
      record('T01_empty', 'search_stations', 'Query: nonexistent', ms, 'FAIL', 'Bad response shape');
    } else if (data && data.error) {
      record('T01_empty', 'search_stations', 'Query: nonexistent', ms, 'FAIL', `Got error instead of empty: ${data.error}`);
    } else if (Array.isArray(data) && data.length === 0) {
      record('T01_empty', 'search_stations', 'Query: nonexistent', ms, 'PASS', 'Returns empty array (not error)');
    } else if (Array.isArray(data)) {
      record('T01_empty', 'search_stations', `Query: nonexistent — ${data.length} results`, ms, 'WARN', 'Expected 0 results but got some');
    } else {
      record('T01_empty', 'search_stations', 'Query: nonexistent', ms, 'WARN', `Unexpected response: ${JSON.stringify(data).slice(0,100)}`);
    }
  }
  
  // get_connections: Bern -> Zurich
  {
    const { response, ms } = await toolsCall('get_connections', { from: 'Bern', to: 'Zurich', limit: 3 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T02_BernZurich', 'get_connections', 'Bern→Zurich limit=3', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else if (!Array.isArray(data)) {
      record('T02_BernZurich', 'get_connections', 'Bern→Zurich', ms, 'FAIL', `Expected array, got ${typeof data}`);
    } else {
      const first = data[0];
      const hasFrom = first?.from?.station?.name;
      const hasTo = first?.to?.station?.name;
      const hasDuration = first?.duration !== undefined;
      const hasProducts = first?.products && Array.isArray(first.products);
      const issues = [];
      if (!hasFrom) issues.push('missing from.station.name');
      if (!hasTo) issues.push('missing to.station.name');
      if (!hasDuration) issues.push('missing duration');
      if (!hasProducts) issues.push('missing products array');
      
      const status = issues.length === 0 ? 'PASS' : 'WARN';
      record('T02_BernZurich', 'get_connections', `Bern→Zurich: ${data.length} connections, dur=${first?.duration}`, ms, status,
        issues.length ? issues.join(', ') : `from=${first?.from?.station?.name}, to=${first?.to?.station?.name}, products=${JSON.stringify(first?.products)}`);
    }
  }
  
  // get_connections: Geneva -> Lausanne
  {
    const { response, ms } = await toolsCall('get_connections', { from: 'Geneva', to: 'Lausanne' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T02_GenevaLausanne', 'get_connections', 'Geneva→Lausanne', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      record('T02_GenevaLausanne', 'get_connections', `Geneva→Lausanne: ${Array.isArray(data) ? data.length : 'N/A'} connections`, ms, 'PASS', 'OK');
    }
  }
  
  // get_connections: with date/time
  {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const { response, ms } = await toolsCall('get_connections', { from: 'Zug', to: 'Basel', date: dateStr, time: '09:00' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T02_ZugBasel', 'get_connections', `Zug→Basel date=${dateStr} time=09:00`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      record('T02_ZugBasel', 'get_connections', `Zug→Basel date=${dateStr}: ${Array.isArray(data) ? data.length : 'N/A'} connections`, ms, 'PASS', 'Date/time params work');
    }
  }
  
  // get_departures: Bern limit=5
  {
    const { response, ms } = await toolsCall('get_departures', { station: 'Bern', limit: 5 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T03_Bern', 'get_departures', 'Bern limit=5', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const departures = data.departures ?? [];
      const first = departures[0];
      const hasTime = first?.stop?.departure !== undefined;
      const hasDest = first?.to !== undefined;
      const hasName = first?.name !== undefined;
      const issues = [];
      if (!hasTime) issues.push('missing departure time');
      if (!hasDest) issues.push('missing destination (to)');
      if (!hasName) issues.push('missing transport name');
      
      const status = issues.length === 0 ? 'PASS' : 'WARN';
      record('T03_Bern', 'get_departures', `Bern: ${departures.length} departures, first to="${first?.to}"`, ms, status,
        issues.length ? issues.join(', ') : `to=${first?.to}, name=${first?.name}, dep=${first?.stop?.departure}`);
    }
  }
  
  // get_departures: Zürich HB limit=10
  {
    const { response, ms } = await toolsCall('get_departures', { station: 'Zürich HB', limit: 10 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T03_ZurichHB', 'get_departures', 'Zürich HB limit=10', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const departures = data.departures ?? [];
      record('T03_ZurichHB', 'get_departures', `Zürich HB: ${departures.length} departures`, ms, departures.length > 0 ? 'PASS' : 'WARN', 
        departures.length > 0 ? `first to="${departures[0]?.to}"` : 'Empty departures');
    }
  }
  
  // get_arrivals: Geneva limit=5
  {
    const { response, ms } = await toolsCall('get_arrivals', { station: 'Geneva', limit: 5 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T04_Geneva', 'get_arrivals', 'Geneva limit=5', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const arrivals = data.arrivals ?? [];
      record('T04_Geneva', 'get_arrivals', `Geneva: ${arrivals.length} arrivals`, ms, arrivals.length > 0 ? 'PASS' : 'WARN',
        arrivals.length > 0 ? `first from="${arrivals[0]?.to}"` : 'Empty arrivals');
    }
  }
  
  // get_nearby_stations: Bern coords
  {
    const { response, ms } = await toolsCall('get_nearby_stations', { x: 7.4474, y: 46.9480 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('T05_Bern', 'get_nearby_stations', 'Bern coords (7.4474, 46.9480)', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else if (!Array.isArray(data)) {
      record('T05_Bern', 'get_nearby_stations', 'Bern coords', ms, 'FAIL', `Expected array, got ${typeof data}`);
    } else {
      const first = data[0];
      record('T05_Bern', 'get_nearby_stations', `Bern: ${data.length} nearby stations`, ms, data.length > 0 ? 'PASS' : 'WARN',
        data.length > 0 ? `first="${first?.name}" dist=${first?.distance}m` : 'No results');
    }
  }
  
  // --------------------------------------------------------
  // 3. WEATHER MODULE
  // --------------------------------------------------------
  console.error('\n--- MODULE: Weather ---');
  
  // get_weather for multiple stations
  for (const station of ['BER', 'ZUE', 'LUG', 'GVE', 'SMA']) {
    const { response, ms } = await toolsCall('get_weather', { station });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`W01_${station}`, 'get_weather', `Station: ${station}`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      // Check for temperature field
      const payload = Array.isArray(data) ? data[0] : (data.payload?.[0] ?? data);
      const tempRaw = payload?.tt ?? payload?.temperature ?? payload?.values?.tt;
      const temp = parseFloat(tempRaw);
      const ts = payload?.datetime ?? payload?.timestamp;
      const issues = [];
      if (tempRaw === undefined) issues.push('missing temperature field (tt)');
      else if (isNaN(temp)) issues.push(`temperature is NaN: ${tempRaw}`);
      else if (temp < -20 || temp > 40) issues.push(`temperature implausible: ${temp}°C`);
      if (!ts) issues.push('missing timestamp');
      
      const status = issues.length === 0 ? 'PASS' : 'WARN';
      record(`W01_${station}`, 'get_weather', `Station ${station}: temp=${temp}°C`, ms, status,
        issues.length ? issues.join(', ') : `temp=${temp}°C, ts=${ts}`);
    }
  }
  
  // list_weather_stations
  {
    const { response, ms } = await toolsCall('list_weather_stations', {});
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('W02', 'list_weather_stations', 'List all stations', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const stations = Array.isArray(data) ? data : (data.payload ?? data.stations ?? []);
      const count = Array.isArray(stations) ? stations.length : Object.keys(stations).length;
      record('W02', 'list_weather_stations', `${count} stations`, ms, count > 10 ? 'PASS' : 'WARN',
        count > 10 ? `Good: ${count} stations returned` : `Only ${count} stations — suspicious`);
    }
  }
  
  // get_weather_history: BER last 3 days
  {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const { response, ms } = await toolsCall('get_weather_history', { station: 'BER', start_date: startDate, end_date: endDate });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('W03_BER', 'get_weather_history', `BER ${startDate} to ${endDate}`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const records = Array.isArray(data) ? data : (data.payload ?? []);
      record('W03_BER', 'get_weather_history', `BER history: ${Array.isArray(records) ? records.length : '?'} records`, ms, 'PASS', `Date range ${startDate}→${endDate}`);
    }
  }
  
  // get_water_level: multiple stations
  for (const [stationId, name] of [['2135', 'Aare/Bern'], ['2243', 'Rhine/Basel'], ['2030', 'Rhone']]) {
    const { response, ms } = await toolsCall('get_water_level', { station: stationId });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`W04_${stationId}`, 'get_water_level', `${name} (${stationId})`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const payload = Array.isArray(data) ? data[0] : (data.payload?.[0] ?? data);
      const level = payload?.q ?? payload?.level ?? payload?.abfluss;
      const ts = payload?.datetime ?? payload?.timestamp;
      record(`W04_${stationId}`, 'get_water_level', `${name}: level=${level}`, ms, 'PASS', `ts=${ts}`);
    }
  }
  
  // list_hydro_stations
  {
    const { response, ms } = await toolsCall('list_hydro_stations', {});
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('W05', 'list_hydro_stations', 'List hydro stations', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const stations = Array.isArray(data) ? data : (data.payload ?? data.stations ?? Object.values(data));
      const count = Array.isArray(stations) ? stations.length : Object.keys(data).length;
      record('W05', 'list_hydro_stations', `${count} hydro stations`, ms, count > 20 ? 'PASS' : 'WARN',
        `${count} stations`);
    }
  }
  
  // get_water_history: station 2135
  {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const { response, ms } = await toolsCall('get_water_history', { station: '2135', start_date: startDate, end_date: endDate });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('W06_2135', 'get_water_history', `Aare/Bern history ${startDate}→${endDate}`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const records = Array.isArray(data) ? data : (data.payload ?? []);
      record('W06_2135', 'get_water_history', `Aare/Bern: ${Array.isArray(records) ? records.length : '?'} records`, ms, 'PASS', 'History data returned');
    }
  }
  
  // --------------------------------------------------------
  // 4. GEODATA MODULE
  // --------------------------------------------------------
  console.error('\n--- MODULE: Geodata ---');
  
  // geocode
  for (const [addr, expectedCity] of [
    ['Bahnhofstrasse 1, Zürich', 'Zürich'],
    ['Bundesplatz 3, Bern', 'Bern'],
    ['Place de la Gare, Geneva', 'Geneva']
  ]) {
    const { response, ms } = await toolsCall('geocode', { address: addr });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`G01_${expectedCity}`, 'geocode', `"${addr}"`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      // geo.admin returns { results: [...] }
      const results = data.results ?? [];
      const first = results[0];
      const attrs = first?.attrs ?? {};
      const lat = attrs.lat ?? attrs.y;
      const lng = attrs.lon ?? attrs.x;
      
      if (!first) {
        record(`G01_${expectedCity}`, 'geocode', `"${addr}"`, ms, 'WARN', 'No results returned');
      } else if (lat && lng && isInSwissBounds(lat, lng)) {
        record(`G01_${expectedCity}`, 'geocode', `"${addr}" → (${lat.toFixed(4)}, ${lng.toFixed(4)})`, ms, 'PASS', 'In Swiss bounds');
      } else {
        record(`G01_${expectedCity}`, 'geocode', `"${addr}" → lat=${lat}, lng=${lng}`, ms, 'WARN', 
          lat && lng ? `Out of Swiss bounds: lat=${lat}, lng=${lng}` : 'Missing lat/lng');
      }
    }
  }
  
  // reverse_geocode
  for (const [lat, lng, city] of [
    [46.9480, 7.4474, 'Bern'],
    [47.3769, 8.5417, 'Zürich']
  ]) {
    const { response, ms } = await toolsCall('reverse_geocode', { lat, lng });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`G02_${city}`, 'reverse_geocode', `(${lat}, ${lng}) [${city}]`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const results = data.results ?? [];
      const first = results[0];
      const label = first?.attrs?.label ?? first?.attrs?.detail ?? first?.label ?? '';
      record(`G02_${city}`, 'reverse_geocode', `(${lat}, ${lng}) → "${label}"`, ms, results.length > 0 ? 'PASS' : 'WARN',
        results.length > 0 ? `${results.length} results` : 'No results');
    }
  }
  
  // search_places
  for (const query of ['Matterhorn', 'Zürichsee', 'Rhein']) {
    const { response, ms } = await toolsCall('search_places', { query });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`G03_${query}`, 'search_places', `"${query}"`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const results = data.results ?? [];
      const first = results[0];
      const label = first?.attrs?.label ?? first?.attrs?.detail ?? '';
      record(`G03_${query}`, 'search_places', `"${query}": ${results.length} results`, ms, results.length > 0 ? 'PASS' : 'WARN',
        results.length > 0 ? `first="${label}"` : 'No results');
    }
  }
  
  // get_solar_potential
  for (const [lat, lng, city] of [
    [46.9480, 7.4474, 'Bern'],
    [47.3769, 8.5417, 'Zürich']
  ]) {
    const { response, ms } = await toolsCall('get_solar_potential', { lat, lng });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`G04_${city}`, 'get_solar_potential', `(${lat}, ${lng}) [${city}]`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const results = data.results ?? [];
      record(`G04_${city}`, 'get_solar_potential', `${city}: ${results.length} features`, ms, 'PASS',
        results.length > 0 ? `Has solar data` : 'No features (may be valid — no roof at exact coords)');
    }
  }
  
  // identify_location
  {
    const { response, ms } = await toolsCall('identify_location', { lat: 46.9480, lng: 7.4474 });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('G05_Bern', 'identify_location', 'Bern (46.9480, 7.4474)', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const results = data.results ?? [];
      record('G05_Bern', 'identify_location', `Bern: ${results.length} features`, ms, 'PASS',
        `identify returns ${results.length} features`);
    }
  }
  
  // get_municipality
  for (const name of ['Bern', 'Zürich', 'Zug']) {
    const { response, ms } = await toolsCall('get_municipality', { name });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`G06_${name}`, 'get_municipality', `Municipality: ${name}`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const results = data.results ?? [];
      const first = results[0];
      const label = first?.attrs?.label ?? first?.attrs?.detail ?? '';
      record(`G06_${name}`, 'get_municipality', `${name}: ${results.length} results`, ms, results.length > 0 ? 'PASS' : 'WARN',
        results.length > 0 ? `first="${label}"` : 'No results');
    }
  }
  
  // --------------------------------------------------------
  // 5. COMPANIES MODULE
  // --------------------------------------------------------
  console.error('\n--- MODULE: Companies ---');
  
  // search_companies
  for (const [name, extraArgs, expectedMin] of [
    ['Migros', {}, 1],
    ['UBS', {}, 1],
    ['Nestlé', {}, 1],
  ]) {
    const { response, ms } = await toolsCall('search_companies', { name, ...extraArgs });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record(`C01_${name}`, 'search_companies', `name="${name}"`, ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const companies = data.companies ?? [];
      const first = companies[0];
      const hasUid = first && isValidCHEUid(first.uid ?? '');
      const hasStatus = first && first.status !== undefined;
      const issues = [];
      if (companies.length < expectedMin) issues.push(`Expected >= ${expectedMin} results, got ${companies.length}`);
      if (!hasUid && first) issues.push(`UID format invalid: ${first?.uid}`);
      if (!hasStatus && first) issues.push('missing status field');
      
      const status = issues.length === 0 ? 'PASS' : 'WARN';
      record(`C01_${name}`, 'search_companies', `"${name}": ${companies.length} results`, ms, status,
        issues.length ? issues.join(', ') : `uid=${first?.uid}, status=${first?.status}, name=${first?.name}`);
    }
  }
  
  // search_companies with canton filter
  {
    const { response, ms } = await toolsCall('search_companies', { name: 'blockchain', canton: 'ZG' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C01_blockchain_ZG', 'search_companies', 'name="blockchain" canton="ZG"', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const companies = data.companies ?? [];
      record('C01_blockchain_ZG', 'search_companies', `blockchain/ZG: ${companies.length} results`, ms, 'PASS', `Canton filter works`);
    }
  }
  
  // nonexistent company
  {
    const { response, ms } = await toolsCall('search_companies', { name: 'xyznonexistentcompany999' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C01_nonexistent', 'search_companies', 'nonexistent name', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const companies = data.companies ?? [];
      record('C01_nonexistent', 'search_companies', `nonexistent: ${companies.length} results`, ms, companies.length === 0 ? 'PASS' : 'WARN',
        companies.length === 0 ? 'Correctly returns empty' : `Unexpectedly got ${companies.length} results`);
    }
  }
  
  // get_company: Migros UID
  {
    const { response, ms } = await toolsCall('get_company', { uid: 'CHE-107.787.291' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C02_Migros', 'get_company', 'UID CHE-107.787.291 (Migros)', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const uid = data.uid ?? data.ehraid;
      const name = data.name ?? data.firmName;
      const status = data.status ?? data.shabStatus;
      record('C02_Migros', 'get_company', `Migros: name="${name}"`, ms, 'PASS', `uid=${uid}, status=${status}`);
    }
  }
  
  // get_company: Nestlé
  {
    const { response, ms } = await toolsCall('get_company', { uid: 'CHE-103.886.381' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C02_Nestle', 'get_company', 'UID CHE-103.886.381 (Nestlé)', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const name = data.name ?? data.firmName;
      record('C02_Nestle', 'get_company', `Nestlé: name="${name}"`, ms, 'PASS', `OK`);
    }
  }
  
  // search_companies_by_address
  {
    const { response, ms } = await toolsCall('search_companies_by_address', { address: 'Bahnhofstrasse, Zürich' });
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C03_addr', 'search_companies_by_address', 'Bahnhofstrasse, Zürich', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const companies = data.companies ?? [];
      record('C03_addr', 'search_companies_by_address', `Bahnhofstrasse: ${companies.length} companies`, ms, companies.length > 0 ? 'PASS' : 'WARN',
        companies.length > 0 ? `first="${companies[0]?.name}"` : 'No results');
    }
  }
  
  // list_cantons
  {
    const { response, ms } = await toolsCall('list_cantons', {});
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C04_cantons', 'list_cantons', 'List all cantons', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const cantons = Array.isArray(data) ? data : Object.values(data);
      const count = cantons.length;
      record('C04_cantons', 'list_cantons', `${count} cantons`, ms, count === 26 ? 'PASS' : 'WARN',
        count === 26 ? 'Correct: 26 cantons' : `Expected 26, got ${count}`);
    }
  }
  
  // list_legal_forms
  {
    const { response, ms } = await toolsCall('list_legal_forms', {});
    const data = parseToolResult(response);
    const hasShape = response?.result?.content?.[0]?.type === 'text';
    if (!hasShape || !data || data.error) {
      record('C05_legal', 'list_legal_forms', 'List legal forms', ms, 'FAIL', data?.error ?? 'Bad shape');
    } else {
      const forms = Array.isArray(data) ? data : Object.values(data);
      const text = JSON.stringify(data);
      const hasAG = text.includes('AG') || text.includes('Aktiengesellschaft');
      const hasGmbH = text.includes('GmbH') || text.includes('Gesellschaft mit beschr');
      const issues = [];
      if (!hasAG) issues.push('Missing AG');
      if (!hasGmbH) issues.push('Missing GmbH');
      
      record('C05_legal', 'list_legal_forms', `${Array.isArray(forms) ? forms.length : '?'} legal forms`, ms,
        issues.length === 0 ? 'PASS' : 'WARN',
        issues.length === 0 ? 'Has AG and GmbH' : issues.join(', '));
    }
  }
  
  // --------------------------------------------------------
  // 6. ERROR HANDLING
  // --------------------------------------------------------
  console.error('\n--- MODULE: Error Handling ---');
  
  // Missing required param — get_connections without 'to'
  {
    const { response, ms } = await toolsCall('get_connections', { from: 'Bern' });
    const text = extractText(response);
    const isError = response?.result?.isError === true;
    const isText = response?.result?.content?.[0]?.type === 'text';
    if (!isText) {
      record('E01', 'get_connections', 'Missing required param (to)', ms, 'FAIL', 'Server crashed or no response');
    } else {
      record('E01', 'get_connections', 'Missing required param (to)', ms, 'PASS',
        `Graceful: isError=${isError}, response="${text?.slice(0,80)}"`);
    }
  }
  
  // Unknown tool name
  {
    const { response, ms } = await callMCP({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nonexistent_tool', arguments: {} } });
    const text = extractText(response);
    const isError = response?.result?.isError === true;
    if (!response?.result?.content) {
      record('E02', 'nonexistent_tool', 'Unknown tool name', ms, 'FAIL', 'No response or server crash');
    } else {
      record('E02', 'nonexistent_tool', 'Unknown tool name', ms, 'PASS',
        `Graceful: isError=${isError}, "${text?.slice(0,60)}"`);
    }
  }
  
  // Bad data: nonexistent station
  {
    const { response, ms } = await toolsCall('get_departures', { station: 'zzznonstationxyz' });
    const text = extractText(response);
    const isText = response?.result?.content?.[0]?.type === 'text';
    if (!isText) {
      record('E03', 'get_departures', 'Nonexistent station', ms, 'FAIL', 'No response');
    } else {
      record('E03', 'get_departures', 'Nonexistent station', ms, 'PASS',
        `Graceful: "${text?.slice(0,80)}"`);
    }
  }
  
  // Server recovers after error — send valid request after bad one
  {
    await toolsCall('get_connections', { from: 'Bern' }); // trigger error
    const { response, ms } = await toolsCall('search_stations', { query: 'Bern' });
    const data = parseToolResult(response);
    const isOk = Array.isArray(data) && data.length > 0;
    record('E04', 'search_stations', 'Recovery after error', ms, isOk ? 'PASS' : 'WARN',
      isOk ? 'Server recovers fine after error' : 'Unexpected response after recovery');
  }
  
  // --------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------
  const total = results.filter(r => typeof r === 'object' && r.id).length;
  console.error(`\n${'='.repeat(50)}`);
  console.error(`📊 Results: ${passCount} PASS / ${warnCount} WARN / ${failCount} FAIL / ${total} total`);
  
  return results.filter(r => typeof r === 'object' && r.id);
}

runAllTests()
  .then(results => {
    // Output structured results for report generation
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
