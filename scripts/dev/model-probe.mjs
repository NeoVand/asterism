import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
	readFileSync('/Users/neo/repos/pandka/.env', 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
for (const model of ['gpt-6.1-sol', 'gpt-6-luna', 'gpt-6-astra']) {
	const t = Date.now();
	try {
		const r = await client.responses.create({
			model,
			input: 'Reply with JSON {"ok":true,"model":"<your name>"}',
			text: {
				format: {
					type: 'json_schema',
					name: 'x',
					strict: true,
					schema: {
						type: 'object',
						properties: { ok: { type: 'boolean' }, model: { type: 'string' } },
						required: ['ok', 'model'],
						additionalProperties: false
					}
				}
			}
		});
		console.log(model, Date.now() - t, 'ms', r.output_text, JSON.stringify(r.usage));
	} catch (e) {
		console.log(model, 'ERR', e.message);
	}
}
