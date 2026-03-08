#!/usr/bin/env node
/**
 * CLAIR MCP Server — Cascaded Lazy AI Routing
 *
 * Exposes two tools:
 *   clair_route    — classify a task and return what skills/tools to load
 *   clair_offload  — dispatch a subtask to an ML backend instead of the LLM
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = join(__dirname, "..", "skills");

// ── Types ────────────────────────────────────────────────────────────────────

interface SkillEntry {
  id: string;
  path: string;
  token_cost: number;
  triggers: string[];
  children: string[];
  mcp_dependencies: string[];
}

interface CascadeEntry {
  id: string;
  parent: string;
  path: string;
  token_cost: number;
  triggers: string[];
}

interface MLOffloadEntry {
  id: string;
  triggers: string[];
  volume_threshold: number;
  backend: string;
  backend_type: string;
  latency_ms: number;
  accuracy: number;
  notes?: string;
}

interface Manifest {
  version: string;
  skills: SkillEntry[];
  cascades: CascadeEntry[];
  ml_offload_registry: MLOffloadEntry[];
}

interface SkillRef {
  id: string;
  path: string;
  token_cost: number;
  reason: string;
}

interface ToolRef {
  id: string;
  reason: string;
}

interface MLCandidate {
  subtask: string;
  backend: string;
  backend_type: string;
  confidence: number;
  latency_ms: number;
  accuracy: number;
}

// ── Load manifest ─────────────────────────────────────────────────────────────

function loadManifest(): Manifest {
  const manifestPath = join(SKILLS_ROOT, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
}

function readSkillContent(skillPath: string): string {
  const fullPath = join(SKILLS_ROOT, "..", skillPath);
  if (!existsSync(fullPath)) return `[Skill file not found: ${skillPath}]`;
  return readFileSync(fullPath, "utf-8");
}

// ── Routing logic ─────────────────────────────────────────────────────────────

function scoreEntry(
  taskLower: string,
  triggers: string[]
): number {
  return triggers.reduce((score, trigger) => {
    return taskLower.includes(trigger.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function routeTask(
  taskDescription: string,
  contextBudget: number,
  preferMlOffload: boolean,
  manifest: Manifest
): {
  domains: string[];
  load_skills: SkillRef[];
  load_tools: ToolRef[];
  ml_candidates: MLCandidate[];
  estimated_tokens_saved: number;
  routing_confidence: number;
} {
  const taskLower = taskDescription.toLowerCase();
  const loadSkills: SkillRef[] = [];
  const loadTools: ToolRef[] = [];
  const mlCandidates: MLCandidate[] = [];
  const domains: string[] = [];
  let baseTokensWithoutClair = 0;
  let routedTokens = 0;

  // Score each domain skill
  const scoredSkills = manifest.skills.map((skill) => ({
    skill,
    score: scoreEntry(taskLower, skill.triggers),
  }));

  const maxScore = Math.max(...scoredSkills.map((s) => s.score), 1);

  for (const { skill, score } of scoredSkills) {
    if (score === 0) continue;

    const confidence = score / (skill.triggers.length * 0.5);
    domains.push(skill.id);
    loadSkills.push({
      id: skill.id,
      path: skill.path,
      token_cost: skill.token_cost,
      reason: `Matched ${score} trigger(s): ${skill.triggers
        .filter((t) => taskLower.includes(t.toLowerCase()))
        .join(", ")}`,
    });
    routedTokens += skill.token_cost;

    // Add MCP tool refs
    for (const dep of skill.mcp_dependencies) {
      if (!loadTools.find((t) => t.id === dep)) {
        loadTools.push({ id: dep, reason: `Required by ${skill.id} skill` });
      }
    }

    // Check cascades
    for (const cascade of manifest.cascades.filter(
      (c) => c.parent === skill.id
    )) {
      const cascadeScore = scoreEntry(taskLower, cascade.triggers);
      if (cascadeScore > 0) {
        loadSkills.push({
          id: cascade.id,
          path: cascade.path,
          token_cost: cascade.token_cost,
          reason: `Cascade from ${skill.id}: matched "${cascade.triggers
            .filter((t) => taskLower.includes(t.toLowerCase()))
            .join(", ")}"`,
        });
        routedTokens += cascade.token_cost;
      }
    }

    // Base estimate: without CLAIR, all skills and cascades would be loaded upfront
    baseTokensWithoutClair +=
      skill.token_cost +
      manifest.cascades
        .filter((c) => c.parent === skill.id)
        .reduce((sum, c) => sum + c.token_cost, 0);
  }

  // ML offload detection
  if (preferMlOffload) {
    for (const entry of manifest.ml_offload_registry) {
      const matched = entry.triggers.some((t) =>
        taskLower.includes(t.toLowerCase())
      );
      if (matched) {
        mlCandidates.push({
          subtask: entry.id,
          backend: entry.backend,
          backend_type: entry.backend_type,
          confidence: entry.accuracy,
          latency_ms: entry.latency_ms,
          accuracy: entry.accuracy,
        });
      }
    }
  }

  // Estimate tokens saved vs naive "load everything" approach
  const allSkillTokens = manifest.skills.reduce(
    (sum, s) => sum + s.token_cost,
    0
  );
  const allCascadeTokens = manifest.cascades.reduce(
    (sum, c) => sum + c.token_cost,
    0
  );
  const naiveTotal = allSkillTokens + allCascadeTokens;
  const estimatedTokensSaved = Math.max(0, naiveTotal - routedTokens);

  const routingConfidence =
    domains.length > 0 ? Math.min(1, maxScore / 3) : 0.3;

  return {
    domains,
    load_skills: loadSkills,
    load_tools: loadTools,
    ml_candidates: mlCandidates,
    estimated_tokens_saved: estimatedTokensSaved,
    routing_confidence: routingConfidence,
  };
}

// ── ML Offload simulation ─────────────────────────────────────────────────────

function simulateMLOffload(
  subtaskType: string,
  data: unknown,
  manifest: Manifest
): {
  result: unknown;
  backend_used: string;
  latency_ms: number;
  confidence?: number;
  fallback_to_llm: boolean;
  message: string;
} {
  const entry = manifest.ml_offload_registry.find(
    (e) => e.id === subtaskType
  );

  if (!entry) {
    return {
      result: null,
      backend_used: "none",
      latency_ms: 0,
      fallback_to_llm: true,
      message: `No ML backend registered for subtask type "${subtaskType}". Falling back to LLM. Available types: ${manifest.ml_offload_registry
        .map((e) => e.id)
        .join(", ")}`,
    };
  }

  // In a real deployment, this would invoke the actual ML backend.
  // Here we return metadata and a clear instruction for the LLM to understand.
  return {
    result: {
      status: "backend_available",
      instruction: `Call the ${entry.backend_type} backend "${entry.backend}" with the provided data. Expected latency: ${entry.latency_ms}ms. Expected accuracy: ${(entry.accuracy * 100).toFixed(0)}%.`,
      data_received: typeof data === "string" ? data.slice(0, 200) : data,
    },
    backend_used: entry.backend,
    latency_ms: entry.latency_ms,
    confidence: entry.accuracy,
    fallback_to_llm: false,
    message: `ML backend identified. Deploy "${entry.backend}" (${entry.backend_type}) to handle this subtask without LLM tokens. ${entry.notes ?? ""}`,
  };
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "clair-mcp-server",
  version: "0.1.0",
});

const manifest = loadManifest();

// ── Tool: clair_route ─────────────────────────────────────────────────────────

server.registerTool(
  "clair_route",
  {
    title: "CLAIR Route",
    description:
      "Classify an incoming task and return the minimal set of skills and MCP tools needed. " +
      "Call this FIRST before loading any skills or tools. Returns skill file paths to read, " +
      "MCP tool IDs to initialize, and ML offload candidates to bypass LLM processing.",
    inputSchema: {
      task_description: z
        .string()
        .describe("Natural language description of the task to route"),
      context_budget: z
        .number()
        .optional()
        .describe("Available token budget (optional, used to trim suggestions)"),
      prefer_ml_offload: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to aggressively identify ML offload opportunities"),
      include_skill_content: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, include the full skill markdown content in the response (costs tokens but saves a file read)"
        ),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ task_description, context_budget, prefer_ml_offload, include_skill_content }) => {
    try {
      const result = routeTask(
        task_description,
        context_budget ?? Infinity,
        prefer_ml_offload ?? true,
        manifest
      );

      // Optionally embed skill content directly
      const skillsWithContent = result.load_skills.map((s) => ({
        ...s,
        content: include_skill_content ? readSkillContent(s.path) : undefined,
      }));

      const output = {
        ...result,
        load_skills: skillsWithContent,
        router_version: "0.1.0",
        instructions:
          result.domains.length > 0
            ? `Load these ${result.load_skills.length} skill(s) and ${result.load_tools.length} tool(s). ` +
              `Estimated ${result.estimated_tokens_saved} tokens saved vs loading everything upfront. ` +
              (result.ml_candidates.length > 0
                ? `${result.ml_candidates.length} subtask(s) can bypass LLM via ML backends.`
                : "")
            : "Low confidence routing. Consider loading the 'research' skill as a general fallback.",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `CLAIR routing error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// ── Tool: clair_offload ───────────────────────────────────────────────────────

server.registerTool(
  "clair_offload",
  {
    title: "CLAIR ML Offload",
    description:
      "Route a subtask to an ML backend instead of using LLM tokens. " +
      "Use for repetitive tasks like sentiment classification, language detection, " +
      "spell checking, NER, anomaly detection, and text similarity. " +
      "Returns backend details and a fallback flag if no ML backend is available.",
    inputSchema: {
      subtask_type: z
        .string()
        .describe(
          "Type of ML task. Available: sentiment_classification, language_detection, " +
            "spell_check, tabular_classification, named_entity_extraction, " +
            "regex_extraction, text_similarity, anomaly_detection"
        ),
      data: z
        .union([z.string(), z.array(z.unknown()), z.record(z.unknown())])
        .describe("Input data for the ML backend"),
      backend_hint: z
        .string()
        .optional()
        .describe("Optional: override the default backend for this task type"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ subtask_type, data, backend_hint: _backend_hint }) => {
    try {
      const result = simulateMLOffload(subtask_type, data, manifest);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `CLAIR offload error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// ── Tool: clair_list_skills ───────────────────────────────────────────────────

server.registerTool(
  "clair_list_skills",
  {
    title: "CLAIR List Available Skills",
    description:
      "List all skills and cascades in the CLAIR manifest with their token costs and triggers. " +
      "Useful for understanding what capabilities are available without loading them.",
    inputSchema: {
      include_ml_registry: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include the ML offload registry in the response"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ include_ml_registry }) => {
    const summary = {
      total_skills: manifest.skills.length,
      total_cascades: manifest.cascades.length,
      total_ml_backends: manifest.ml_offload_registry.length,
      total_token_cost_if_all_loaded: [
        ...manifest.skills,
        ...manifest.cascades,
      ].reduce((sum, s) => sum + s.token_cost, 0),
      skills: manifest.skills.map((s) => ({
        id: s.id,
        token_cost: s.token_cost,
        triggers: s.triggers,
        children: s.children,
      })),
      cascades: manifest.cascades.map((c) => ({
        id: c.id,
        parent: c.parent,
        token_cost: c.token_cost,
        triggers: c.triggers,
      })),
      ml_registry: include_ml_registry ? manifest.ml_offload_registry : undefined,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  }
);

// ── Start server ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CLAIR MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
