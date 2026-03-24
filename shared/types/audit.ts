export type AuditEntry = {
	score: number | undefined
	comment: string
}

export type AuditProps = {
	itemId: string
	itemTitle: string
	description?: string
}

export type Audit<T> = {
	id: string
	score: number | undefined
	comment: string
	item: T
}
