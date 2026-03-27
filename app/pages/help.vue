<script setup lang="ts">
import type { AccordionItem, ButtonProps, PageFeatureProps, TimelineItem } from '@nuxt/ui'

const title = 'Hulp bij de tool'
const description = 'Ontdek de verschillende functies en mogelijkheden van de tool.'
useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description
})
const { getIcon } = useIcons()
const state = useStateStore()

const heroLinks = ref<ButtonProps[]>([
	{
		icon: getIcon('explore'),
		label: 'Verkennen',
		to: '/',
		color: 'neutral',
		variant: 'subtle',
		onClick: () => {
			state.setMode('explore', 'header_tabs')
		}
	},
	{
		icon: getIcon('edit'),
		label: 'Aan de slag',
		to: '/',
		color: 'primary',
		variant: 'subtle',
		trailingIcon: 'i-lucide-arrow-right',
		onClick: () => {
			state.setMode('edit', 'header_tabs')
		}
	}
])

const features: PageFeatureProps[] = [
	{
		icon: getIcon('inspiration'),
		title: 'Doe inspiratie op',
		description:
			'Ontdek de verschillende functies en elementen die terug kunnen komen in jouw website.'
	},
	{
		icon: getIcon('success'),
		title: 'Evalueer en beoordeel',
		description:
			'Beoordeel hoe jouw site scoort op verschillende criteria en evalueer de resultaten.'
	},
	{
		icon: getIcon('report'),
		title: 'Maak een actieplan',
		description:
			'Maak een uitgebreide rapportage met concrete acties op basis van de evaluatie.'
	}
]

const coreFlow: TimelineItem[] = [
	{
		icon: getIcon('inspiration'),
		title: '1. Verken de menukaart',
		description:
			'Start in de verkenmodus en blader door alle onderdelen. Zo krijg je snel zicht op wat een sterke regiosite kan bevatten.'
	},
	{
		icon: getIcon('help'),
		title: '2. Lees elk onderdeel goed door',
		description:
			'Open een item en lees waarom het belangrijk is, welke doelen het ondersteunt en hoe je het praktisch kunt toepassen op je eigen site.'
	},
	{
		icon: getIcon('edit'),
		title: '3. Beoordeel en licht toe',
		description:
			'Ga naar “Aan de slag” en geef per onderdeel een score. Voeg waar nodig toelichting toe zodat duidelijk is wat al goed werkt en wat nog beter kan.'
	},
	{
		icon: getIcon('success'),
		title: '4. Rond je audit volledig af',
		description:
			'Werk alle relevante onderdelen langs. Hoe completer je beoordeling, hoe bruikbaarder de eindrapportage als basis voor vervolgstappen.'
	},
	{
		icon: getIcon('report'),
		title: '5. Genereer en deel je PDF-rapport',
		description:
			'Maak een rapportage met je scores, opmerkingen en optioneel AI-inzichten. Deel de PDF met collega’s of een webbureau om gericht door te ontwikkelen.'
	}
]

const faqs = ref<AccordionItem[]>([
	{
		icon: getIcon('faq'),
		label: 'Is deze tool gratis te gebruiken?',
		content:
			'Ja, deze tool is volledig gratis te gebruiken, inclusief alle AI-functies. Ook alle tools en middelen die je onder "extra\'s" vindt, zijn gratis in te zetten voor je site.'
	},
	{
		icon: getIcon('faq'),
		label: 'Wie ziet allemaal welke scores ik onze site geef?',
		content:
			'Alleen jij en degenen met wie je de rapportage deelt, kunnen de scores zien. De gegevens worden niet openbaar gedeeld en blijven anoniem zolang je ze niet deelt.'
	},
	{
		icon: getIcon('faq'),
		label: 'Moet ik alles in één keer invullen?',
		content:
			'Nee. Je kunt de audit stapsgewijs doen. Scores en opmerkingen die je invult blijven bewaard, zodat je later verder kunt gaan waar je was gebleven.'
	},
	{
		icon: getIcon('faq'),
		label: 'Wat is een goede manier om te scoren?',
		content:
			'Gebruik de score om eerlijk te beoordelen hoe goed een onderdeel nu op je site is uitgewerkt. Voeg bij twijfel een korte toelichting toe; dat maakt de rapportage veel concreter en bruikbaarder.'
	},
	{
		icon: getIcon('faq'),
		label: 'Wanneer is AI handig om aan te zetten?',
		content:
			'AI is vooral handig als je sneller tot een eerste analyse of briefing wilt komen. Zie AI-output als startpunt en controleer altijd zelf of de conclusies passen bij jullie context.'
	},
	{
		icon: getIcon('faq'),
		label: 'Voor wie is de PDF-rapportage bedoeld?',
		content:
			'De rapportage is bedoeld als gedeeld werkdocument voor regioteams, communicatieadviseurs en webbouwers. Je kunt de PDF gebruiken voor prioritering, besluitvorming en concrete opdrachtvorming.'
	},
	{
		icon: getIcon('faq'),
		label: 'Kan ik later opnieuw een rapport genereren?',
		content:
			'Ja. Je kunt na aanpassingen op de website opnieuw scores bijwerken en een nieuwe rapportage maken. Zo kun je verbeteringen over tijd vergelijken en monitoren.'
	}
])
</script>

