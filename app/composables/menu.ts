import type { NavigationMenuItem } from '@nuxt/ui'

export const useMenu = () => {
	const externalSite: NavigationMenuItem = {
		label: 'onderwijsregio.nl',
		to: 'https://www.onderwijsregio.nl/',
		// target: '_blank',
		trailingIcon: 'lucide:arrow-up-right',
		color: 'neutral',
		variant: 'ghost',
	}

	const externalSiteMenuLink: NavigationMenuItem = {
		...externalSite,
		trailingIcon: null,
		icon: 'lucide:arrow-up-right',
	}

	const items = ref<NavigationMenuItem[][]>([
		[
			{
				label: 'Inzicht & Overzicht',
				icon: 'i-lucide-book-open',
				children: [
					{
						label: 'Introduction',
						description: 'Fully styled and customizable components for Nuxt.',
						icon: 'i-lucide-house',
					},
					{
						label: 'Installation',
						description:
							'Learn how to install and configure Nuxt UI in your application.',
						icon: 'i-lucide-cloud-download',
					},
					{
						label: 'Icons',
						icon: 'i-lucide-smile',
						description:
							'You have nothing to do, @nuxt/icon will handle it automatically.',
					},
					{
						label: 'Colors',
						icon: 'i-lucide-swatch-book',
						description:
							'Choose a primary and a neutral color from your Tailwind CSS theme.',
					},
					{
						label: 'Theme',
						icon: 'i-lucide-cog',
						description:
							'You can customize components by using the `class` / `ui` props or in your app.config.ts.',
					},
				],
			},
			{
				label: 'Verdieping & Ervaring',
				icon: 'i-lucide-book-open',
				children: [
					{
						label: 'Introduction',
						description: 'Fully styled and customizable components for Nuxt.',
						icon: 'i-lucide-house',
					},
					{
						label: 'Installation',
						description:
							'Learn how to install and configure Nuxt UI in your application.',
						icon: 'i-lucide-cloud-download',
					},
					{
						label: 'Icons',
						icon: 'i-lucide-smile',
						description:
							'You have nothing to do, @nuxt/icon will handle it automatically.',
					},
					{
						label: 'Colors',
						icon: 'i-lucide-swatch-book',
						description:
							'Choose a primary and a neutral color from your Tailwind CSS theme.',
					},
					{
						label: 'Theme',
						icon: 'i-lucide-cog',
						description:
							'You can customize components by using the `class` / `ui` props or in your app.config.ts.',
					},
				],
			},
			{
				label: 'Activatie & Deelname',
				icon: 'i-lucide-book-open',
				children: [
					{
						label: 'Introduction',
						description: 'Fully styled and customizable components for Nuxt.',
						icon: 'i-lucide-house',
					},
					{
						label: 'Installation',
						description:
							'Learn how to install and configure Nuxt UI in your application.',
						icon: 'i-lucide-cloud-download',
					},
					{
						label: 'Icons',
						icon: 'i-lucide-smile',
						description:
							'You have nothing to do, @nuxt/icon will handle it automatically.',
					},
					{
						label: 'Colors',
						icon: 'i-lucide-swatch-book',
						description:
							'Choose a primary and a neutral color from your Tailwind CSS theme.',
					},
					{
						label: 'Theme',
						icon: 'i-lucide-cog',
						description:
							'You can customize components by using the `class` / `ui` props or in your app.config.ts.',
					},
				],
			},
			{
				label: 'Ondersteuning & Contact',
				icon: 'i-lucide-book-open',
				children: [
					{
						label: 'Introduction',
						description: 'Fully styled and customizable components for Nuxt.',
						icon: 'i-lucide-house',
					},
					{
						label: 'Installation',
						description:
							'Learn how to install and configure Nuxt UI in your application.',
						icon: 'i-lucide-cloud-download',
					},
					{
						label: 'Icons',
						icon: 'i-lucide-smile',
						description:
							'You have nothing to do, @nuxt/icon will handle it automatically.',
					},
					{
						label: 'Colors',
						icon: 'i-lucide-swatch-book',
						description:
							'Choose a primary and a neutral color from your Tailwind CSS theme.',
					},
					{
						label: 'Theme',
						icon: 'i-lucide-cog',
						description:
							'You can customize components by using the `class` / `ui` props or in your app.config.ts.',
					},
				],
			},
		],
		[
			externalSiteMenuLink,
			{
				label: 'Help',
				icon: 'i-lucide-circle-help',
				to: '/',
			},
		],
	])

	return { externalSite, items }
}
