<script lang="ts" setup>
import type { AuditProps } from '~~/shared/types/audit'

const props = defineProps<AuditProps>()
const open = ref(false)

const { score, comment, description, currentScoreColor, currentScoreLabel } = useAudit(props)
const { getIcon } = useIcons()

function handleSave() {
	open.value = false
}
</script>

<template>
	<UModal
		v-model:open="open"
		:title="!score ? 'Voeg jouw beoordeling toe' : 'Bewerk je beoordeling'"
		:description="description"
		:ui="{
			content: 'max-w-3xl min-h-[50dvh] max-h-[80dvh]',
			footer: 'justify-end flex gap-3',
			body: 'prose dark:prose-invert min-w-full',
		}"
	>
		<slot :score="score" :comment="comment" />
		<UButton
			v-if="!$slots.default"
			:label="!score ? 'Beoordeel je site' : 'Bewerk beoordeling'"
			color="primary"
			variant="subtle"
		/>

		<template #body>
			<p>Hoe vind jij dat jullie website scoort op dit onderdeel?</p>
			<div class="flex w-full items-center gap-4">
				<USlider
					v-model="score"
					:min="1"
					:max="10"
					:default-value="5"
					:color="currentScoreColor"
					:tooltip="{ text: currentScoreLabel }"
					class="grow"
				/>
				<span class="shrink-0 font-bold"> {{ score ?? '?' }} / 10 </span>
			</div>
			<Editor
				v-model="comment"
				class="my-6"
				outline
				placeholder="Voeg jouw opmerking toe. Je opmerking wordt verwerkt in de rapportage die je kunt genereren."
			/>
		</template>
		<template #footer>
			<UButton
				color="success"
				:icon="getIcon('save')"
				label="Opslaan"
				variant="subtle"
				@click="handleSave"
			/>
		</template>
	</UModal>
</template>
