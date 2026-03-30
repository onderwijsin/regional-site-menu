import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Builds shared navigation items for header, sidebar, and footer menus.
 *
 * @returns Navigation item groups used across app navigation surfaces.
 */
export const useMenu = () => {
	const { getIcon } = useIcons()

	// In the app header and footer we want a trailing icon for this item
	const externalSite: NavigationMenuItem = {
		label: 'onderwijsregio.nl',
		to: 'https://www.onderwijsregio.nl/',
		trailingIcon: getIcon('external'),
		color: 'neutral',
		variant: 'ghost'
	}

	// In the vertical navigation, we want a leading icon
	const externalSiteMenuLink: NavigationMenuItem = {
		...externalSite,
		trailingIcon: null,
		icon: getIcon('external')
	}

	const help = {
		label: 'Help',
		icon: getIcon('help'),
		to: '/help'
	} satisfies NavigationMenuItem

	const extras = {
		label: "Extra's",
		icon: getIcon('gift'),
		to: '/extras'
	}

	const staticNavigation: NavigationMenuItem[] = [extras, help, externalSiteMenuLink]

	return { externalSite, staticNavigation, help, extras }
}
