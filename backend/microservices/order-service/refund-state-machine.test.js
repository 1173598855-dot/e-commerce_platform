const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertRefundTransition,
  buildRefundIdempotencyKey,
  canRequestRefundForOrder,
  normalizeRefundStatus,
} = require('./refund-state-machine');

test('canRequestRefundForOrder allows paid shipped and completed orders only', () => {
  assert.equal(canRequestRefundForOrder({ status: 'paid' }), true);
  assert.equal(canRequestRefundForOrder({ status: 'shipped' }), true);
  assert.equal(canRequestRefundForOrder({ status: 'completed' }), true);
  assert.equal(canRequestRefundForOrder({ status: 'pending' }), false);
  assert.equal(canRequestRefundForOrder({ status: 'cancelled' }), false);
});

test('assertRefundTransition allows the expected refund workflow', () => {
  assert.equal(assertRefundTransition('requested', 'approved'), true);
  assert.equal(assertRefundTransition('requested', 'rejected'), true);
  assert.equal(assertRefundTransition('approved', 'refunding'), true);
  assert.equal(assertRefundTransition('refunding', 'refunded'), true);
  assert.equal(assertRefundTransition('refunding', 'failed'), true);
  assert.equal(assertRefundTransition('failed', 'refunding'), true);
});

test('assertRefundTransition rejects invalid or terminal transitions', () => {
  assert.throws(() => assertRefundTransition('requested', 'refunded'), /Invalid refund transition: requested -> refunded/);
  assert.throws(() => assertRefundTransition('refunded', 'approved'), /Invalid refund transition: refunded -> approved/);
  assert.throws(() => assertRefundTransition('rejected', 'approved'), /Invalid refund transition: rejected -> approved/);
});

test('buildRefundIdempotencyKey scopes duplicate refund applications by order and type', () => {
  assert.equal(
    buildRefundIdempotencyKey({ orderId: 7, refundType: 'full' }),
    'refund:order:7:type:full'
  );
});

test('normalizeRefundStatus rejects unknown statuses', () => {
  assert.equal(normalizeRefundStatus(' REQUESTED '), 'requested');
  assert.throws(() => normalizeRefundStatus('unknown'), /Unsupported refund status: unknown/);
});
