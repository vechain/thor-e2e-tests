/**
 * Extend the jest global `it` to have an `e2eTest`
 */
import { NetworkType } from '../src/test-env'
import ProvidesCallback = jest.ProvidesCallback

type E2eTest = (
    title: string,
    supportedEnvs: NetworkType[] | 'all',
    testFunc: ProvidesCallback,
) => void

declare global {
    namespace jest {
        interface It {
            e2eTest: E2eTest
        }
    }
}
