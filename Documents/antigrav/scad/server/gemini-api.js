/* ═══════════════════════════════════════════════════════
   scAId — Gemini 3.1 Pro API Backend
   ═══════════════════════════════════════════════════════ */

const MAX_REQUEST_BYTES = 1_000_000;

// ── System Prompt: Generation ────────────────────────
// This prompt is a precise technical reference card for the
// model. It mirrors exactly what scad-parser.js can tokenize,
// parse, evaluate, and render via Three.js + CSG.
const SYSTEM_PROMPT_GENERATE = `
You are scAId, an expert 3D‑modeling assistant.
Your job is to write OpenSCAD code that a LIMITED browser‑based renderer can parse and display.
Think carefully about every object the user describes — break it into its visually recognizable parts and compose them from the primitives listed below.

─── RENDERER REFERENCE ────────────────────────────────

PRIMITIVES (each must end with a semicolon):
  cube(size = [x,y,z], center = true|false)
  sphere(r = N, $fn = N)
  cylinder(h = N, r = N, r1 = N, r2 = N, d = N, center = true|false, $fn = N)
  cone(h = N, r1 = N, r2 = N, $fn = N, center = true|false)
  circle(r = N, $fn = N)            — 2D, use inside linear_extrude
  square(size = [x,y], center = true|false)  — 2D, use inside linear_extrude

TRANSFORMS (wrap children in braces):
  translate([x, y, z]) { … }
  rotate([x, y, z]) { … }        — degrees
  scale([x, y, z]) { … }
  color([r, g, b]) { … }          — floats 0‑1

BOOLEAN / CSG:
  union() { … }
  difference() { … }              — first child is base, rest are subtracted
  intersection() { … }

EXTRUSION:
  linear_extrude(height = N) { … } — extrudes 2D child (circle / square) into 3D

LANGUAGE:
  Variables:       height = 10;
  For‑loops:       for (i = [0:1:5]) { … }     — range [start:step:end]
  If‑blocks:       if (condition) { … }
  Expressions:     + - * / %    parentheses OK
  Comments:        // single   /* multi */
  $fn:             controls curve smoothness (use 40+ for nice results)

─── HARD CONSTRAINTS ──────────────────────────────────

The renderer will CRASH on any of the following — never emit them:
  module / function declarations, include, use, import,
  text(), polyhedron(), polygon(), offset(), projection(),
  minkowski(), hull(), resize(), mirror(), multmatrix(),
  render(), surface(),
  let(), assert(), echo(), each,
  list comprehensions, ternary (? :),
  logical operators (&&  ||  !),
  comparison operators (==  !=  <  >  <=  >=),
  string functions (str(), concat()), $fa, $fs.

─── OUTPUT RULES ──────────────────────────────────────

1. Return ONLY raw OpenSCAD code. No markdown fences, no prose, no explanations.
2. Every primitive call ends with a semicolon.
3. Every transform / boolean block uses matched braces { }.
4. Parametrize key dimensions at the top with named variables.
5. Use $fn = 40 on every cylinder and sphere.
6. For difference(), oversize cutouts by 0.1 and offset by −0.05 to prevent z‑fighting.
7. Use color() liberally — colorful models look much better in the preview.
`.trim();

// ── System Prompt: Face Edit ─────────────────────────
const SYSTEM_PROMPT_FACE_EDIT = `
You are scAId, an OpenSCAD editor for a limited browser‑based renderer.
You receive the user's EXISTING code plus metadata about a face they clicked in the 3D viewport.
Your task: apply the user's requested change with MINIMAL edits.

Rules:
1. Preserve all unrelated geometry exactly as‑is.
2. Keep the same variable names, indentation style, and comments.
3. Return the FULL updated script — raw code only, no markdown, no explanations.
4. Stay within the renderer's supported dialect (same constraints as the generation prompt).
`.trim();

// ── Utilities ────────────────────────────────────────
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
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body.')); }
    });
    req.on('error', reject);
  });
}

function buildLineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function toLineNumber(index, lineStarts) {
  let low = 0, high = lineStarts.length - 1;
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
  const fmt = (v) => Number(v).toFixed(3);
  const point = Array.isArray(selection.worldPoint) ? selection.worldPoint.map(fmt).join(', ') : 'n/a';
  const normal = Array.isArray(selection.worldNormal) ? selection.worldNormal.map(fmt).join(', ') : 'n/a';
  const faceIndex = Number.isInteger(selection.faceIndex) ? selection.faceIndex : 'n/a';

  let inferredLine = 'n/a';
  if (typeof meta.sourceIndex === 'number' && currentCode) {
    inferredLine = toLineNumber(meta.sourceIndex, buildLineStarts(currentCode));
  } else if (typeof meta.line === 'number') {
    inferredLine = meta.line;
  }

  return [
    `Primitive/op: ${meta.primitive || meta.operation || 'unknown'}`,
    `Context: ${meta.contextPath || 'none'}`,
    `Face index: ${faceIndex}`,
    `World point: [${point}]`,
    `World normal: [${normal}]`,
    `Source line: ${inferredLine}`,
    `Snippet: ${meta.snippet || 'n/a'}`,
  ].join('\n');
}

