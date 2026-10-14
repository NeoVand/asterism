/**
 * Mermaid, loaded on first use and themed to sit quietly on the dark glass: thin hairlines,
 * ink fills, the app's own type. Renders are queued one at a time (mermaid is not reentrant).
 */
type Mermaid = typeof import('mermaid').default;

let loading: Promise<Mermaid> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let seq = 0;

function load(): Promise<Mermaid> {
	loading ??= import('mermaid').then(({ default: m }) => {
		m.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			theme: 'base',
			fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
			themeVariables: {
				darkMode: true,
				background: 'transparent',
				fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
				fontSize: '13px',
				primaryColor: '#111827',
				primaryTextColor: '#dfe5f1',
				primaryBorderColor: '#33405c',
				secondaryColor: '#0f1522',
				secondaryTextColor: '#c3cbdb',
				secondaryBorderColor: '#2a3550',
				tertiaryColor: '#0c111c',
				tertiaryTextColor: '#c3cbdb',
				tertiaryBorderColor: '#2a3550',
				mainBkg: '#111827',
				nodeBorder: '#33405c',
				nodeTextColor: '#dfe5f1',
				lineColor: '#5b6c8d',
				textColor: '#a3acc0',
				titleColor: '#dfe5f1',
				clusterBkg: 'rgba(111, 227, 255, 0.03)',
				clusterBorder: 'rgba(111, 227, 255, 0.2)',
				edgeLabelBackground: '#0a0e18',
				// Gantt charts
				sectionBkgColor: 'rgba(111, 227, 255, 0.04)',
				altSectionBkgColor: 'rgba(255, 255, 255, 0.015)',
				sectionBkgColor2: 'rgba(255, 201, 107, 0.04)',
				taskBkgColor: '#1b3a4b',
				taskBorderColor: '#3f8fae',
				taskTextColor: '#dfe5f1',
				taskTextLightColor: '#dfe5f1',
				taskTextOutsideColor: '#a3acc0',
				taskTextDarkColor: '#dfe5f1',
				activeTaskBkgColor: '#24506a',
				activeTaskBorderColor: '#6fe3ff',
				doneTaskBkgColor: '#1e2a3d',
				doneTaskBorderColor: '#3a4359',
				critBkgColor: '#4a2a1c',
				critBorderColor: '#ffb054',
				gridColor: '#252d42',
				todayLineColor: '#ffc96b',
				// State diagrams
				labelBackgroundColor: '#0a0e18',
				compositeBackground: 'rgba(111, 227, 255, 0.03)',
				compositeTitleBackground: '#111827',
				stateBkg: '#111827',
				stateLabelColor: '#dfe5f1',
				transitionColor: '#5b6c8d',
				transitionLabelColor: '#a3acc0'
			},
			flowchart: { curve: 'basis', padding: 12, htmlLabels: true },
			gantt: { barHeight: 18, barGap: 5, fontSize: 11, sectionFontSize: 11 }
		});
		return m;
	});
	return loading;
}

/** Render mermaid source to an SVG string. */
export function renderDiagram(code: string): Promise<string> {
	const job = queue.then(async () => {
		const m = await load();
		const { svg } = await m.render(`mmd-${++seq}`, code);
		return svg;
	});
	queue = job.catch(() => undefined);
	return job;
}
