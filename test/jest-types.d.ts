/**
 * Extend the jest global `it` to have an `e2eTest`
 */
import { E2eTestTag } from '../src/test-env'

type E2eTest = (
    title: string,
    tags: E2eTestTag[] | 'all',
    testFunc: jest.ProvidesCallback,
) => void

declare global {
    namespace jest {
        interface It {
            e2eTest: E2eTest
        }
    }
}
