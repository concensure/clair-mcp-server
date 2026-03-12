import * as fs from 'fs';
import * as path from 'path';
import { Manifest, Skill } from './types';

const ROUTER_TOKEN_COST = 280;

/** Rough token estimate: ~4 chars per token for English text */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function loadManifest(manifestPath?: string): Manifest {
  const basePath = manifestPath ?? path.join(__dirname, '../manifest.json');
  if (!fs.existsSync(basePath)) {
    throw new Error(`Manifest file not found at ${basePath}`);
  }
  const rawData = fs.readFileSync(basePath, 'utf-8');
  return JSON.parse(rawData);
}

export function findSkills(manifest: Manifest, query: string): Skill[] {
  const lowerQuery = query.toLowerCase();
  const matched: Skill[] = [];
  const seen = new Set<string>();

  for (const skill of manifest.skills) {
    if (seen.has(skill.id)) continue;
    const matches = skill.triggers.some((t) =>
      lowerQuery.includes(t.toLowerCase())
    );
    if (matches) {
      matched.push(skill);
      seen.add(skill.id);
      if (skill.children) {
        for (const childId of skill.children) {
          const child = manifest.skills.find((s) => s.id === childId);
          if (child && !seen.has(child.id)) {
            const childMatches = child.triggers.some((t) =>
              lowerQuery.includes(t.toLowerCase())
            );
            if (childMatches) {
              matched.push(child);
              seen.add(child.id);
            }
          }
        }
      }
    }
  }

  return matched;
}

export interface LoadedSkill {
  skill: Skill;
  content: string;
  tokens: number;
}

/** Load a single skill file and return content + token count */
export function loadSkillFile(
  baseDir: string,
  skill: Skill
): LoadedSkill | null {
  const fullPath = path.join(baseDir, skill.path);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const tokens = estimateTokens(content);
  return { skill, content, tokens };
}

/** Load ALL skills (control / full load) — returns actual loaded content and token counts */
export function loadAllSkills(baseDir: string, manifest: Manifest): LoadedSkill[] {
  const loaded: LoadedSkill[] = [];
  for (const skill of manifest.skills) {
    const result = loadSkillFile(baseDir, skill);
    if (result) loaded.push(result);
  }
  return loaded;
}

/** Load only matched skills (CLAIR / lazy load) — returns actual loaded content and token counts */
export function loadMatchedSkills(
  baseDir: string,
  manifest: Manifest,
  query: string
): LoadedSkill[] {
  const skills = findSkills(manifest, query);
  const loaded: LoadedSkill[] = [];
  for (const skill of skills) {
    const result = loadSkillFile(baseDir, skill);
    if (result) loaded.push(result);
  }
  return loaded;
}

/** Total tokens from loaded skills (control) */
export function getFullLoadTokenCost(
  baseDir: string,
  manifest: Manifest
): { tokens: number; loaded: LoadedSkill[] } {
  const loaded = loadAllSkills(baseDir, manifest);
  const tokens = loaded.reduce((sum, l) => sum + l.tokens, 0);
  return { tokens, loaded };
}

/** Total tokens from CLAIR routing (router + matched skills only) */
export function getClairTokenCost(
  baseDir: string,
  manifest: Manifest,
  query: string
): { tokens: number; loaded: LoadedSkill[] } {
  const loaded = loadMatchedSkills(baseDir, manifest, query);
  const skillTokens = loaded.reduce((sum, l) => sum + l.tokens, 0);
  const tokens = ROUTER_TOKEN_COST + skillTokens;
  return { tokens, loaded };
}
