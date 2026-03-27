<script setup lang="ts">
const title = 'Hulp bij de tool'
const description = 'Ontdek de verschillende functies en mogelijkheden van de tool.'
useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description
})

// FOR LATER

// Met AI-inzichten kun je je rapport verrijken met extra, direct bruikbare input. Je kunt kiezen voor twee onderdelen:

// 1. **AI-website-analyse**
// De tool bekijkt pagina’s van je website en vergelijkt die met vaste kwaliteitscriteria. Je krijgt een korte, kritische analyse met:
// - wat al goed werkt;
// - wat ontbreekt of nog onvoldoende is uitgewerkt;
// - concrete verbeterpunten in volgorde van prioriteit.

// 2. **AI-briefing**
// De tool zet je auditresultaten en opmerkingen om naar een heldere briefing voor een webbureau of ontwikkelaar. Deze briefing is praktisch en actiegericht: wat moet er komen, voor wie, en in welke volgorde.

// **Wat kun je verwachten?**
// - Teksten in duidelijk Nederlands, compact en bruikbaar als startpunt voor doorontwikkeling.
// - In het rapport is zichtbaar welke onderdelen door jullie zijn ingevuld en welke met AI zijn gegenereerd.
// - Bij de website-analyse zie je ook welke URL’s zijn meegenomen.

// **Belangrijk om te weten**
// AI helpt je sneller tot inzicht te komen, maar kan fouten maken. Controleer de output altijd op juistheid en pas waar nodig aan. Gebruik AI-inzichten daarom als slimme eerste versie, niet als definitieve waarheid.
</script>

<template>
	<UContainer class="pt-16">
		<UEmpty
			icon="lucide:sparkles"
			title="Nog in ontwikkeling"
			description="Deze feature is nog niet uitontwikkeld. Probeer het later nog eens."
			variant="soft"
		/>

		<ContactCta />
	</UContainer>
</template>
