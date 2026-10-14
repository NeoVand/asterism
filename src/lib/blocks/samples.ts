/**
 * One realistic sample per block type (virtual validation of a collision mitigation system for
 * heavy off-road machines). Cite ids are real graph node ids, so chips and spotlights work.
 */
import type { Block } from './schema.ts';

export const SAMPLE_BLOCKS: Block[] = [
	{
		type: 'plan',
		title: 'Virtual validation plan for the CMS automatic-braking release',
		subtitle: 'Evidence-gated, starting before sensor freeze; prototype lands mid-2027',
		phases: [
			{
				name: 'Phase 0 · Define & record',
				window: 'Oct–Dec 2026',
				start: '2026-10',
				end: '2026-12',
				goal: 'Fix the operating domain, hazards and acceptance metrics; start logging the existing fleet.',
				items: [
					{
						text: 'Define ODD, hazard analysis and scenario catalogue on ISO 21815-3, EMESRT PR-5A and ISO 21448',
						cites: ['f707', 'f63']
					},
					{
						text: 'Log fleet data on warning-system machines through winter and build an exposure model',
						cites: ['f708', 'f64']
					},
					{
						text: 'Set false-alarm and nuisance-brake rates per operating hour as programme criteria',
						cites: ['f180', 'f179']
					}
				],
				gate: {
					name: 'Scope frozen',
					criteria: 'ODD, scenario catalogue and acceptance metrics signed off',
					cites: ['f706']
				}
			},
			{
				name: 'Phase 1 · Build & correlate',
				window: 'Jan–Jun 2027',
				start: '2027-01',
				end: '2027-06',
				goal: 'Stand up the virtual pipeline and earn trust in it before the prototype arrives.',
				items: [
					{
						text: 'Open-loop re-simulation of recorded data; correlate sensor models',
						cites: ['f710']
					},
					{
						text: 'SIL for logic, braking envelope and rare events — trusted only after correlation',
						cites: ['f711', 'f65']
					},
					{
						text: 'One HIL bench and a parameterised machine-and-brake model running',
						cites: ['f66', 'f67']
					},
					{ text: 'First contact with a notified body', cites: ['f855', 'f799'] }
				],
				gate: {
					name: 'Credibility envelope',
					criteria: 'Model–test correlation within agreed bounds; dossier seen by an assessor',
					cites: ['f69', 'f71']
				}
			},
			{
				name: 'Phase 2 · Prototype sprint',
				window: 'Jul–Oct 2027',
				start: '2027-07',
				end: '2027-10',
				goal: 'Under four months: bound model error on hardware, then confirm worst cases physically.',
				items: [
					{
						text: 'Measure latency, detection range, brake timing and stopping on the prototype',
						cites: ['f717']
					},
					{
						text: 'Re-run the correlated scenario matrix virtually and on the bench',
						cites: ['f718']
					},
					{
						text: 'Confirm worst cases with controlled whole-machine track tests',
						cites: ['f719']
					},
					{
						text: 'Shadow mode in live operation, braking disabled, to measure nuisance-brake rate',
						cites: ['f720']
					}
				],
				gate: {
					name: 'Release readiness',
					criteria: '299 zero-miss trials per target cell (≤1% miss rate at 95% confidence)',
					cites: ['f220', 'f126']
				}
			},
			{
				name: 'Phase 3 · Limited-domain release',
				window: 'Nov–Dec 2027',
				start: '2027-11',
				end: '2027-12',
				goal: 'Ship reverse-only, low-speed, selected models; widen only through evidence gates.',
				items: [
					{
						text: 'Reverse-only, low-speed release on selected machine models',
						cites: ['f721', 'f420']
					},
					{ text: 'Field monitoring of misses and nuisance brakes', cites: ['f722'] },
					{ text: 'New field scenarios loop back into Phase 0', cites: ['f724'] }
				],
				gate: {
					name: 'Widen domain',
					criteria: 'New sites, models, speeds and conditions added only as evidence arrives',
					cites: ['f723', 'f9415']
				}
			}
		]
	},
	{
		type: 'timeline',
		title: 'Regulatory and programme dates',
		events: [
			{
				date: '2023-01',
				label: 'Volvo CE ships CMS — reverse only, 3–15 km/h',
				detail: 'Vendor precedent for a staged, narrow-domain release.',
				kind: 'event',
				cites: ['f240', 'f355']
			},
			{
				date: '2025-05',
				label: 'Cat reverse-only AEB',
				detail: 'Second OEM following the limited-domain pattern.',
				kind: 'event',
				cites: ['f421']
			},
			{
				date: '2026-10',
				label: 'ISO 19014 series reissued',
				detail:
					'Re-check catalogue status of ISO 19014-1…5 and ISO 21815-4/-5 before relying on them.',
				kind: 'risk',
				cites: ['f163', 'f55']
			},
			{
				date: '2027-01-20',
				label: 'EU Machinery Regulation 2023/1230 applies',
				detail: 'Every Annex I Part A conformity route involves a notified body.',
				kind: 'deadline',
				cites: ['f52', 'f363']
			},
			{
				date: '2027-07',
				label: 'Prototype hardware and software arrive',
				detail: 'Less than four months left for validation.',
				kind: 'milestone',
				cites: ['f2', 'f3']
			},
			{
				date: '2028-08-02',
				label: 'High-risk AI obligations for machinery',
				detail: 'Moved by the Digital Omnibus on AI, Regulation (EU) 2026/1744.',
				kind: 'deadline',
				cites: ['f53']
			}
		]
	},
	{
		type: 'comparison',
		title: 'Validation methods — what each can prove',
		columns: ['Log replay', 'SIL', 'HIL', 'Track'],
		rows: [
			{
				label: 'Detection & false alarms',
				cells: [
					{ text: 'Only for recorded sensors and mounts', tone: 'warn', cites: ['f95'] },
					{ text: 'Needs correlated sensor models', tone: 'warn', cites: ['f711'] },
					{ text: 'Real ECU; stimulation limits by sensor type', tone: 'neutral', cites: ['f267'] },
					{ text: 'Ground truth, few cells', tone: 'good', cites: ['f100'] }
				]
			},
			{
				label: 'Braking & stopping',
				cells: [
					{ text: 'Not covered', tone: 'bad', cites: [] },
					{ text: 'Envelope and rare events', tone: 'good', cites: ['f711'] },
					{ text: 'Timing on real hardware', tone: 'good', cites: ['f110'] },
					{ text: 'Confirms worst cases', tone: 'good', cites: ['f719'] }
				]
			},
			{
				label: 'Ready by mid-2027',
				cells: [
					{ text: 'Yes, on existing fleet', tone: 'good', cites: ['f64'] },
					{ text: 'Partly validated', tone: 'warn', cites: ['f65'] },
					{ text: 'One bench', tone: 'warn', cites: ['f66'] },
					{ text: 'After prototype', tone: 'bad', cites: ['f2'] }
				]
			}
		],
		note: 'Virtual evidence substitutes for physical evidence only inside the established credibility envelope.'
	},
	{
		type: 'metrics',
		title: 'Numbers that shape the test budget',
		items: [
			{
				value: '299 trials',
				label: 'Zero-miss trials per cell',
				detail: '≤1% miss rate at 95% confidence',
				tone: 'neutral',
				cites: ['f220']
			},
			{
				value: '18%',
				label: 'False alarms',
				detail: 'NIOSH 2006, Caterpillar 793B',
				tone: 'bad',
				cites: ['f102']
			},
			{
				value: '42%',
				label: 'Nuisance alarms',
				detail: 'Same study; alarm found switched off',
				tone: 'bad',
				cites: ['f103', 'f104']
			},
			{
				value: '3–15 km/h',
				label: 'Volvo CE CMS envelope',
				detail: 'Reverse only, from Jan 2023',
				tone: 'good',
				cites: ['f240']
			},
			{
				value: '>7,000',
				label: 'Test strata',
				detail: 'Sites × scenarios × conditions × models',
				tone: 'warn',
				cites: ['f131']
			},
			{
				value: '<4 mo',
				label: 'Prototype to release',
				detail: 'Hardware arrives mid-2027',
				tone: 'warn',
				cites: ['f3']
			}
		]
	},
	{
		type: 'risks',
		title: 'What could sink the timeline',
		items: [
			{
				risk: 'Nuisance brakes erode operator trust and the system gets disabled',
				likelihood: 3,
				impact: 3,
				mitigation: 'Shadow-mode nuisance-rate gate before enabling braking',
				cites: ['f116', 'f720']
			},
			{
				risk: 'Notified-body lead time for an ML safety component is unknown',
				likelihood: 2,
				impact: 3,
				mitigation: 'Engage early; aim for first contact by mid-2027',
				cites: ['f259', 'f855']
			},
			{
				risk: 'Sensor models not correlated before the prototype arrives',
				likelihood: 2,
				impact: 2,
				mitigation: 'Correlate on fleet logs in Phase 1; trust SIL only inside the envelope',
				cites: ['f710', 'f72']
			},
			{
				risk: 'No regulator commitment to accept virtual evidence',
				likelihood: 3,
				impact: 2,
				mitigation: 'Share the credibility dossier with an assessor by mid-2027',
				cites: ['f258', 'f69']
			},
			{
				risk: 'Standards shift under the programme (ISO 19014 reissue)',
				likelihood: 2,
				impact: 1,
				mitigation: 'Re-check catalogue statuses at each gate',
				cites: ['f55']
			},
			{
				risk: 'Grade and payload swing stopping distance',
				likelihood: 1,
				impact: 2,
				mitigation: 'Calibrated point-mass model with measured latency and brake lag',
				cites: ['f145', 'f146']
			}
		]
	},
	{
		type: 'checklist',
		title: 'Before the prototype arrives',
		items: [
			{
				text: 'ODD and scenario catalogue signed off',
				detail: 'ISO 21815-3 + EMESRT PR-5A structure',
				cites: ['f63']
			},
			{ text: 'Fleet recording and replay pipeline live', cites: ['f64'] },
			{
				text: 'Acceptance criteria for false alarms and nuisance brakes per hour',
				detail: 'No published off-road value exists — set it.',
				cites: ['f179', 'f180']
			},
			{ text: 'SIL with partly validated sensor models', cites: ['f65'] },
			{ text: 'One HIL bench running', cites: ['f66'] },
			{ text: 'Machine and brake model parameterised', cites: ['f67'] },
			{
				text: 'Notified body contacted',
				detail: 'All Annex I Part A routes need one.',
				cites: ['f363', 'f855']
			}
		]
	},
	{
		type: 'flow',
		title: 'From prototype to limited release',
		steps: [
			{
				label: 'Prototype tests',
				detail: 'Latency, detection range, brake timing and stopping → model error bounds',
				cites: ['f717']
			},
			{
				label: 'Re-run the correlated matrix',
				detail: 'Virtually and on the HIL bench',
				cites: ['f718']
			},
			{
				label: 'Track confirmation',
				detail: 'Controlled whole-machine tests of the worst cases',
				cites: ['f719']
			},
			{
				label: 'Shadow mode',
				detail: 'Live operation with braking disabled to measure nuisance-brake rate',
				cites: ['f720']
			},
			{
				label: 'Limited-domain release',
				detail: 'Reverse only, low speed, selected models',
				cites: ['f721', 'f420']
			}
		]
	},
	{
		type: 'sources',
		title: 'Key sources',
		ids: ['s40', 's75', 's35', 's1', 's6', 's3'],
		note: 'Vendor material describes shipped envelopes, not validation evidence; RAND figures are on-road only.'
	},
	{
		type: 'diagram',
		id: 'm1',
		note: 'Phase 0 starts before the sensors are frozen; physical tests only confirm.'
	}
];
