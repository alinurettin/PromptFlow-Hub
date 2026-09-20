// PromptFlow-Hub - Production Engine Entrypoint
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');


const PromptEngine = require('./engine');
const pe = new PromptEngine();
function handleApi(req, res, pathname, body) {
  if (req.method === 'POST' && pathname === '/api/prompts/render') {
    const data = JSON.parse(body || '{}');
    const rendered = pe.render(data.template || '', data.variables || {});
    const tokens = pe.estimateTokens(rendered);
    const cost = pe.calculateCost(tokens, data.model);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ rendered, tokens, costEstimateUsd: cost }));
  }
  return false;
}


const PORT = parseInt(process.env.PORT, 10) || 6003;
const publicDir = path.join(__dirname, '..', 'public');
const startTime = Date.now();

function requestHandler(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // Aggregate body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // 1. Health Endpoint
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        status: 'UP',
        service: 'PromptFlow-Hub',
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString()
      }));
    }

    // 2. Stats Endpoint
    if (pathname === '/api/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        success: true,
        service: 'PromptFlow-Hub',
        category: 'Generative AI & LLMOps',
        status: 'OPTIMAL',
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
      }));
    }

    // 3. Custom Domain API
    if (typeof handleApi === 'function') {
      const handled = handleApi(req, res, pathname, body);
      if (handled !== false) return;
    }

    // 4. Static Asset Delivery
    let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath);
        const mime = ext === '.html' ? 'text/html; charset=utf-8' : (ext === '.css' ? 'text/css' : 'application/javascript');
        res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint Not Found', path: pathname }));
      }
    });
  });
}

function startServer(port = PORT, callback) {
  const s = http.createServer(requestHandler);
  s.listen(port, () => {
    if (callback) callback(s);
  });
  return s;
}

if (require.main === module) {
  startServer(PORT, () => {
    console.log('PromptFlow-Hub server running on port ' + PORT);
  });
}

module.exports = { startServer, requestHandler };
