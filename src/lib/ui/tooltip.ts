/**
 * `use:tip={'Label'}` — a small dark tooltip after a short hover delay. One shared element,
 * positioned above the target (below if there is no room), never covering the pointer.
 */
import type { Action } from 'svelte/action';

let el: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function ensure() {
	if (el) return el;
	el = document.createElement('div');
	el.className =
		'pointer-events-none fixed z-[100] max-w-72 rounded-md border border-white/10 bg-ink-900/95 px-2 py-1 text-[11.5px] leading-snug text-fg-2 shadow-lg opacity-0 transition-opacity duration-150';
	document.body.appendChild(el);
	return el;
}

function show(target: HTMLElement, text: string) {
	const t = ensure();
	t.textContent = text;
	const r = target.getBoundingClientRect();
	t.style.left = '0px';
	t.style.top = '0px';
	t.style.opacity = '0';
	requestAnimationFrame(() => {
		const w = t.offsetWidth;
		const h = t.offsetHeight;
		let x = r.left + r.width / 2 - w / 2;
		x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
		let y = r.top - h - 8;
		if (y < 8) y = r.bottom + 8;
		t.style.left = `${x}px`;
		t.style.top = `${y}px`;
		t.style.opacity = '1';
	});
}

function hide() {
	if (timer) clearTimeout(timer);
	timer = null;
	if (el) el.style.opacity = '0';
}

export const tip: Action<HTMLElement, string | null | undefined> = (node, text) => {
	let current = text;
	const enter = () => {
		if (!current) return;
		timer = setTimeout(() => show(node, current!), 380);
	};
	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointerleave', hide);
	node.addEventListener('pointerdown', hide);
	return {
		update(t) {
			current = t;
		},
		destroy() {
			hide();
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', hide);
			node.removeEventListener('pointerdown', hide);
		}
	};
};

/** The same tooltip for elements that can't take an action (event delegation in rendered HTML). */
export function showTip(target: HTMLElement, text: string, delay = 300) {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => show(target, text), delay);
}

export const hideTip = hide;
