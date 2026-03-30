const MAX_REQUEST_BYTES = 1_000_000;
const SUPPORTED_SCAD_DIALECT = [
  'You are writing code for a CUSTOM OpenSCAD renderer with a LIMITED subset of OpenSCAD.',
  '',
  'SUPPORTED PRIMITIVES: cube, sphere, cylinder, cone, circle, square.',
  'SUPPORTED TRANSFORMS: translate, rotate, scale, color, union, difference, intersection, linear_extrude, rotate_extrude.',
  'SUPPORTED CONTROL FLOW: variable assignment (x = 5;), for-loops (for (i = [0:1:5]) { ... }), if-blocks, numeric expressions (+ - * / %), ranges [start:step:end].',
  '',
  'CRITICAL CONSTRAINTS — VIOLATING THESE WILL CAUSE A PARSE ERROR:',
  '- Do NOT use module or function declarations. Inline all geometry directly.',
  '- Do NOT use include, use, import(), text(), polyhedron(), offset(), projection(), minkowski(), hull(), resize(), mirror(), multmatrix(), render(), surface(), polygon().',
  '- Do NOT use let(), assert(), echo(), each, list comprehensions, ternary (?:), logical operators (&&, ||, !), or comparison operators (==, !=, <, >, <=, >=).',
  '- Do NOT use string concatenation or str().',
  '- Do NOT use $fa, $fs as special variables. Only $fn is supported.',
  '',
  'OUTPUT FORMAT:',
  '- Return ONLY raw OpenSCAD code. No markdown fences (```), no explanations, no comments about what you did.',
  '- Every primitive statement MUST end with a semicolon.',
  '- Every block (difference, union, translate, etc.) must use properly matched braces { }.',
  '',
  'BEST PRACTICES:',
  '- Parametrize key dimensions with named variables at the top of the script.',
  '- Use $fn=40 on all cylinder() and sphere() calls for smooth rendering.',
  '- Prefer center=true on cube/cylinder to simplify alignment.',
  '- In difference(), make cutout volumes 0.1 larger than needed and offset by -0.05 to avoid Z-fighting.',
  '- For complex assemblies, use nested translate/rotate with clear indentation.',
].join('\n');

const SONNET_SYSTEM_PROMPT = [
  'You are an expert CAD engineer. You write OpenSCAD code for a custom web-based renderer.',
  'Your ABSOLUTE TOP PRIORITY is writing code that the custom parser can handle without errors.',
  'The custom parser only supports a very limited subset of OpenSCAD — read the constraints carefully.',
  '',
  'When the user asks you to model something specific (e.g. "a Rubik\'s cube", "a chess piece", "a house"):',
  '- You MUST create geometry that actually looks like that object.',
  '- Break the object into its recognizable visual components using only the supported primitives and transforms.',
  '- A "Rubik\'s cube" should be a 3x3x3 grid of small colored cubes, NOT a vase or random shape.',
  '- A "chess knight" should have a recognizable horse-head silhouette built from primitives.',
  '- Think carefully about what makes each object visually recognizable before writing code.',
  '',
  SUPPORTED_SCAD_DIALECT,
].join('\n');

const HAIKU_SYSTEM_PROMPT = [
  'You are an OpenSCAD expert editor for a custom web-based renderer with limited syntax support.',
  'You receive existing code plus selected-face context from a 3D pick.',
  'Change the minimum necessary code to satisfy the request while strictly preserving unrelated geometry.',
  'Keep variable names, style, and comments consistent with the original code.',
  '',
  SUPPORTED_SCAD_DIALECT,
].join('\n');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_REQUEST_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function buildLineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function toLineNumber(index, lineStarts) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= index) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}

function buildSelectionSummary(selection, currentCode) {
  if (!selection || typeof selection !== 'object') return 'No face selection context provided.';

  const meta = selection.meta || {};
  const point = Array.isArray(selection.worldPoint) ? selection.worldPoint.map((v) => Number(v).toFixed(3)).join(', ') : 'n/a';
  const normal = Array.isArray(selection.worldNormal) ? selection.worldNormal.map((v) => Number(v).toFixed(3)).join(', ') : 'n/a';
  const faceIndex = Number.isInteger(selection.faceIndex) ? selection.faceIndex : 'n/a';

  let inferredLine = 'n/a';
  if (typeof meta.sourceIndex === 'number' && currentCode) {
    inferredLine = toLineNumber(meta.sourceIndex, buildLineStarts(currentCode));
  } else if (typeof meta.line === 'number') {
    inferredLine = meta.line;
  }

  return [
    `Primitive or op: ${meta.primitive || meta.operation || 'unknown'}`,
    `Context chain: ${meta.contextPath || 'none'}`,
    `Face index: ${faceIndex}`,
    `World point: [${point}]`,
    `World normal: [${normal}]`,
    `Likely source line: ${inferredLine}`,
    `Source snippet: ${meta.snippet || 'n/a'}`,
  ].join('\n');
}

