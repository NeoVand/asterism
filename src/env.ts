import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OPENAI_API_KEY: {
		description: 'Fallback OpenAI key used when the user has not set their own in Settings.',
		schema: (value) => value ?? ''
	},
	ASTERISM_MODEL: {
		description: 'Default chat model.',
		schema: (value) => value || 'gpt-6.1-sol'
	}
});
