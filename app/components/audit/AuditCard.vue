<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit } from '~~/shared/types/audit'

const props = defineProps<{ item: Audit<ItemsCollectionItem> }>()
const { item } = props.item

const state = useStateStore()
const { getIcon } = useIcons()
const confirm = useConfirmDialog()

const score = computed(() => state.getAuditScore(props.item.id))

async function handleDelete() {
	const confirmed = await confirm({
		title: 'Weet je het zeker?',
		description:
			'Als je de beoordeling verwijdert, kan deze actie niet ongedaan worden gemaakt.',
	})

	if (confirmed) {
		state.removeAudit(props.item.id)
	}
}
</script>

<template>
	<UPageCard
		variant="soft"
		:title="item.title"
		size="sm"
		:ui="{
			footer: 'space-x-2 space-y-1.5',
			description: 'space-y-3',
		}"
	>
		<template #description>
			<UEditor
				:model-value="props.item.comment"
				:editable="false"
				content-type="markdown"
				:ui="{ base: 'line-clamp-2 px-0 sm:px-0 text-sm' }"
			/>
			<Pillar :value="item.pillar" size="sm" />
			<ClientOnly>
				<div class="absolute top-3 right-3 z-50 flex gap-2">
					<Score :value="score" size="sm" />
					<AuditModal
						:item-id="item.id"
						:item-title="item.title"
						:description="item.audit?.description"
					>
						<template #default>
							<UTooltip text="Bewerk beoordeling">
								<UButton
									:icon="getIcon('edit')"
									aria-label="Bewerk beoordeling"
									color="neutral"
									variant="subtle"
									size="xs"
								/>
							</UTooltip>
						</template>
					</AuditModal>
					<UTooltip text="Verwijder beoordeling">
						<UButton
							:icon="getIcon('delete')"
							aria-label="Verwijder beoordeling"
							color="neutral"
							variant="subtle"
							size="xs"
							@click="handleDelete"
						/>
					</UTooltip>
				</div>
			</ClientOnly>
		</template>
	</UPageCard>
</template>
