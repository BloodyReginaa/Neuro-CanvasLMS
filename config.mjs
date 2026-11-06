// School settings come ONLY from the deployment's Worker vars (CANVAS_HOST, SCHOOL_NAME,
// ACCENT_COLOR), which the installer sets. Nothing school-specific is built in, so the same code
// works for every Canvas school and updates never touch a school's settings.
// Without CANVAS_HOST the connector is "not configured": /healthz fails and nothing reaches Canvas.
export let CANVAS_HOST = '';
export let SCHOOL_NAME = '';
export let ACCENT_COLOR = '#4f5bd5';
export const isConfigured = () => CANVAS_HOST !== '';

const HOST_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const isValidCanvasHost = h => typeof h === 'string' && HOST_RE.test(h);

// Called at the start of every request with the Worker's env. Invalid values are ignored.
export function applyConfig(env = {}) {
  if (isValidCanvasHost(env.CANVAS_HOST?.toLowerCase()))
    CANVAS_HOST = env.CANVAS_HOST.toLowerCase();
  if (typeof env.SCHOOL_NAME === 'string') SCHOOL_NAME = env.SCHOOL_NAME.trim().slice(0, 80);
  if (/^#[0-9a-f]{6}$/i.test(env.ACCENT_COLOR ?? '')) ACCENT_COLOR = env.ACCENT_COLOR;
}
