require('dotenv').config();

const http = require('http');
const path = require('path');
const { URL } = require('url');
const { createClassroomServer } = require('./classroom/classroom-server');
const { handleAccountApi } = require('./accounts/account-server');
const { createOnboardingServer } = require('./accounts/onboarding-server');
const { alertOnError, installProcessHandlers } = require('./accounts/error-alert');

installProcessHandlers();

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = __dirname;

const classroom = createClassroomServer({
  projectRoot: PROJECT_ROOT,
  port: PORT
});

const onboarding = createOnboardingServer({ projectRoot: PROJECT_ROOT });

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    if (
      parsedUrl.pathname.startsWith('/api/auth/') ||
      parsedUrl.pathname.startsWith('/api/teacher/') ||
      parsedUrl.pathname.startsWith('/api/student/') ||
      parsedUrl.pathname.startsWith('/api/signup/')
    ) {
      const accountHandled = await handleAccountApi(req, res, parsedUrl);
      if (accountHandled) return;
      const onboardingHandled = await onboarding.handleOnboardingApi(req, res, parsedUrl);
      if (onboardingHandled) return;
    }

    if (parsedUrl.pathname.startsWith('/api/classroom/')) {
      const handled = await classroom.handleApi(req, res, parsedUrl);
      if (handled) return;
    }
    classroom.serveStatic(req, res, parsedUrl);
  } catch (error) {
    alertOnError(error, { label: 'Request failed', method: req.method, url: req.url });
    if (!res.headersSent) {
      const body = JSON.stringify({ ok: false, error: 'EchoAural service error.' });
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
      });
      res.end(body);
    } else {
      res.end();
    }
  }
});

server.listen(PORT, '0.0.0.0', () => classroom.logStartup());
