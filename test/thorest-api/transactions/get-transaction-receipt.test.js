import { Client } from '../../../src/thor-client'
import { readRandomTransfer } from '../../../src/populated-data'

/**
 * @group api
 * @group transactions
 */
describe('GET /transactions/{id}/receipt', function () {
    it.e2eTest('should get transaction receipt', 'all', async () => {
        const transfer = await readRandomTransfer()

        const tx = await Client.raw.getTransactionReceipt(transfer.meta.txID)

        expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(tx.success, 'Failed to get transaction receipt').toBeTrue()
        expect(tx.body, 'Failed to get transaction receipt body').toBeDefined()
        expect(tx.body.meta?.txID).toEqual(transfer.meta?.txID)
    })
})
