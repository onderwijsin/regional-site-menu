import {
	asRecord,
	callRecordMethod,
	toArray,
	toIterableArray
} from '~~/server/utils/crawler/records'
import { describe, expect, it } from 'vitest'

describe('crawler/records utilities', () => {
	it('converts values to records only when object-like and non-array', () => {
		expect(asRecord({ key: 1 })).toEqual({ key: 1 })
		expect(asRecord(null)).toBeNull()
		expect(asRecord(['a'])).toBeNull()
		expect(asRecord('x')).toBeNull()
	})

	it('normalizes optional single/array values to arrays', () => {
		expect(toArray(undefined)).toEqual([])
		expect(toArray('value')).toEqual(['value'])
		expect(toArray(['a', 'b'])).toEqual(['a', 'b'])
	})

	it('converts iterable values and guards against iterator failures', () => {
		expect(toIterableArray([1, 2])).toEqual([1, 2])
		expect(toIterableArray(new Set(['a', 'b']))).toEqual(['a', 'b'])
		expect(toIterableArray({})).toEqual([])

		const throwingIterable = {
			[Symbol.iterator]() {
				throw new Error('boom')
			}
		}
		expect(toIterableArray(throwingIterable)).toEqual([])
	})

	it('calls methods safely and returns null for missing/throwing methods', () => {
		const target = {
			ok(value: string) {
				return `${value}-done`
			},
			fail() {
				throw new Error('fail')
			}
		}

		expect(callRecordMethod(target, 'ok', 'task')).toBe('task-done')
		expect(callRecordMethod(target, 'missing')).toBeNull()
		expect(callRecordMethod(target, 'fail')).toBeNull()
	})
})