<template>
	<div>
		<UPageHero
			title="Over de menukaart"
			description="Deze tool bevat een menukaart met verschillende elementen die relevant zijn voor de website van jouw regionale onderwijsloket. Het is een digitale handreiking die jou helpt je site op een laagdrempelige manier te verbeteren."
			headline="Help"
			orientation="horizontal"
			:links="heroLinks"
		/>
		<UContainer class="pb-8">
			<UPageGrid>
				<UPageFeature
					v-for="feature in features"
					:key="feature.title"
					v-bind="feature"
					:ui="{ title: 'text-xl', description: 'text-mlg' }"
				/>
			</UPageGrid>

			<UPageHeader
				title="Zo werk je met de tool"
				description="Volg deze stappen om van verkennen naar een complete, deelbare auditrapportage te gaan."
				class="mt-20 mb-8"
			/>

			<UTimeline
				class="mb-16"
				size="3xl"
				:items="coreFlow"
				:ui="{ title: 'text-2xl font-bold relative -top-1', description: 'text-lg' }"
			/>

			<UPageCTA
				title="Ontdek toffe content voor je site"
				description="Wil jij meer inspirerende content en handige tools op je site aanbieden? Ontdek alle gratis middelen die je in kunt zetten."
				variant="subtle"
				class="mt-24 mb-16"
				:links="[
					{
						label: `Bekijk de extra's`,
						to: '/extras',
						trailingIcon: getIcon('gift'),
						color: 'primary'
					}
				]"
			/>

			<UPageHeader
				title="Verrijk je plan met AI-inzichten"
				description="Met AI-inzichten kun je je rapport verrijken met extra, direct bruikbare en actiegerichte input."
				class="mb-8"
			/>

			<UPageGrid class="mb-12">
				<UPageCard
					:icon="getIcon('ai')"
					title="AI website-analyse"
					description="De tool bekijkt pagina’s van je website en vergelijkt die met vaste kwaliteitscriteria. Je krijgt een korte, kritische analyse die uiteenzet wat al goed werkt, en welke concrete verbeterpunten er zijn."
					spotlight
					spotlight-color="primary"
					:ui="{ description: 'text-lg' }"
				/>
				<UPageCard
					:icon="getIcon('ai')"
					title="AI briefing"
					description="De tool zet je auditresultaten en opmerkingen om naar een heldere briefing voor een webbureau of ontwikkelaar. Deze briefing is praktisch en actiegericht: wat moet er komen, voor wie, en in welke volgorde."
					spotlight
					spotlight-color="primary"
					:ui="{ description: 'text-lg' }"
				/>
				<UPageCard
					:icon="getIcon('ai')"
					title="Spar met je favoriete assistent"
					description="Wil jij liever iteratief samen met je eigen AI-assistent aan de slag? Je kunt deze tool gebruiken in alle gangbare chatomgevingen. Kies voor de AI-button in het menu om de tool direct te koppelen."
					spotlight
					spotlight-color="primary"
					:ui="{ description: 'text-lg' }"
				/>
			</UPageGrid>

			<UAlert
				:icon="getIcon('warn')"
				title="Belangrijk om te weten"
				variant="subtle"
				color="secondary"
				description="AI helpt je sneller tot inzicht te komen, maar kan fouten maken. Controleer de output altijd op juistheid en pas waar nodig aan. Gebruik AI-inzichten daarom als slimme eerste versie, niet als definitieve waarheid."
				class="mb-16"
			/>

			<UPageHeader title="Veelgestelde vragen" class="mb-6" />
			<UAccordion
				:items="faqs"
				:ui="{ trigger: 'text-xl font-bold py-5', body: 'text-lg text-muted' }"
			/>

			<ContactCta />
		</UContainer>
	</div>
</template>
