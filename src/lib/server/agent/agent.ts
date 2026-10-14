/**
 * The Asterism deep agent: graph tools, skills from agent/skills, a parallelizable researcher
 * subagent, persistent memories on disk, and an in-memory checkpointer for threads and interrupts.
 */
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { CompositeBackend, FilesystemBackend, StateBackend, createDeepAgent } from 'deepagents';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeTools } from './tools.ts';
import { DEEP_ADDENDUM, DEFAULT_SYSTEM_PROMPT, RESEARCHER_PROMPT } from './prompt.ts';

export interface AgentSettings {
	apiKey: string;
	model: string;
	systemPrompt?: string;
	effort?: 'low' | 'medium' | 'high';
}

const ROOT = process.cwd();
const SKILLS_DIR = resolve(ROOT, 'agent/skills');
export const MEMORY_DIR = resolve(ROOT, 'data/memories');
export const MEMORY_FILE = resolve(MEMORY_DIR, 'AGENTS.md');
export const MEMORY_TEMPLATE = `# What I know about this user and their project

(Nothing yet. Keep this short: the user's role, machines and sensors in scope, markets, deadlines, team, and how they like answers.)
`;

/** Threads survive across requests (and interrupts) for the life of the server. */
export const checkpointer = new MemorySaver();

const cache = new Map<string, Awaited<ReturnType<typeof build>>>();

async function build(s: AgentSettings) {
	mkdirSync(MEMORY_DIR, { recursive: true });
	if (!existsSync(MEMORY_FILE)) writeFileSync(MEMORY_FILE, MEMORY_TEMPLATE);
	const model = new ChatOpenAI({
		model: s.model,
		apiKey: s.apiKey,
		useResponsesApi: true,
		streaming: true,
		reasoning: { effort: s.effort ?? 'low', summary: 'auto' }
	});
	const subModel = new ChatOpenAI({
		model: s.model,
		apiKey: s.apiKey,
		useResponsesApi: true,
		streaming: true,
		reasoning: { effort: 'low' }
	});
	const t = makeTools();
	const graphTools = [t.searchGraph, t.explore, t.readFacts, t.connect, t.readSection, t.findSources];

	return createDeepAgent({
		name: 'asterism',
		model,
		tools: [...graphTools, t.showUi, t.askUser],
		systemPrompt: (s.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT) + (s.effort === 'medium' ? DEEP_ADDENDUM : ''),
		subagents: [
			{
				name: 'researcher',
				description:
					'Researches ONE focused sub-question in the knowledge graph and returns findings with fact ids. Give it a complete, self-contained question (it cannot see this conversation). Launch several in parallel for multi-part questions.',
				systemPrompt: RESEARCHER_PROMPT,
				tools: graphTools,
				model: subModel
			}
		],
		backend: (config) =>
			new CompositeBackend(new StateBackend(config), {
				'/skills/': new FilesystemBackend({ rootDir: SKILLS_DIR, virtualMode: true }),
				'/memories/': new FilesystemBackend({ rootDir: MEMORY_DIR, virtualMode: true })
			}),
		skills: ['/skills/'],
		// Evals and probes run without the user's memory so results stay comparable.
		memory: process.env.ASTERISM_EVAL ? [] : ['/memories/AGENTS.md'],
		permissions: [{ operations: ['write'], paths: ['/skills/**'], mode: 'deny' }],
		checkpointer
	});
}

export async function getAgent(s: AgentSettings) {
	const key = JSON.stringify([s.apiKey.slice(-8), s.model, s.systemPrompt ?? '', s.effort ?? 'low']);
	let agent = cache.get(key);
	if (!agent) {
		agent = await build(s);
		cache.set(key, agent);
	}
	return agent;
}
