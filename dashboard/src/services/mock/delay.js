// Simulated network latency so loading states are visible in the mock.

const MIN_MS = 250;
const MAX_MS = 600;

export function delay(ms) {
  const wait = typeof ms === 'number' ? ms : MIN_MS + Math.random() * (MAX_MS - MIN_MS);
  return new Promise((resolve) => setTimeout(resolve, wait));
}
