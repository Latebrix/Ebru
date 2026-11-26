/**
 * Work that can be done before it is needed: preparing canvases, building shapes. One piece at a
 * time, only while the page has nothing better to do, so nothing stutters when a section arrives.
 */
type Job = () => void;

const jobs: Job[] = [];
let running = false;

const idle = (f: () => void, patience = 3000) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(f, { timeout: patience });
  else setTimeout(f, 120);
};

function next() {
  const job = jobs.shift();
  if (!job) {
    running = false;
    return;
  }
  job();
  // A breath between two pieces, so they never add up to one long task.
  setTimeout(() => idle(next), 60);
}

function start() {
  if (running) return;
  running = true;
  const go = () => setTimeout(() => idle(next), 900);
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

/** Queues a piece of work, in front of the others when it is `soon`; returns a function that takes it back. */
export function whenIdle(job: Job, soon = false): () => void {
  if (soon) jobs.unshift(job);
  else jobs.push(job);
  start();
  return () => {
    const i = jobs.indexOf(job);
    if (i >= 0) jobs.splice(i, 1);
  };
}

/** Lets the browser breathe between the steps of one long job. */
export const breath = () => new Promise<void>((done) => idle(() => done(), 160));
