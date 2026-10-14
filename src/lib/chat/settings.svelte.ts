/** User settings (BYO key, model, prompt, view preferences), persisted in localStorage. */

export interface Settings {
	apiKey: string;
	model: string;
	systemPrompt: string;
	deep: boolean;
	autoRotate: boolean;
	labels: boolean;
}

export const MODELS = [
	{ id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', note: 'Default · best reasoning' },
	{ id: 'gpt-6-astra', name: 'GPT-6 Astra', note: 'Strong, faster' },
	{ id: 'gpt-6-luna', name: 'GPT-6 Luna', note: 'Fastest' },
	{ id: 'gpt-5.5', name: 'GPT-5.5', note: 'Previous generation' }
] as const;

const KEY = 'asterism.settings.v1';

const DEFAULTS: Settings = {
	apiKey: '',
	model: 'gpt-6.1-sol',
	systemPrompt: '',
	deep: false,
	autoRotate: true,
	labels: true
};

class SettingsStore {
	value = $state<Settings>({ ...DEFAULTS });

	load() {
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) this.value = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
		} catch {
			/* defaults */
		}
	}

	update(patch: Partial<Settings>) {
		this.value = { ...this.value, ...patch };
		try {
			localStorage.setItem(KEY, JSON.stringify(this.value));
		} catch {
			/* private mode */
		}
	}
}

export const settings = new SettingsStore();
