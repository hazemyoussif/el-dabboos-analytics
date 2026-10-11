import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHostedMartUrl } from '../src/hosted-mart-url.ts';

test('hosted mart URL allows loopback and approved staging postgres service', () => {
  assert.match(assertHostedMartUrl('postgres://u:p@127.0.0.1:5432/db',{},'bad'),/127\.0\.0\.1/);
  assert.match(assertHostedMartUrl('postgres://u:p@postgres:5432/db',{ENVIRONMENT:'staging'},'bad'),/postgres:5432/);
});

test('hosted mart URL rejects postgres service outside staging and arbitrary remote hosts', () => {
  assert.throws(()=>assertHostedMartUrl('postgres://u:p@postgres:5432/db',{},'bad'),/bad/);
  assert.throws(()=>assertHostedMartUrl('postgres://u:p@db.internal:5432/db',{ENVIRONMENT:'staging'},'bad'),/bad/);
});
