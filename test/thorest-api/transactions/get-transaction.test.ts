import { Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { getRandomTransfer } from '../../../src/logs/query-logs'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group transactions
 */
describe('GET /transactions/{id}', function () {
    testCase(['solo', 'default-private'])(
        'should get a transaction',
        async function () {
            const transfer = await getRandomTransfer()

            const tx = await Client.raw.getTransaction(transfer.meta?.txID, {
                pending: true,
            })

            assert(tx.success, 'Failed to get transaction')
            assert(tx.body != null, 'Failed to get transaction body')

            expect(tx.body.id).toEqual(transfer.meta?.txID)
            expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
        },
    )
})
