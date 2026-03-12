import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import express, { type Request, type Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { Manifest, Skill } from './types';

const PROJECT_ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'manifest.json');

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest file not found at ${MANIFEST_PATH}`);
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw);
}

function findSkills(manifest: Manifest, query: string): Skill[] {
  const lower = query.toLowerCase();
  return manifest.skills.filter((skill) =>
    skill.triggers.some((t) => lower.includes(t.toLowerCase())),
  );
}

function buildServer(manifest: Manifest) {
  const server = new McpServer({
    name: 'clair',
    version: '1.0.0',
  });

  // Tool: clair_list_skills
  server.registerTool(
    'clair_list_skills',
    {
      title: 'List CLAIR skills',
      description:
        'Lists all skills in the CLAIR manifest with token costs and triggers.',
    },
    async () => {
      const skillsSummary = manifest.skills.map((s) => ({
        id: s.id,
        path: s.path,
        token_cost: s.token_cost,
        triggers: s.triggers,
        parent: s.parent ?? null,
        children: s.children ?? [],
      }));
      const json = JSON.stringify(skillsSummary, null, 2);
      return {
        content: [{ type: 'text', text: json }],
      };
    },
  );

  // Tool: clair_route
  const RouteInput = z.object({
    task_description: z.string(),
    prefer_ml_offload: z.boolean().optional(),
  });

  server.registerTool(
    'clair_route',
    {
      title: 'CLAIR router',
      description:
        'Classifies a task and returns the minimal set of skills to load, plus estimated token savings.',
      inputSchema: RouteInput,
    },
    async (input: unknown) => {
      const { task_description } = RouteInput.parse(input);
      const matchedSkills = findSkills(manifest, task_description);

      const alwaysLoadedTokens = 280; // router skill budget from RFC
      const matchedTokenCost = matchedSkills.reduce(
        (sum, s) => sum + s.token_cost,
        0,
      );
      const fullTokenCost = manifest.skills.reduce(
        (sum, s) => sum + s.token_cost,
        0,
      );

      const clairCost = alwaysLoadedTokens + matchedTokenCost;
      const estimatedTokensSaved = Math.max(fullTokenCost - clairCost, 0);

      const result = {
        task_description,
        domains: matchedSkills.map((s) => s.id),
        load_skills: matchedSkills.map((s) => ({
          id: s.id,
          path: s.path,
          token_cost: s.token_cost,
          triggers: s.triggers,
          parent: s.parent ?? null,
        })),
        ml_candidates: [],
        estimated_tokens_saved: estimatedTokensSaved,
        routing_confidence:
          matchedSkills.length > 0
            ? Math.min(0.7 + matchedSkills.length * 0.05, 0.99)
            : 0.3,
      };

      const json = JSON.stringify(result, null, 2);
      return {
        content: [{ type: 'text', text: json }],
      };
    },
  );

  return server;
}

async function main() {
  const manifest = loadManifest();

  const app = createMcpExpressApp();

  // Health check endpoint for Railway / load balancers
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: 'clair-mcp-server', version: '1.0.0' });
  });

  app.post('/mcp', async (req: Request, res: Response) => {
    const server = buildServer(manifest);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  app.listen(port, host, () => {
    console.log(
      `CLAIR MCP server listening on http://${host}:${port}/mcp (stateless, JSON mode)`,
    );
  });
}

main().catch((err) => {
  console.error('Fatal error starting CLAIR MCP server:', err);
  process.exit(1);
});

