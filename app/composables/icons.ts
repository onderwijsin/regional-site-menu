const icons = {
	inzicht: 'lucide:component',
	verdieping: 'lucide:scan-text',
	activatie: 'lucide:activity',
	ondersteuning: 'lucide:messages-square',
}

export const useIcons = () => {
	function getIcon(name: keyof typeof icons) {
		return icons[name]
	}

	return {
		getIcon,
	}
}
