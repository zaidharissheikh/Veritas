// Small critically-damped spring for number / arc animations (emil-apple-design §4).
// Respects prefers-reduced-motion by jumping straight to the target.

const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)');

function prefersReducedMotion() {
  return Boolean(REDUCED && REDUCED.matches);
}

// Animates from `from` to `to`, calling onFrame(value) each frame.
// response = seconds to settle (Apple's "response"); damping 1 = no overshoot.
export function springTo(from, to, onFrame, { response = 0.7, damping = 1 } = {}) {
  if (prefersReducedMotion() || from === to) {
    onFrame(to);
    return () => {};
  }
  const omega = (2 * Math.PI) / response;
  let value = from;
  let velocity = 0;
  let last = performance.now();
  let frame = 0;

  const step = (now) => {
    const dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    const displacement = value - to;
    const accel = -omega * omega * displacement - 2 * damping * omega * velocity;
    velocity += accel * dt;
    value += velocity * dt;
    const settled = Math.abs(displacement) < 0.05 && Math.abs(velocity) < 0.05;
    onFrame(settled ? to : value);
    if (!settled) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
