const test = require('node:test');
const assert = require('node:assert/strict');

const { sendRes, sendError } = require('./index');

function createResponse(requestId) {
  return {
    statusCode: null,
    body: null,
    req: { headers: { 'x-request-id': requestId } },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    getHeader() {
      return undefined;
    }
  };
}

test('sendRes returns unified response contract with requestId', () => {
  const res = createResponse('req-123');

  sendRes(res, { ok: true }, 'ok');

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    code: 200,
    data: { ok: true },
    message: 'ok',
    requestId: 'req-123'
  });
});

test('sendError returns numeric code and requestId', () => {
  const res = createResponse('req-456');

  sendError(res, 'Token invalid', 401, 30002);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    code: 30002,
    data: null,
    message: 'Token invalid',
    requestId: 'req-456'
  });
});
