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
		badge: {
			slots: {
				base: 'select-none',
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
		dropdownMenu: {
			variants: {
				size: {
					md: {
						item: 'items-center',
						itemLeadingIcon: 'size-4',
					},
				},
			},
		},
		page: {
			slots: {
				root: 'md:grid md:grid-cols-10 md:gap-8',
				left: 'md:col-span-3',
				center: 'md:col-span-7',
			},
		},

		input: {
			slots: {
				root: 'w-full',
			},
		},
		selectMenu: {
			slots: {
				base: 'w-full',
			},
		},
		select: {
			slots: {
				base: 'w-full',
			},
		},
		textarea: {
			slots: {
				root: 'w-full',
			},
		},
		formField: {
			slots: {
				label: 'font-bold',
			},
		},
	},
})
