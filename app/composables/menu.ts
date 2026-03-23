import type { NavigationMenuItem } from '@nuxt/ui'

export const useMenu = () => {
	const externalSite: NavigationMenuItem = {
		label: 'onderwijsregio.nl',
		to: 'https://www.onderwijsregio.nl/',
		trailingIcon: 'lucide:arrow-up-right',
		color: 'neutral',
		variant: 'ghost',
	}

	const externalSiteMenuLink: NavigationMenuItem = {
		...externalSite,
		trailingIcon: null,
		icon: 'lucide:arrow-up-right',
	}

	const staticNavigation: NavigationMenuItem[] = [
		externalSiteMenuLink,
		{
			label: 'Help',
			icon: 'i-lucide-circle-help',
			to: '/help',
		},
	]

	return { externalSite, staticNavigation }
}
