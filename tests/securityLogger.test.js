// tests/securityLogger.unit.test.js
const fs = require('fs');
const path = require('path');

jest.resetModules();
const logger = require('../middleware/securityLogger');

const logFile = path.join(__dirname, '..', 'logs', 'securityLog.log');

describe('securityLogger', () => {
  beforeEach(() => {
    // clean up log if exists
    try {
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (e) {
      `${e}`;
    }
  });

  test('writes successful login entry', () => {
    logger.logSuccessfulLogin('u1', '1.2.3.4', 'agentX');
    const contents = fs.readFileSync(logFile, 'utf8');
    expect(contents).toMatch(/Successful login: user=u1 ip=1.2.3.4 device=agentX/);
  });

  test('handles appendFileSync failure gracefully', () => {
    // Temporarily stub appendFileSync to throw
    const realAppend = fs.appendFileSync;
    fs.appendFileSync = () => {
      throw new Error('disk full');
    };

    // Should not throw when calling logger
    expect(() => {
      logger.logFailedLogin('u2', '5.6.7.8', 'reason');
    }).not.toThrow();

    // restore
    fs.appendFileSync = realAppend;
  });
});
