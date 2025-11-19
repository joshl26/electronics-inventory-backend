// tests/verifyJWT.test.js
const jwt = require('jsonwebtoken');

// Mock DB model if needed (uncomment / adjust if verifyJWT imports TokenBlacklist)
jest.mock('../models/TokenBlacklist', () => ({ findOne: jest.fn() }));
const TokenBlacklist = require('../models/TokenBlacklist');

const verifyJWT = require('../middleware/verifyJWT');

jest.setTimeout(10000);

function makeReq(token) {
  const headers = {};
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  return { headers, cookies: {} };
}

function makeRes() {
  return {
    statusCalled: null,
    jsonCalled: null,
    status(code) {
      this.statusCalled = code;
      return this;
    },
    json(obj) {
      this.jsonCalled = obj;
      return this;
    },
  };
}

// Run middleware and ensure we always clear timers (no leaked handles)
function runMiddleware(req, res, opts = { timeoutMs: 5000 }) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let interval = null;
    let timeout = null;

    const cleanup = () => {
      finished = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const next = (err) => {
      if (finished) return;
      cleanup();
      if (err) return reject(err);
      return resolve({ nextCalled: true, req, res });
    };

    // Poll for res changes (in case middleware writes a response)
    interval = setInterval(() => {
      if (finished) return;
      if (res.statusCalled !== null || res.jsonCalled !== null) {
        cleanup();
        return resolve({ nextCalled: false, req, res });
      }
    }, 10);

    timeout = setTimeout(() => {
      if (finished) return;
      cleanup();
      return reject(new Error('Middleware did not call next() or send a response within timeout'));
    }, opts.timeoutMs);

    try {
      verifyJWT(req, res, next);
    } catch (err) {
      cleanup();
      return reject(err);
    }
  });
}

describe('verifyJWT middleware (unit)', () => {
  const secret = 'test_access_secret';

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = secret;
  });

  test('calls next when token is valid', async () => {
    const token = jwt.sign({ UserInfo: { username: 'Josh' } }, secret, { expiresIn: '1h' });
    const req = makeReq(token);
    const res = makeRes();

    const result = await runMiddleware(req, res);
    expect(result.nextCalled).toBeTruthy();
  });

  test('returns 401/403 when no Authorization header present', async () => {
    const req = makeReq(undefined);
    const res = makeRes();

    const result = await runMiddleware(req, res);
    expect([401, 403]).toContain(result.res.statusCalled);
    expect(result.res.jsonCalled).toBeDefined();
  });

  test('returns 401/403 when token is malformed/invalid', async () => {
    const req = makeReq('this.is.not.valid');
    const res = makeRes();

    const result = await runMiddleware(req, res);
    expect([401, 403]).toContain(result.res.statusCalled);
    expect(result.res.jsonCalled).toBeDefined();
  });
});
