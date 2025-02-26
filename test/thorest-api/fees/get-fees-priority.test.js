import { expect } from 'vitest'
import { Client } from '../../../src/thor-client'
import { HEX_AT_LEAST_1 } from '../../../src/utils/hex-utils'

/**
 * @group api
 * @group fees
 */
describe('GET /fees/priority', function () {

    it.e2eTest('get suggested priority fee', 'all', async () => {
        const res = await Client.raw.getFeesPriority()

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        const expectedRes = {
            maxPriorityFeePerGas: expect.stringMatching(HEX_AT_LEAST_1),
        }
        expect(res.body, 'Expected Response Body').toEqual(expectedRes)
    })
})
