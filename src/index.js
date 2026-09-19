// PromptFlow-Hub Entrypoint
const Server = require('./server');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const server = new Server(PORT);

server.start();

process.on('SIGINT', () => {
  console.log('\nShutting down PromptFlow-Hub studio...');
  server.stop();
  process.exit(0);
});
