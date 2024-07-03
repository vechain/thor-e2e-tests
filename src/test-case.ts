import { NetworkType, testEnv } from './test-env'
import ProvidesCallback = jest.ProvidesCallback
import EmptyFunction = jest.EmptyFunction

const isMatching = (supportedEnvs: NetworkType[]) =>
    supportedEnvs.includes(testEnv.type)

/**
 * Example:
 * testCase(['solo', 'default-private'])('should run this test', () => {
 *     expect(true).toBeTruthy()
 * })
 */
export const testCase =
    (supportedEnvs: NetworkType[] | 'all') =>
        (title: string, testFunc: ProvidesCallback) => {
            if (supportedEnvs === 'all' || isMatching(supportedEnvs)) {
                test(title, testFunc)
            } else {
                console.warn(`Skipping test: ${title}`)
                test.skip(title, testFunc)
            }
        }

/**
 * testCaseEach(['solo', 'default-private'])(
 *     'should run this test',
 *     [1, 2, 3],
 *     (val) => {
 *         expect(val).toBeGreaterThan(0)
 *     },
 * )
 */
export const testCaseEach =
    (supportedEnvs: NetworkType[] | 'all') =>
        <T>(title: string, cases: T[], testFunc: (val: T) => void) => {
            if (supportedEnvs === 'all' || isMatching(supportedEnvs)) {
                test.each(cases)(title, testFunc)
            } else {
                console.warn(`Skipping test: ${title}`)
                test.skip.each(cases)(title, testFunc)
            }
        }

export const describeCases =
    (supportedEnvs: NetworkType[] | 'all') =>
        (title: string, testFunc: EmptyFunction) => {
            if (supportedEnvs === 'all' || isMatching(supportedEnvs)) {
                describe(title, testFunc)
            } else {
                console.warn(`Skipping suite: ${title}`)
                describe.skip(title, testFunc)
            }
        }
