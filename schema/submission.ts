import { goal, pillar } from '@schema/fields'
import { z } from 'zod'

export const SubmissionSchema = z.object({
	title: z.string().min(1, { error: 'Voeg een naam toe' }),
	description: z.string().min(1, { error: 'Voeg een korte beschrijving toe' }),
	body: z.string(),
	pillar,
	goals: z.array(goal).min(1, { error: 'Kies minstens één doel' }),
	exampleUrl: z.url({ error: 'Voeg een geldige URL toe' }),
})

export type Submission = z.infer<typeof SubmissionSchema>
