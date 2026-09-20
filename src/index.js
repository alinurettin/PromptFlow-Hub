// PromptFlow-Hub v2.0.0 - Production HTTP Server & LLMOps Gateway
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PromptEngine = require('./engine');
const { defaultStore } = require('./store');
const { MODEL_REGISTRY, estimateCosts } = require('./estimator');
const { computeLineDiff, interpolateVariables, extractVariables } = require('./diff');

const engine = new PromptEngine(defaultStore);
const PORT = parseInt(process.env.PORT, 10) || 6003;
const publicDir = path.join(__dirname, '..', 'public');
const startTime = Date.now();

function requestHandler(req, res) {
  const reqUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = reqUrl.pathname;

  // CORS Headers
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    const jsonRes = (statusCode, data) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data));
    };

    let parsedBody = {};
    if (body) {
      try { parsedBody = JSON.parse(body); } catch (e) { /* fallback empty */ }
    }

    // 1. Health API
    if (pathname === '/api/health') {
      return jsonRes(200, {
        status: 'UP',
        service: 'PromptFlow-Hub',
        version: '2.0.0',
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // 2. Stats & Telemetry API
    if (pathname === '/api/stats') {
      const allPrompts = defaultStore.getAll();
      const totalVersions = allPrompts.reduce((acc, p) => acc + (p.versions ? p.versions.length : 0), 0);
      return jsonRes(200, {
        success: true,
        service: 'PromptFlow-Hub',
        version: '2.0.0',
        totalPrompts: allPrompts.length,
        totalVersions,
        modelsSupported: Object.keys(MODEL_REGISTRY),
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
      });
    }

    // 3. Prompts: List All
    if (req.method === 'GET' && pathname === '/api/prompts') {
      const prompts = defaultStore.getAll();
      return jsonRes(200, {
        success: true,
        count: prompts.length,
        prompts
      });
    }

    // 4. Prompts: Create
    if (req.method === 'POST' && pathname === '/api/prompts') {
      if (!parsedBody.title) {
        return jsonRes(400, { success: false, error: 'Field "title" is required' });
      }
      const prompt = defaultStore.createPrompt(parsedBody);
      return jsonRes(201, { success: true, prompt });
    }

    // 5. Prompts: Get Single
    const singleMatch = pathname.match(/^\/api\/prompts\/([^/]+)$/);
    if (req.method === 'GET' && singleMatch) {
      const prompt = defaultStore.get(singleMatch[1]);
      if (!prompt) return jsonRes(404, { success: false, error: 'Prompt not found' });
      return jsonRes(200, { success: true, prompt });
    }

    // 6. Prompts: Add Version
    const versionMatch = pathname.match(/^\/api\/prompts\/([^/]+)\/version$/);
    if (req.method === 'POST' && versionMatch) {
      const id = versionMatch[1];
      const updated = defaultStore.addVersion(id, parsedBody.content || '', parsedBody.changelog || 'Version bump');
      if (!updated) return jsonRes(404, { success: false, error: 'Prompt not found' });
      return jsonRes(200, { success: true, prompt: updated });
    }

    // 7. Prompts: Rollback Version
    const rollbackMatch = pathname.match(/^\/api\/prompts\/([^/]+)\/rollback$/);
    if (req.method === 'POST' && rollbackMatch) {
      const id = rollbackMatch[1];
      const rolledBack = defaultStore.rollback(id, parsedBody.targetVersion);
      if (!rolledBack) return jsonRes(404, { success: false, error: 'Target version not found for rollback' });
      return jsonRes(200, { success: true, prompt: rolledBack });
    }

    // 8. Prompts: Delete
    if (req.method === 'DELETE' && singleMatch) {
      const id = singleMatch[1];
      const deleted = defaultStore.delete(id);
      return jsonRes(deleted ? 200 : 404, {
        success: deleted,
        message: deleted ? 'Prompt deleted successfully' : 'Prompt not found'
      });
    }

    // 9. Cost Estimation API
    if (req.method === 'POST' && pathname === '/api/estimate') {
      const text = parsedBody.text || '';
      const estimates = estimateCosts(text);
      return jsonRes(200, { success: true, ...estimates });
    }

    // 10. LCS Diff Engine API
    if (req.method === 'POST' && pathname === '/api/diff') {
      const result = computeLineDiff(parsedBody.oldText || '', parsedBody.newText || '');
      return jsonRes(200, { success: true, ...result });
    }

    // 11. Interpolation / Render API
    if (req.method === 'POST' && (pathname === '/api/interpolate' || pathname === '/api/prompts/render')) {
      const template = parsedBody.template || parsedBody.content || '';
      const vars = parsedBody.variables || {};
      const rendered = interpolateVariables(template, vars);
      const tokens = engine.estimateTokens(rendered, parsedBody.model);
      const costEstimateUsd = engine.calculateCost(tokens, parsedBody.model);
      const detectedVars = extractVariables(template);

      return jsonRes(200, {
        success: true,
        rendered,
        tokens,
        costEstimateUsd,
        variables: detectedVars
      });
    }

    // 12. Static Assets
    let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      return fs.createReadStream(filePath).pipe(res);
    }

    jsonRes(404, { error: 'Endpoint Not Found', path: pathname });
  });
}

function startServer(port = PORT, callback) {
  const server = http.createServer(requestHandler);
  server.listen(port, () => {
    if (callback) callback(server);
  });
  return server;
}

if (require.main === module) {
  startServer(PORT, (s) => {
    console.log(`✨ PromptFlow-Hub v2.0.0 running on http://localhost:${PORT}`);
  });
}

module.exports = { startServer, requestHandler, engine, defaultStore };
