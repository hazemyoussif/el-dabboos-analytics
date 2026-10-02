import assert from 'node:assert/strict';
import test from 'node:test';
import { PlannerActivity, runPlannerOperation } from '../src/planner-activity.ts';
import type { PlannerActivityState } from '../src/planner-activity.ts';
import { formatPlannerElapsed, plannerErrorMessage, plannerDisplayError, plannerFailureMessage } from '../src/planner-copy.ts';
import { ApiClientError } from '../src/api/client.ts';
function fixture() {
  let time = 0; let tick: (() => void) | undefined;
  const states: PlannerActivityState[] = [];
  const activity = new PlannerActivity(state => states.push(state), { now: () => time, everySecond: callback => { tick = callback; return () => { tick = undefined; }; } });
  return { activity, states, advance(ms: number) { time += ms; tick?.(); }, ticking: () => tick !== undefined };
}
for (const operation of ['generating', 'editing'] as const) test(`${operation} starts truthful elapsed progress and clears on success`, async () => {
  const f = fixture(); let resolve!: (value: string) => void; let applied: string | null = null; let loading = false;
  const result = runPlannerOperation(f.activity, operation, { current: () => true, start: () => { loading = true; }, request: () => new Promise<string>(done => { resolve = done; }), apply: value => { applied = value; }, fail: () => assert.fail('unexpected failure'), settle: () => { loading = false; } });
  assert.equal(loading, true); assert.deepEqual(f.states.at(-1), { operation, elapsedMs: 0 });
  f.advance(12000); assert.deepEqual(f.states.at(-1), { operation, elapsedMs: 12000 }); assert.equal(formatPlannerElapsed(12000), '00:12');
  resolve('compiled spec'); assert.equal(await result, true); assert.equal(applied, 'compiled spec'); assert.equal(loading, false);
  assert.deepEqual(f.states.at(-1), { operation: 'idle', elapsedMs: 0 }); assert.equal(f.ticking(), false);
  f.advance(10000); assert.equal(f.states.at(-1)!.elapsedMs, 0);
});
for (const code of ['LLM_RATE_LIMITED', 'LLM_TIMEOUT', 'LLM_HTTP_ERROR', 'LLM_UNAVAILABLE', 'INVALID_STRUCTURED_OUTPUT']) test(`${code} stops progress without modifying the working dashboard`, async () => {
  const f = fixture(); const dashboard = { title: 'Working draft' }; const original = structuredClone(dashboard); let error: ApiClientError | undefined; let loading = false;
  const succeeded = await runPlannerOperation(f.activity, 'editing', { current: () => true, start: () => { loading = true; }, request: async () => { f.advance(3000); throw new ApiClientError(502, code, 'upstream secret body'); }, apply: () => { dashboard.title = 'Wrong'; }, fail: cause => { error = cause as ApiClientError; }, settle: () => { loading = false; } });
  assert.equal(succeeded, false); assert.deepEqual(dashboard, original); assert.equal(error?.code, code); assert.equal(loading, false); assert.equal(f.ticking(), false);
  for (const locale of ['en', 'ar'] as const) { const message = plannerErrorMessage(error!.code, locale); assert.ok(!message.includes('upstream secret')); assert.ok(message.includes(locale === 'en' ? 'not changed' : 'لم تتغير')); }
});
test('reset ignores late provider success and releases only its loading state', async () => {
  const f = fixture(); let resolve!: (value: string) => void; let applied = false; let loading = false;
  const request = runPlannerOperation(f.activity, 'generating', { current: () => true, start: () => { loading = true; }, request: () => new Promise<string>(done => { resolve = done; }), apply: () => { applied = true; }, fail() {}, settle: () => { loading = false; } });
  f.activity.reset(); assert.equal(loading, false); assert.equal(f.ticking(), false); resolve('late'); assert.equal(await request, false); assert.equal(applied, false);
});
test('stale workspace request clears timer without touching newer workspace state or late response', async () => {
  const f = fixture(); let current = true; let resolve!: (value: string) => void; let applied = false; let settled = false;
  const request = runPlannerOperation(f.activity, 'generating', { current: () => current, start() {}, request: () => new Promise<string>(done => { resolve = done; }), apply: () => { applied = true; }, fail() {}, settle: () => { settled = true; } });
  current = false; f.advance(1000); assert.equal(f.ticking(), false); assert.equal(f.states.at(-1)!.operation, 'idle'); resolve('late'); assert.equal(await request, false); assert.equal(applied, false); assert.equal(settled, false);
});
test('duplicate submissions cannot replace active request ownership and a later request can start', () => {
  const f = fixture(); const token = f.activity.start('generating', () => true)!;
  assert.equal(f.activity.isIdle(), false); assert.equal(f.activity.start('editing', () => true), null); assert.equal(f.activity.owns(token), true);
  f.activity.finish(token); assert.equal(f.activity.isIdle(), true); const next = f.activity.start('editing', () => true)!;
  f.activity.finish(token); assert.equal(f.activity.owns(next), true); f.activity.reset();
});
test('timer formats minutes safely and localized errors never use unknown provider messages', () => {
  assert.equal(formatPlannerElapsed(65000), '01:05'); assert.equal(formatPlannerElapsed(-1000), '00:00');
  assert.match(plannerErrorMessage('LLM_TIMEOUT', 'en'), /did not respond in time/); assert.match(plannerErrorMessage('LLM_HTTP_ERROR', 'en'), /rejected the structured request/);
  assert.match(plannerErrorMessage('LLM_TIMEOUT', 'ar'), /الوقت المحدد/); assert.match(plannerErrorMessage('LLM_HTTP_ERROR', 'ar'), /رفض/);
  assert.match(plannerErrorMessage('malicious-provider-message', 'en'), /could not be completed/);
});

test('a provider failure relocalizes with the UI without overwriting other workspace errors', () => {
  const message = plannerErrorMessage('LLM_TIMEOUT', 'en');
  assert.equal(plannerDisplayError(message, 'LLM_TIMEOUT', 'ar'), plannerErrorMessage('LLM_TIMEOUT', 'ar'));
  assert.equal(plannerDisplayError('Save version conflict', 'LLM_TIMEOUT', 'ar'), 'Save version conflict');
  assert.equal(plannerDisplayError(null, 'LLM_TIMEOUT', 'ar'), null);
});

test('provider failures hide upstream text while existing demo/authorization API explanations remain intact', () => {
  assert.equal(plannerFailureMessage('LLM_PROTOCOL_ERROR', 'sensitive body', 'en'), plannerErrorMessage('REQUEST_FAILED', 'en'));
  assert.equal(plannerFailureMessage('UNSUPPORTED_DEMO_INTENT', 'The demo planner supports predefined examples.', 'en'), 'The demo planner supports predefined examples.');
  assert.equal(plannerFailureMessage('METRIC_FORBIDDEN', 'Metric access denied.', 'ar'), 'Metric access denied.');
});
