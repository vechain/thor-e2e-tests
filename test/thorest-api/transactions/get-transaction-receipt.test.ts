import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

describe('GET /transactions/{id}/receipt', function () {
    it('should get transaction receipt', async function () {
        const transfer = readRandomTransfer()

        const tx = await Node1Client.getTransactionReceipt(transfer.meta.txID)

        assert(tx.success, 'Failed to get transaction receipt')
        assert(tx.body != null, 'Failed to get transaction receipt body')

        expect(tx.body.meta?.txID).toEqual(transfer.meta?.txID)
        expect(tx.httpCode).toEqual(200)
    })
})
