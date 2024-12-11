import { Client } from '../../../src/thor-client'
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

        expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(tx.success, 'Failed to get transaction').toBeTrue()
        expect(tx.body, 'Failed to get transaction body').toBeDefined()
        expect(tx.body.id).toEqual(transfer.meta?.txID)
    })
})
