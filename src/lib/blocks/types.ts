/** zod-inferred prop types for each block component. */
import type { z } from 'zod';
import type {
	PlanBlock as PlanSchema,
	TimelineBlock as TimelineSchema,
	ComparisonBlock as ComparisonSchema,
	MetricsBlock as MetricsSchema,
	RisksBlock as RisksSchema,
	ChecklistBlock as ChecklistSchema,
	FlowBlock as FlowSchema,
	SourcesBlock as SourcesSchema
} from './schema.ts';

export type PlanBlock = z.infer<typeof PlanSchema>;
export type TimelineBlock = z.infer<typeof TimelineSchema>;
export type ComparisonBlock = z.infer<typeof ComparisonSchema>;
export type MetricsBlock = z.infer<typeof MetricsSchema>;
export type RisksBlock = z.infer<typeof RisksSchema>;
export type ChecklistBlock = z.infer<typeof ChecklistSchema>;
export type FlowBlock = z.infer<typeof FlowSchema>;
export type SourcesBlock = z.infer<typeof SourcesSchema>;

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';
