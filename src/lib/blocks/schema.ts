/**
 * Catalog of generative UI blocks the agent can render in the chat (json-render style:
 * the model emits typed JSON, the client renders it with Asterism's own components).
 * Every item can carry `cites` — graph node ids (f…, s…, t…, e…) that light up on hover.
 */
import { z } from 'zod';

const cites = z.array(z.string()).describe('Graph ids backing this item, e.g. ["f123","f456"]').default([]);
const tone = z.enum(['good', 'warn', 'bad', 'neutral']).optional();

export const PlanBlock = z.object({
	type: z.literal('plan'),
	title: z.string(),
	subtitle: z.string().optional(),
	phases: z
		.array(
			z.object({
				name: z.string(),
				window: z.string().describe('Human date range, e.g. "Oct–Dec 2026"'),
				start: z.string().optional().describe('YYYY-MM'),
				end: z.string().optional().describe('YYYY-MM'),
				goal: z.string(),
				items: z.array(z.object({ text: z.string(), cites })),
				gate: z.object({ name: z.string(), criteria: z.string(), cites }).optional()
			})
		)
		.min(1)
});

export const TimelineBlock = z.object({
	type: z.literal('timeline'),
	title: z.string(),
	events: z
		.array(
			z.object({
				date: z.string().describe('YYYY-MM-DD, YYYY-MM or a short label'),
				label: z.string(),
				detail: z.string().optional(),
				kind: z.enum(['deadline', 'milestone', 'event', 'risk']).optional(),
				cites
			})
		)
		.min(1)
});

export const ComparisonBlock = z.object({
	type: z.literal('comparison'),
	title: z.string(),
	columns: z.array(z.string()).min(1).describe('Column headers after the row label column'),
	rows: z
		.array(
			z.object({
				label: z.string(),
				cells: z.array(z.object({ text: z.string(), tone, cites }))
			})
		)
		.min(1),
	note: z.string().optional()
});

export const MetricsBlock = z.object({
	type: z.literal('metrics'),
	title: z.string().optional(),
	items: z
		.array(z.object({ value: z.string(), label: z.string(), detail: z.string().optional(), tone, cites }))
		.min(1)
		.max(8)
});

export const RisksBlock = z.object({
	type: z.literal('risks'),
	title: z.string(),
	items: z
		.array(
			z.object({
				risk: z.string(),
				likelihood: z.number().int().min(1).max(3),
				impact: z.number().int().min(1).max(3),
				mitigation: z.string(),
				cites
			})
		)
		.min(1)
});

export const ChecklistBlock = z.object({
	type: z.literal('checklist'),
	title: z.string(),
	items: z.array(z.object({ text: z.string(), detail: z.string().optional(), cites })).min(1)
});

export const FlowBlock = z.object({
	type: z.literal('flow'),
	title: z.string(),
	steps: z.array(z.object({ label: z.string(), detail: z.string().optional(), cites })).min(2).max(9)
});

export const SourcesBlock = z.object({
	type: z.literal('sources'),
	title: z.string(),
	ids: z.array(z.string()).min(1).describe('Source node ids (s…)'),
	note: z.string().optional()
});

export const Block = z.discriminatedUnion('type', [
	PlanBlock,
	TimelineBlock,
	ComparisonBlock,
	MetricsBlock,
	RisksBlock,
	ChecklistBlock,
	FlowBlock,
	SourcesBlock
]);

export type Block = z.infer<typeof Block>;
export type BlockType = Block['type'];

/* Questions the agent asks through an in-chat form (ask_user). */
export const Question = z.object({
	id: z.string().describe('Short key for the answer, e.g. "machines"'),
	label: z.string(),
	kind: z.enum(['single', 'multi', 'text', 'scale']),
	options: z.array(z.string()).optional().describe('Choices for single/multi'),
	hint: z.string().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
	unit: z.string().optional()
});

export const QuestionForm = z.object({
	title: z.string(),
	intro: z.string().optional(),
	questions: z.array(Question).min(1).max(6)
});

export type Question = z.infer<typeof Question>;
export type QuestionForm = z.infer<typeof QuestionForm>;
export type Answers = Record<string, string | string[] | number>;
