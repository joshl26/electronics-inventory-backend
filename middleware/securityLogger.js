// middleware/securityLogger.js
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'logs', 'securityLog.log');

// Ensure log directory/file exists (appendFile will create file if missing)
function appendLog(line) {
  const ts = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${ts}] ${line}\n`);
  } catch (err) {
    // If logging fails, still print to console so debugging isn't lost
    console.error('Failed to write security log:', err);
  }
}

function logFailedLogin(username = 'unknown', ip = 'unknown', reason = '') {
  const line = `Failed login: user=${username} ip=${ip} reason=${reason}`;
  console.log(line);
  appendLog(line);
}

function logSuccessfulLogin(username = 'unknown', ip = 'unknown', device = '') {
  const line = `Successful login: user=${username} ip=${ip} device=${device}`;
  console.log(line);
  appendLog(line);
}

function logSuspiciousActivity(message = 'suspicious activity', req = {}) {
  // req may be an express req object; try to extract some useful info
  const ip = req && req.ip ? req.ip : req && req.ipv6 ? req.ipv6 : 'unknown';
  const url = req && req.originalUrl ? req.originalUrl : req && req.url ? req.url : '';
  const ua = req && req.headers ? req.headers['user-agent'] : '';
  const line = `Suspicious activity: msg="${message}" ip=${ip} url=${url} ua="${ua}"`;
  console.warn(line);
  appendLog(line);
}

function logTokenReuse(username = 'unknown', ip = 'unknown') {
  const line = `Token reuse detected: user=${username} ip=${ip}`;
  console.warn(line);
  appendLog(line);
}

function logLogout(username = 'unknown', ip = 'unknown') {
  const line = `Logout: user=${username} ip=${ip}`;
  console.log(line);
  appendLog(line);
}

function logLogoutAll(username = 'unknown', ip = 'unknown') {
  const line = `Logout all sessions: user=${username} ip=${ip}`;
  console.log(line);
  appendLog(line);
}

module.exports = {
  logFailedLogin,
  logSuccessfulLogin,
  logSuspiciousActivity,
  logTokenReuse,
  logLogout,
  logLogoutAll,
};
