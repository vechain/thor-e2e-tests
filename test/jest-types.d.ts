/**
 * Extend the jest global `it` to have an `e2eTest`
 */
import { NetworkType } from '../src/test-env'

type E2eTest = (
    title: string,
    supportedEnvs: NetworkType[] | 'all',
    testFunc: jest.ProvidesCallback,
) => void

declare global {
    namespace jest {
        interface It {
            e2eTest: E2eTest
        }
    }
}
