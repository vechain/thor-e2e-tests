import { Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

/**
 * @group api
 * @group transactions
 */
describe('GET /transactions/{id}/receipt', function () {
    it('should get transaction receipt', async () => {
        const transfer = await readRandomTransfer()

        const tx = await Client.raw.getTransactionReceipt(transfer.meta.txID)

        assert(tx.success, 'Failed to get transaction receipt')
        assert(tx.body != null, 'Failed to get transaction receipt body')

        expect(tx.body.meta?.txID).toEqual(transfer.meta?.txID)
        expect(tx.httpCode, 'Expected HTTP Code').toEqual(200)
    })
})
