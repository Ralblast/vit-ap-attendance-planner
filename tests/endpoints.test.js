// In-process contract tests for the serverless handlers. They mock the
// Vercel request/response shape and assert each endpoint returns the
// expected status when called with no creds, bad creds, etc. Network and
// Firebase Admin calls are not exercised — those require the real env.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import bootstrapHandler from '../api/admin/bootstrap.js';
import semesterHandler from '../api/admin/semester.js';
import eventsHandler from '../api/admin/events.js';
import slotsHandler from '../api/admin/slots.js';
import sendAlertEmail from '../api/send-alert-email.js';
import attendanceReview from '../api/attendance-review.js';

const createReq = ({ method = 'POST', headers = {}, body = {} } = {}) => ({
  method,
  headers,
  body,
  on() {},
  destroy() {},
});

const createRes = () => {
  const res = {
    statusCode: null,
    payload: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  return res;
};

const callHandler = async (handler, req) => {
  const res = createRes();
  await handler(req, res);
  return res;
};

describe('admin validators reject unauthenticated requests', () => {
  for (const [name, handler] of [
    ['semester', semesterHandler],
    ['events', eventsHandler],
    ['slots', slotsHandler],
  ]) {
    it(`${name} returns 401 without a token`, async () => {
      const res = await callHandler(handler, createReq());
      assert.equal(res.statusCode, 401);
      assert.equal(res.payload.ok, false);
    });
  }
});

describe('bootstrap', () => {
  it('returns 503 when the admin env vars are missing', async () => {
    const original = {
      email: process.env.VITE_ADMIN_EMAIL,
      password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    };
    delete process.env.VITE_ADMIN_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;

    const res = await callHandler(
      bootstrapHandler,
      createReq({ body: { email: 'a@b.com', password: 'x' } })
    );
    assert.equal(res.statusCode, 503);

    if (original.email) process.env.VITE_ADMIN_EMAIL = original.email;
    if (original.password) process.env.ADMIN_BOOTSTRAP_PASSWORD = original.password;
  });
});

describe('attendance-review cron', () => {
  it('returns 401 with no secret', async () => {
    const res = await callHandler(
      attendanceReview,
      createReq({ method: 'GET' })
    );
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 with a wrong secret', async () => {
    const original = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'expected-secret';
    const res = await callHandler(
      attendanceReview,
      createReq({ method: 'GET', headers: { authorization: 'Bearer wrong-secret' } })
    );
    assert.equal(res.statusCode, 401);
    process.env.CRON_SECRET = original;
  });

  it('rejects POST', async () => {
    const res = await callHandler(attendanceReview, createReq({ method: 'POST' }));
    assert.equal(res.statusCode, 405);
  });
});

describe('send-alert-email', () => {
  it('returns 401 without a token', async () => {
    const res = await callHandler(sendAlertEmail, createReq());
    assert.equal(res.statusCode, 401);
  });

  it('rejects GET', async () => {
    const res = await callHandler(sendAlertEmail, createReq({ method: 'GET' }));
    assert.equal(res.statusCode, 405);
  });
});
