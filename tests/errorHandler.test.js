// tests/errorHandler.test.js
jest.mock('../middleware/logger', () => ({
  logEvents: jest.fn(),
}));

const errorHandler = require('../middleware/errorHandler');
const { logEvents } = require('../middleware/logger');

describe('errorHandler', () => {
  test('formats error response and logs', () => {
    const err = new Error('Test error');
    err.status = 500;

    // Provide a realistic req object so middleware can read method/url/headers.origin
    const req = {
      method: 'POST',
      url: '/test-endpoint',
      headers: {
        origin: 'http://localhost:3000',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(logEvents).toHaveBeenCalled(); // ensure logging was attempted
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
      }),
    );
  });
});
