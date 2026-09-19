// HTTP REST Server for PromptFlow-Hub
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const store = require('./store');
const { estimateCosts } = require('./estimator');
const { computeLineDiff, interpolateVariables } = require('./diff');

class Server {
  constructor(port = 5000) {
    this.port = port;
    this.publicDir = path.join(__dirname, '..', 'public');
    this.httpServer = http.createServer((req, res) => this.handleRequest(req, res));
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };
    return map[ext] || 'text/plain; charset=utf-8';
  }

  sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }

  async parseBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  async handleRequest(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    // 1. List Prompts
    if (pathname === '/api/prompts' && method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        count: store.getAll().length,
        prompts: store.getAll()
      });
    }

    // 2. Create Prompt
    if (pathname === '/api/prompts' && method === 'POST') {
      const body = await this.parseBody(req);
      if (!body.title) {
        return this.sendJson(res, 400, { success: false, error: 'title is required' });
      }
      const prompt = store.createPrompt(body);
      return this.sendJson(res, 201, { success: true, prompt });
    }

    // 3. Add Version to Prompt
    if (pathname.match(/^\/api\/prompts\/([^/]+)\/version$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await this.parseBody(req);
      const updated = store.addVersion(id, body.content || '', body.changelog || 'Version bump');
      if (!updated) {
        return this.sendJson(res, 404, { success: false, error: 'Prompt not found' });
      }
      return this.sendJson(res, 200, { success: true, prompt: updated });
    }

    // 4. Delete Prompt
    if (pathname.startsWith('/api/prompts/') && method === 'DELETE') {
      const id = pathname.replace('/api/prompts/', '');
      const deleted = store.delete(id);
      return this.sendJson(res, deleted ? 200 : 404, {
        success: deleted,
        message: deleted ? 'Prompt deleted' : 'Prompt not found'
      });
    }

    // 5. Estimate Tokens & Costs
    if (pathname === '/api/estimate' && method === 'POST') {
      const body = await this.parseBody(req);
      const estimates = estimateCosts(body.text || '');
      return this.sendJson(res, 200, { success: true, ...estimates });
    }

    // 6. Diff Two Versions
    if (pathname === '/api/diff' && method === 'POST') {
      const body = await this.parseBody(req);
      const diff = computeLineDiff(body.oldText || '', body.newText || '');
      return this.sendJson(res, 200, { success: true, diff });
    }

    // 7. Interpolate Template Variables
    if (pathname === '/api/interpolate' && method === 'POST') {
      const body = await this.parseBody(req);
      const result = interpolateVariables(body.template || '', body.variables || {});
      return this.sendJson(res, 200, { success: true, interpolated: result });
    }

    // Static Assets
    let filePath = path.join(this.publicDir, pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const mime = this.getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    });
  }

  start() {
    this.httpServer.listen(this.port, () => {
      console.log(`====================================================`);
      console.log(`  PromptFlow-Hub Studio Server Running`);
      console.log(`  URL: http://localhost:${this.port}`);
      console.log(`====================================================`);
    });
  }

  stop() {
    this.httpServer.close();
  }
}

module.exports = Server;
