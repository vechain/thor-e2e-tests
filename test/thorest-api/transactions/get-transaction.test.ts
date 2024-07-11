import { Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

/**
 * @group api
 * @group transactions
 */
describe('GET /transactions/{id}', function () {
    it.e2eTest('should get a transaction', 'all', async () => {
        const transfer = await readRandomTransfer()

        const tx = await Client.raw.getTransaction(transfer.meta?.txID, {
            pending: true,
        })

        assert(tx.success, 'Failed to get transaction')
        assert(tx.body != null, 'Failed to get transaction body')

        expect(tx.body.id).toEqual(transfer.meta?.txID)
        expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
    })
})
