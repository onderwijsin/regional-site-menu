export default defineAppConfig({
	ui: {
		colors: {
			primary: 'primary',
			secondary: 'secondary',
			neutral: 'slate'
		},
		button: {
			slots: {
				base: 'cursor-pointer'
			},
			variants: {
				size: {
					md: {
						leadingIcon: 'size-4'
					}
				}
			}
		},
		badge: {
			slots: {
				base: 'select-none'
			}
		},
		pageColumns: {
			base: 'space-y-6 gap-x-6 lg:columns-2'
		},
		contentNavigation: {
			slots: {
				linkLeadingIcon: 'size-4'
			}
		},
		navigationMenu: {
			slots: {
				linkLeadingIcon: 'size-4'
			}
		},
		dropdownMenu: {
			slots: {
				content: 'dark:bg-neutral-950'
			},
			variants: {
				size: {
					md: {
						item: 'items-center',
						itemLeadingIcon: 'size-4'
					}
				}
			}
		},
		page: {
			slots: {
				root: 'md:grid md:grid-cols-10 lg:grid-cols-12 md:gap-8',
				left: 'md:col-span-3 lg:col-span-3',
				center: 'md:col-span-7 lg:col-span-9'
			}
		},

		input: {
			slots: {
				root: 'w-full',
				base: 'dark:bg-neutral-950'
			}
		},
		selectMenu: {
			slots: {
				base: 'w-full dark:bg-neutral-950'
			}
		},
		select: {
			slots: {
				base: 'w-full dark:bg-neutral-950'
			}
		},
		textarea: {
			slots: {
				root: 'w-full',
				base: 'dark:bg-neutral-950'
			}
		},
		formField: {
			slots: {
				label: 'font-bold'
			}
		},
		switch: {
			slots: {
				label: 'font-bold'
			}
		},
		alert: {
			slots: {
				title: 'font-bold'
			}
		}
	}
})
