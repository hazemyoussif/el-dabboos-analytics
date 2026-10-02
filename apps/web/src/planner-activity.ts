export type PlannerOperation = 'idle' | 'generating' | 'editing';
export interface PlannerActivityState { operation: PlannerOperation; elapsedMs: number }
interface Clock { now(): number; everySecond(tick: () => void): () => void }
const clock: Clock = { now: () => performance.now(), everySecond: tick => { const id = setInterval(tick, 1000); return () => clearInterval(id); } };
/** Request ownership and timing are separate from unrelated workspace loading. */
export class PlannerActivity {
  private serial = 0;
  private stopTimer: (() => void) | undefined;
  private active = false;
  private onStop: (() => void) | undefined;
  isIdle(): boolean { return !this.active; }
  constructor(private readonly publish: (state: PlannerActivityState) => void, private readonly time: Clock = clock) {}
  start(operation: Exclude<PlannerOperation, 'idle'>, current: () => boolean, onStop?: () => void): number | null {
    if (this.active) return null;
    this.active = true; this.onStop = onStop;
    const token = ++this.serial; const started = this.time.now();
    this.publish({ operation, elapsedMs: 0 });
    this.stopTimer = this.time.everySecond(() => {
      if (!current()) { this.reset(); return; }
      this.publish({ operation, elapsedMs: Math.max(0, this.time.now() - started) });
    });
    return token;
  }
  owns(token: number): boolean { return this.active && token === this.serial; }
  finish(token: number): void { if (this.owns(token)) this.reset(); }
  reset(): void {
    this.serial++; this.active = false; this.stopTimer?.(); this.stopTimer = undefined;
    const onStop = this.onStop; this.onStop = undefined; onStop?.();
    this.publish({ operation: 'idle', elapsedMs: 0 });
  }
}
export async function runPlannerOperation<T>(activity: PlannerActivity, operation: Exclude<PlannerOperation, 'idle'>, callbacks: {
  current(): boolean; start(): void; request(): Promise<T>; apply(result: T): void; fail(error: unknown): void; settle(): void;
}): Promise<boolean> {
  const token = activity.start(operation, callbacks.current, () => { if (callbacks.current()) callbacks.settle(); });
  if (token === null) return false;
  const current = () => activity.owns(token) && callbacks.current();
  callbacks.start();
  try {
    const result = await callbacks.request();
    if (current()) { callbacks.apply(result); return true; }
  } catch (error) { if (current()) callbacks.fail(error); }
  finally {
    activity.finish(token);
  }
  return false;
}