// ── Response extraction ──────────────────────────────
function extractTextFromGemini(responseJson) {
  const candidate = responseJson?.candidates?.[0];
  if (!candidate?.content?.parts) return '';
  return candidate.content.parts
    .filter(p => typeof p.text === 'string')
    .map(p => p.text)
    .join('\n')
    .trim();
}

function extractScad(text) {
  if (!text) return '';
  const fenced = text.match(/```(?:scad|openscad)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  return text.trim();
}

// ── Gemini API call ──────────────────────────────────
async function callGemini({ apiKey, model, system, userPrompt, maxOutputTokens = 16384 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens,
      thinkingConfig: {
        thinkingLevel: 'HIGH',
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let payload = null;
  try { payload = rawText ? JSON.parse(rawText) : {}; }
  catch { payload = null; }

  if (!response.ok) {
    const msg = payload?.error?.message || rawText || `Gemini request failed (${response.status}).`;
    const err = new Error(msg);
    err.statusCode = response.status;
    throw err;
  }

  return payload;
}

// ── Route: /api/chat/generate ────────────────────────
async function handleGenerate(req, res, env) {
  const body = await readJsonBody(req);
  const prompt = (body?.prompt || '').trim();
  const currentCode = typeof body?.currentCode === 'string' ? body.currentCode : '';

  if (!prompt) return sendJson(res, 400, { error: 'Missing prompt.' });

  const userPrompt = currentCode
    ? `The user already has this code:\n\`\`\`\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}`
    : `Generate OpenSCAD code from scratch.\n\nUser request: ${prompt}`;

  const model = env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
  const response = await callGemini({
    apiKey: env.GEMINI_API_KEY,
    model,
    maxOutputTokens: 16384,
    system: SYSTEM_PROMPT_GENERATE,
    userPrompt,
  });

  const scadCode = extractScad(extractTextFromGemini(response));
  if (!scadCode) return sendJson(res, 502, { error: 'Model returned an empty response.' });

  sendJson(res, 200, { scadCode, model });
}

// ── Route: /api/chat/face-edit ───────────────────────
async function handleFaceEdit(req, res, env) {
  const body = await readJsonBody(req);
  const prompt = (body?.prompt || '').trim();
  const currentCode = typeof body?.currentCode === 'string' ? body.currentCode : '';
  const selection = body?.selection;

  if (!prompt) return sendJson(res, 400, { error: 'Missing face-edit prompt.' });
  if (!currentCode.trim()) return sendJson(res, 400, { error: 'Missing current SCAD code.' });

  const userPrompt = [
    `Selected face context:\n${buildSelectionSummary(selection, currentCode)}`,
    '',
    `Requested edit: ${prompt}`,
    '',
    `Current code:\n\`\`\`\n${currentCode}\n\`\`\``,
  ].join('\n');

  const model = env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
  const response = await callGemini({
    apiKey: env.GEMINI_API_KEY,
    model,
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT_FACE_EDIT,
    userPrompt,
  });

  const scadCode = extractScad(extractTextFromGemini(response));
  if (!scadCode) return sendJson(res, 502, { error: 'Model returned an empty response.' });

  sendJson(res, 200, { scadCode, model });
}

// ── Middleware export ────────────────────────────────
export function createGeminiApiMiddleware(env) {
  return async (req, res, next) => {
    const method = req.method || 'GET';
    const pathname = (req.url || '').split('?')[0];

    if (pathname !== '/api/chat/generate' && pathname !== '/api/chat/face-edit') {
      return next();
    }
    if (!env.GEMINI_API_KEY) {
      return sendJson(res, 500, { error: 'Missing GEMINI_API_KEY on server.' });
    }
    if (method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    }

    try {
      if (pathname === '/api/chat/generate') {
        await handleGenerate(req, res, env);
      } else {
        await handleFaceEdit(req, res, env);
      }
    } catch (err) {
      const statusCode = err?.statusCode || 500;
      sendJson(res, statusCode, { error: err?.message || 'Unhandled server error.' });
    }
  };
}
