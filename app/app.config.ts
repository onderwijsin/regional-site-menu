export default defineAppConfig({
	ui: {
		colors: {
			primary: 'primary',
			secondary: 'secondary',
			neutral: 'slate',
		},
		button: {
			slots: {
				base: 'cursor-pointer',
			},
			variants: {
				size: {
					md: {
						leadingIcon: 'size-4',
					},
				},
			},
		},
		pageColumns: {
			base: 'space-y-6 gap-x-6 lg:columns-2',
		},
		contentNavigation: {
			slots: {
				linkLeadingIcon: 'size-4',
			},
		},
		navigationMenu: {
			slots: {
				linkLeadingIcon: 'size-4',
			},
		},
	},
})
