<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';

	interface Props {
		icon: IconSvgElement;
		size?: number;
		stroke?: number;
		class?: string;
	}

	let { icon, size = 16, stroke = 1.6, class: klass = '' }: Props = $props();
</script>

<HugeiconsIcon {icon} {size} strokeWidth={stroke} color="currentColor" class={klass} aria-hidden="true" />
