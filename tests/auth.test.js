// desc: Tests for token rotation functionality
// file: tests/auth.test.js

const request = require('supertest');
const mongoose = require('mongoose');

jest.setTimeout(30000); // Allow time for DB connection

const BASE_URL = 'http://localhost:3500';
const ORIGIN = 'http://localhost:3000';

// Extract cookie value helper
function extractJwtToken(setCookieArray) {
  if (!setCookieArray) return null;
  const arr = Array.isArray(setCookieArray) ? setCookieArray : [setCookieArray];
  for (const cookie of arr) {
    const match = cookie.match(/jwt=([^;]+)/);
    if (match && match[1]) return match[1];
  }
  return null;
}

describe('Token Rotation', () => {
  let refreshToken1;
  let refreshToken2;
  let server;

  // Start server and wait for DB connection
  beforeAll(async () => {
    // Import server module (this triggers DB connection)
    const serverModule = require('../server');

    // If server exports the app/server instance, use it
    if (serverModule && typeof serverModule.address === 'function') {
      server = serverModule;
    } else {
      // Wait for mongoose to connect (server logs "Connected to MongoDB" when ready)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for MongoDB connection'));
        }, 15000);

        if (mongoose.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });
    }
  });

  test('Login returns tokens', async () => {
    const res = await request(BASE_URL)
      .post('/auth')
      .set('Origin', ORIGIN)
      .set('Referer', ORIGIN)
      .send({ username: 'Josh', password: '65gGuChX' });

    expect([200, 201]).toContain(res.status);

    // Should receive access token in body
    expect(res.body.accessToken).toBeDefined();

    // Should receive refresh token in cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();

    refreshToken1 = extractJwtToken(cookies);
    expect(refreshToken1).toBeDefined();
  });

  test('Refresh rotates token', async () => {
    expect(refreshToken1).toBeDefined();

    const res = await request(BASE_URL)
      .get('/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Referer', ORIGIN)
      .set('Cookie', `jwt=${refreshToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();

    refreshToken2 = extractJwtToken(cookies);
    expect(refreshToken2).toBeDefined();
    expect(refreshToken2).not.toBe(refreshToken1);
  });

  test('Old token is invalidated', async () => {
    expect(refreshToken1).toBeDefined();

    const res = await request(BASE_URL)
      .get('/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Referer', ORIGIN)
      .set('Cookie', `jwt=${refreshToken1}`);

    // Should reject reused token
    expect([401, 403]).toContain(res.status);
    if (res.body.message) {
      expect(res.body.message).toMatch(/reuse|invalid|revoked/i);
    }
  });
});
