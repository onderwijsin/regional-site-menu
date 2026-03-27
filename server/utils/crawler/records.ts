import type { UnknownRecord } from './types'

/**
 * Turns unknown value into record when possible.
 *
 * @param value - Unknown value.
 * @returns Object record or null.
 */
export function asRecord(value: unknown): UnknownRecord | null {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as UnknownRecord
	}

	return null
}

/**
 * Ensures unknown value is iterable as array.
 *
 * @param value - Unknown value.
 * @returns Array value.
 */
export function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) {
		return []
	}

	return Array.isArray(value) ? value : [value]
}

/**
 * Converts iterable-like values into an array.
 *
 * @param value - Potential iterable value.
 * @returns Array of unknown values.
 */
export function toIterableArray(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value
	}

	if (value && typeof value === 'object') {
		const iterableCandidate = value as { [Symbol.iterator]?: unknown }
		if (typeof iterableCandidate[Symbol.iterator] === 'function') {
			try {
				return Array.from(value as Iterable<unknown>)
			} catch {
				return []
			}
		}
	}

	return []
}

/**
 * Calls an object method safely.
 *
 * @param target - Target object.
 * @param methodName - Method to call.
 * @param args - Method args.
 * @returns Method result or null.
 */
export function callRecordMethod(
	target: UnknownRecord,
	methodName: string,
	...args: unknown[]
): unknown {
	const method = target[methodName]
	if (typeof method !== 'function') {
		return null
	}

	try {
		return Reflect.apply(method, target, args)
	} catch {
		return null
	}
}
