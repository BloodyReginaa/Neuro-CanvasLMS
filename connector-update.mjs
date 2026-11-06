// The connector's side of updating: one maintenance tool for the owner's AI, a short notice that is
// added to the MCP instructions when the owner should know something, and the status shown on the
// home page. The connector itself never holds a Cloudflare token and never replaces its own code:
// it only talks to the separate updater Worker through the UPDATER service binding.
import { UPDATE_KEYS as K } from './update-keys.mjs';

export const connectorUpdateTool = {
  name: 'connector_update',
  description:
    'Maintenance of THIS Canvas connector (not Canvas data). action "status": show the installed version, the latest release and the update mode. action "update": install the latest signed release now — only when the user asks; it is queued and finishes within about 10 minutes, health-checked and rolled back automatically if anything fails. action "set_mode": switch between "auto" (install automatically after a 24-hour observation period) and "notify" (only tell the user) — only when the user asks.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['status', 'update', 'set_mode'] },
      mode: { type: 'string', enum: ['auto', 'notify'] },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Connector updates',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

const text = (t, isError = false) => ({
  ...(isError ? { isError } : {}),
  content: [{ type: 'text', text: t }],
});

export async function handleConnectorUpdate(args = {}, env, version) {
  const keys = Object.keys(args);
  if (
    !['status', 'update', 'set_mode'].includes(args.action) ||
    keys.some(k => !['action', 'mode'].includes(k))
  )
    return text('Invalid arguments: action must be status, update or set_mode.', true);
  if (!env.UPDATER)
    return text(
      `Automatic updates are not installed for this connector (version ${version}). To get updates, run the setup again and choose "auto-update" or "reminders", or update manually (README → Updating).`,
    );
  const call = (path, body) =>
    env.UPDATER.fetch(
      `https://updater${path}`,
      body ? { method: 'POST', body: JSON.stringify(body) } : {},
    ).then(r => r.json());
  try {
    if (args.action === 'status') {
      const s = await call('/status');
      return text(JSON.stringify({ installed_version: version, ...s }));
    }
    if (args.action === 'update') {
      const s = await call('/request-update', {});
      return text(
        `Update requested (installed: ${version}, mode: ${s.mode}). The updater installs the latest signed release within about 10 minutes, checks the connector afterwards and rolls back automatically if anything fails. Ask for "status" later to see the result.`,
      );
    }
    if (!['auto', 'notify'].includes(args.mode))
      return text('set_mode needs mode "auto" or "notify".', true);
    const s = await call('/mode', { mode: args.mode });
    return text(`Update mode is now "${s.mode}".`);
  } catch (e) {
    return text(`The updater could not be reached (${e?.name ?? 'Error'}).`, true);
  }
}

export async function readUpdateStatus(env) {
  try {
    return JSON.parse((await env.OAUTH_KV.get(K.status)) ?? 'null');
  } catch {
    return null;
  }
}

// A sentence for the MCP instructions, only when the owner should hear about it.
export function updateNotice(status, version) {
  if (!status) return '';
  const tell =
    'Mention this once to the user, in their language, then continue with their request.';
  if (status.state === 'available' && status.latest)
    return ` Connector maintenance: version ${status.latest} is available (installed ${version}). ${tell} If they want it, call connector_update with action "update".`;
  if (status.state === 'rolled_back')
    return ` Connector maintenance: an automatic update was rolled back because it failed its health check; the connector keeps working on ${version}. ${tell}`;
  if (status.state === 'manual_required')
    return ` Connector maintenance: ${status.message} ${tell}`;
  return '';
}