function extractTextFromAnthropic(responseJson) {
  const blocks = responseJson?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function extractScad(text) {
  if (!text) return '';
  const fenced = text.match(/```(?:scad|openscad)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  return text.trim();
}

async function callAnthropic({ apiKey, model, system, userPrompt, maxTokens = 2200 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      system,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  const bodyText = await response.text();
  let payload = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || bodyText || `Anthropic request failed (${response.status}).`;
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  return payload;
}

async function handleGenerate(req, res, env) {
  const body = await readJsonBody(req);
  const prompt = (body?.prompt || '').trim();
  const currentCode = typeof body?.currentCode === 'string' ? body.currentCode : '';

  if (!prompt) {
    sendJson(res, 400, { error: 'Missing prompt.' });
    return;
  }

  const userPrompt = [
    'Create or revise OpenSCAD code for the following request.',
    '',
    'RULES (in priority order):',
    '1) The code MUST parse successfully in the supported dialect. No unsupported features.',
    '2) The geometry MUST actually represent what the user asked for. If they ask for "a car", build something that looks like a car. If they ask for "a Rubik\'s cube", build a 3x3x3 grid of colored cubes.',
    '3) Use clean, readable structure with named variables for key dimensions.',
    '4) Use $fn=40 on all curved primitives.',
    '5) Return ONLY valid OpenSCAD code. No markdown, no explanations.',
    '',
    `User request: ${prompt}`,
    '',
    currentCode
      ? `Current SCAD code (revise when appropriate):\n${currentCode}`
      : 'There is no existing code. Generate from scratch.',
  ].join('\n');

  const response = await callAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-0',
    maxTokens: 4096,
    system: SONNET_SYSTEM_PROMPT,
    userPrompt,
  });

  const scadCode = extractScad(extractTextFromAnthropic(response));
  if (!scadCode) {
    sendJson(res, 502, { error: 'Model returned an empty response.' });
    return;
  }

  sendJson(res, 200, { scadCode, model: response?.model || env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-0' });
}

async function handleFaceEdit(req, res, env) {
  const body = await readJsonBody(req);
  const prompt = (body?.prompt || '').trim();
  const currentCode = typeof body?.currentCode === 'string' ? body.currentCode : '';
  const selection = body?.selection;

  if (!prompt) {
    sendJson(res, 400, { error: 'Missing face-edit prompt.' });
    return;
  }
  if (!currentCode.trim()) {
    sendJson(res, 400, { error: 'Missing current SCAD code.' });
    return;
  }

  const userPrompt = [
    'Patch the existing OpenSCAD based on a selected face/region and the requested change.',
    '',
    'Editing rules:',
    '1) Modify only what is needed to satisfy the requested local change.',
    '2) Keep unrelated geometry untouched.',
    '3) Preserve file structure and ordering.',
    '4) Return the FULL updated OpenSCAD script — raw code only, no markdown.',
    '',
    `Face selection context:\n${buildSelectionSummary(selection, currentCode)}`,
    '',
    `Requested edit: ${prompt}`,
    '',
    `Current SCAD:\n${currentCode}`,
  ].join('\n');

  const response = await callAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_HAIKU_MODEL || 'claude-3-5-haiku-latest',
    maxTokens: 2200,
    system: HAIKU_SYSTEM_PROMPT,
    userPrompt,
  });

  const scadCode = extractScad(extractTextFromAnthropic(response));
  if (!scadCode) {
    sendJson(res, 502, { error: 'Model returned an empty response.' });
    return;
  }

  sendJson(res, 200, { scadCode, model: response?.model || env.ANTHROPIC_HAIKU_MODEL || 'claude-3-5-haiku-latest' });
}

export function createAnthropicApiMiddleware(env) {
  return async (req, res, next) => {
    const method = req.method || 'GET';
    const url = req.url || '';
    const pathname = url.split('?')[0];

    if (pathname !== '/api/chat/generate' && pathname !== '/api/chat/face-edit') {
      next();
      return;
    }

    if (!env.ANTHROPIC_API_KEY) {
      sendJson(res, 500, { error: 'Missing ANTHROPIC_API_KEY on server.' });
      return;
    }

    if (method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      if (pathname === '/api/chat/generate') {
        await handleGenerate(req, res, env);
        return;
      }
      await handleFaceEdit(req, res, env);
    } catch (err) {
      const statusCode = err?.statusCode || 500;
      sendJson(res, statusCode, { error: err?.message || 'Unhandled server error.' });
    }
  };
}
