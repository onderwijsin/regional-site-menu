<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'
import type { AuditProps } from '~~/shared/types/audit'

const props = defineProps<AuditProps>()

const { score, comment, description, currentScoreColor, currentScoreLabel } = useAudit(props)
const editComment = useComment()
const { getIcon } = useIcons()

const actions = computed<ButtonProps[]>(() => {
	const items: ButtonProps[] = [
		{
			label: !comment.value ? 'Voeg opmerking toe' : 'Bewerk opmerking',
			variant: 'subtle',
			color: 'neutral',
			icon: getIcon('edit'),
			onClick: async () => {
				const result = await editComment({ initialValue: comment.value ?? '' })
				if (!result) return
				comment.value = result.value
			},
		},
	]

	return items
})
</script>

<template>
	<UPageCTA
		title="Hoe doet jouw website het?"
		:description="description"
		variant="subtle"
		class="my-16"
		:ui="{ links: 'max-w-lg mx-auto' }"
	>
		<template #links>
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

			<div class="flex gap-2 py-6">
				<UButton v-for="(item, index) in actions" :key="index" v-bind="item" />
			</div>
		</template>
	</UPageCTA>
</template>
