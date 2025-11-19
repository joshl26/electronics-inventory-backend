// tests/authController.unit.test.js
const authController = require('../controllers/authController');
const httpMocks = require('node-mocks-http');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../models/User');
jest.mock('../middleware/securityLogger');

const User = require('../models/User');
const securityLogger = require('../middleware/securityLogger');

describe('authController (unit)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ACCESS_TOKEN_SECRET = 'access_secret';
    process.env.REFRESH_TOKEN_SECRET = 'refresh_secret';
  });

  function makeRes() {
    const res = httpMocks.createResponse({ eventEmitter: require('events').EventEmitter });
    // attach cookie spy
    res.cookie = jest.fn();
    res.clearCookie = jest.fn();
    return res;
  }

  test('login: missing credentials returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(400);
    const data = res._getJSONData();
    expect(data.message).toMatch(/All fields are required/i);
    expect(securityLogger.logFailedLogin).toHaveBeenCalled();
  });

  test('login: user not found returns 401', async () => {
    User.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const req = httpMocks.createRequest({ body: { username: 'u', password: 'p' }, ip: '1.2.3.4' });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(401);
    expect(securityLogger.logFailedLogin).toHaveBeenCalledWith('u', '1.2.3.4', expect.any(String));
  });

  test('login: inactive user returns 401', async () => {
    const fakeUser = { username: 'u', active: false, password: 'hash' };
    User.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(fakeUser) });
    const req = httpMocks.createRequest({ body: { username: 'u', password: 'p' }, ip: '1.2.3.4' });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(401);
    expect(securityLogger.logFailedLogin).toHaveBeenCalled();
  });

  test('login: wrong password returns 401', async () => {
    const fakeUser = { username: 'u', active: true, password: 'hash' };
    User.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(fakeUser) });
    bcrypt.compare = jest.fn().mockResolvedValue(false);

    const req = httpMocks.createRequest({ body: { username: 'u', password: 'p' }, ip: '1.2.3.4' });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(401);
    expect(securityLogger.logFailedLogin).toHaveBeenCalled();
  });

  test('login: success sets cookie and returns accessToken', async () => {
    const fakeUser = {
      username: 'Josh',
      active: true,
      password: '65gGuChX',
      refreshTokens: [],
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(fakeUser) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    // Mock jwt.sign to predictable tokens
    jwt.sign = jest
      .fn()
      .mockImplementationOnce(() => 'access-token') // access token signing
      .mockImplementationOnce(() => 'refresh-token'); // refresh token

    const req = httpMocks.createRequest({
      body: { username: 'u', password: 'p' },
      ip: '1.2.3.4',
      headers: {},
    });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.accessToken).toBe('access-token');

    // cookie set for refresh token
    expect(res.cookie).toHaveBeenCalledWith(
      'jwt',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    // security logger called for success
    expect(securityLogger.logSuccessfulLogin).toHaveBeenCalledWith(
      'u',
      '1.2.3.4',
      expect.any(String),
    );
    // saved user got refresh token pushed
    expect(fakeUser.save).toHaveBeenCalled();
  });
});
