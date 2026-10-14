/** Server-sent events between /api/chat and the chat client. */
import type { Answers, Block, QuestionForm } from '#lib/blocks/schema.ts';

export type AgentRef = 'main' | string; // 'main' or a task id

export type ChatEvent =
	| { t: 'start'; threadId: string; runId: string }
	| { t: 'text'; delta: string }
	| { t: 'reasoning'; delta: string; agent: AgentRef }
	| { t: 'tool'; id: string; name: string; args: unknown; agent: AgentRef }
	| { t: 'tool_end'; id: string; name: string; summary: string; agent: AgentRef; error?: boolean }
	| { t: 'graph'; mode: 'touch' | 'read'; ids: string[]; agent: AgentRef; step?: string }
	| { t: 'todos'; items: { content: string; status: 'pending' | 'in_progress' | 'completed' }[] }
	| { t: 'task'; id: string; status: 'start' | 'end'; description: string; agentName: string }
	| { t: 'ui'; id: string; block: Block }
	| { t: 'interrupt'; form: QuestionForm }
	| { t: 'error'; message: string }
	| { t: 'done'; usage: { input: number; output: number }; ms: number };

export interface ChatSettings {
	apiKey?: string;
	model?: string;
	systemPrompt?: string;
	effort?: 'low' | 'medium' | 'high';
}

export interface ChatRequest {
	threadId: string;
	message?: string;
	resume?: Answers | { skipped: true };
	settings?: ChatSettings;
	/** Plain transcript, used to rebuild a thread the server no longer has (after a restart). */
	history?: { role: 'user' | 'assistant'; content: string }[];
	/** The user's local date, `YYYY-MM-DD`, so plans and deadlines are counted from their today. */
	today?: string;
}
