#!/usr/bin/env node
// Listing-only MCP server over stdio, for directories such as Glama that start a server in a
// container to read its tool list. It lists the connector's real tools (tool-list.mjs, the same
// list the Worker serves) but cannot reach Canvas: it holds no token, makes no network requests,
// and every tool call answers with how to deploy your own connector.
// Not part of the npm package and not used by the connector itself.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { allTools } from '../tool-list.mjs';
import { VERSION } from '../version.mjs';

export const LISTING_ONLY_NOTICE =
  'This is a listing-only copy of Neuro-CanvasLMS: it shows the tools but cannot read Canvas. ' +
  'To use it, deploy your own connector to a free Cloudflare account with `npx -y neuro-canvas-lms`, ' +
  'then add the URL it prints as a custom connector in Claude or ChatGPT. ' +
  'Guide: https://bloodyreginaa.github.io/Neuro-CanvasLMS/';

export function listingServer() {
  const server = new Server(
    { name: 'Neuro-CanvasLMS', version: VERSION },
    { capabilities: { tools: {} }, instructions: LISTING_ONLY_NOTICE },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));
  server.setRequestHandler(CallToolRequestSchema, async () => ({
    isError: true,
    content: [{ type: 'text', text: LISTING_ONLY_NOTICE }],
  }));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await listingServer().connect(new StdioServerTransport());
}
