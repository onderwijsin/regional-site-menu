<script lang="ts" setup>
import type { ViewMode } from '~~/shared/types/primitives'

const state = useStateStore()

const emit = defineEmits<{
	(e: 'close'): void
}>()

function handleSelect(value: ViewMode) {
	state.mode = value
	emit('close')
	return navigateTo('/')
}

function setMode(mode: ViewMode) {
	state.mode = mode
}

const { help } = useMenu()
const { contact } = useRuntimeConfig().public
</script>

<template>
	<UModal
		title="Welkom"
		description="Bij de menukaart voor regionale onderwijsloket websites"
		:ui="{
			content: 'max-w-3xl min-h-[50dvh] max-h-[80dvh]',
			footer: 'justify-between',
			body: 'prose dark:prose-invert min-w-full',
		}"
	>
		<template #body>
			<p>
				Deze tool helpt je bij het ontwerpen en verbeteren van de website van jouw regionale
				onderwijsloket. Je kunt hier:
			</p>
			<ul>
				<li>
					<strong>Inspiratie opdoen</strong> over welke elementen van belang zijn voor
					jouw doelgroep(en)
				</li>
				<li>
					Je huidige website <strong>evalueren en beoordelen</strong> op al deze mogelijke
					elementen
				</li>
				<li>
					Op basis van je evaluatie een <strong>rapport genereren</strong> dat kan dienen
					als briefing voor je webbureau
				</li>
			</ul>
			<h3>Twee manieren om te starten</h3>
			<p>
				Je kunt deze tool in twee modi gebruiken: je kunt kiezen voor
				<UButton
					:variant="state.mode === 'explore' ? 'subtle' : 'soft'"
					color="secondary"
					label="Verkennen"
					size="sm"
					class="relative -top-px mx-1 font-bold"
					@click="setMode('explore')"
				/>
				om door de menukaart te browsen, of je kunt
				<UButton
					:variant="state.mode === 'edit' ? 'subtle' : 'soft'"
					color="primary"
					label="Aan de slag"
					size="sm"
					class="relative -top-px font-bold"
					@click="setMode('edit')"
				/>
				om de verschillende evaluatietools te activeren. Je kunt altijd later van modus
				switchen via het menu.
			</p>

			<h3>Goed om te weten</h3>
			<p>
				Je kunt vanuit elke pagina in de tool direct naar
				<UButton
					variant="soft"
					color="neutral"
					v-bind="help"
					size="sm"
					class="relative top-0.5 mx-1 font-bold no-underline"
				/>
				navigeren voor extra uitleg over de menukaart. Voor vragen en opmerkingen kun je
				<NuxtLink :to="contact.page" target="_blank">een bericht achterlaten</NuxtLink> voor
				het team.
			</p>

			<p>
				Het gebruik van deze tool is <strong>volledig anoniem</strong>. De informatie die je
				invult wordt met niemand gedeeld.
			</p>
		</template>
		<template #footer>
			<USwitch
				v-model="state.hideWelcome"
				unchecked-icon="i-lucide-x"
				checked-icon="i-lucide-check"
				size="sm"
				label="Niet meer tonen"
			/>
			<UFieldGroup>
				<UButton
					label="Verkennen"
					color="secondary"
					variant="subtle"
					@click="handleSelect('explore')"
				/>
				<UButton
					label="Aan de slag"
					color="primary"
					variant="solid"
					@click="handleSelect('edit')"
				/>
			</UFieldGroup>
		</template>
	</UModal>
</template>
