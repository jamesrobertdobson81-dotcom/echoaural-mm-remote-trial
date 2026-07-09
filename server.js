const http = require('http');
const path = require('path');
const { URL } = require('url');
const { createClassroomServer } = require('./classroom/classroom-server');

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = __dirname;

const classroom = createClassroomServer({
  projectRoot: PROJECT_ROOT,
  port: PORT
});

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  if (parsedUrl.pathname.startsWith('/api/classroom/')) {
    const handled = await classroom.handleApi(req, res, parsedUrl);
    if (handled) return;
  }
  classroom.serveStatic(req, res, parsedUrl);
});

server.listen(PORT, '0.0.0.0', () => classroom.logStartup());
