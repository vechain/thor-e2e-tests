import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

describe('GET /transactions/{id}', function () {
    it('should get a transaction', async function () {
        const transfer = readRandomTransfer()

        const tx = await Node1Client.getTransaction(transfer.meta?.txID!, {
            pending: true,
        })

        assert(tx.success, 'Failed to get transaction')
        assert(tx.body != null, 'Failed to get transaction body')

        expect(tx.body.id).toEqual(transfer.meta?.txID)
        expect(tx.httpCode).toEqual(200)
    })
})
