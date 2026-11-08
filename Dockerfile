# For MCP directories (Glama) that build a server to read its tool list.
# It runs scripts/glama-stdio.mjs: the connector's real tool definitions over stdio, with no
# Canvas access. To actually use Neuro-CanvasLMS, run `npx -y neuro-canvas-lms` instead.
FROM node:22-alpine
WORKDIR /app
COPY package.json npm-shrinkwrap.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY *.mjs ./
COPY scripts/glama-stdio.mjs ./scripts/
CMD ["node", "scripts/glama-stdio.mjs"]
