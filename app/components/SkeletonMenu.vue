<script lang="ts" setup></script>

<template>
	<section class="space-y-8">
		<div class="flex items-center justify-between gap-6">
			<UInput
				size="lg"
				variant="outline"
				placeholder="Doorzoek het menu"
				icon="lucide:search"
				class="grow"
				disabled
			/>
			<USkeleton class="h-9 w-[340px] rounded-md" />
		</div>
		<UPageColumns>
			<UPageCard
				v-for="i in 20"
				:key="i"
				variant="soft"
				:ui="{
					body: 'w-full',
					footer: 'space-x-2',
				}"
			>
				<template #title>
					<USkeleton class="mb-4 h-5 w-3/4 rounded-full" />
				</template>
				<template #description>
					<USkeleton
						v-for="b in 2"
						:key="b"
						class="mb-2 h-4 w-full rounded-full last:mb-0 last:w-1/2"
					/>
				</template>
				<template #footer>
					<USkeleton v-for="c in 3" :key="c" class="inline-block h-5 w-12 rounded-md" />
				</template>
			</UPageCard>
		</UPageColumns>
	</section>
</template>
