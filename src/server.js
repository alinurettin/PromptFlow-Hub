// PromptFlow-Hub - Server Compatibility Wrapper
const { startServer, requestHandler } = require('./index');

class Server {
  constructor(port = 6003) {
    this.port = port;
    this.httpServer = null;
  }

  start() {
    this.httpServer = startServer(this.port);
    return this.httpServer;
  }

  stop() {
    if (this.httpServer) this.httpServer.close();
  }
}

module.exports = Server;
