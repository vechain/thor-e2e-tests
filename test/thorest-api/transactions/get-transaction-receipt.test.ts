import { Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { getRandomTransfer } from '../../../src/logs/query-logs'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group transactions
 */
describe('GET /transactions/{id}/receipt', function () {
    testCase(['solo', 'default-private'])(
        'should get transaction receipt',
        async function () {
            const transfer = await getRandomTransfer()

            const tx = await Client.raw.getTransactionReceipt(
                transfer.meta.txID,
            )

            assert(tx.success, 'Failed to get transaction receipt')
            assert(tx.body != null, 'Failed to get transaction receipt body')

            expect(tx.body.meta?.txID).toEqual(transfer.meta?.txID)
            expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
        },
    )
})
