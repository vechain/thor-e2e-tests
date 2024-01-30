import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readPopulatedData } from '../../../src/populated-data'

describe('GET /transactions/{id}/receipt', function () {
    it('should get transaction receipt', async function () {
        const chainData = readPopulatedData()
        const receipt = chainData.transfers[0].receipt

        assert(receipt.meta.txID, 'Failed to get transaction receipt')

        const tx = await Node1Client.getTransactionReceipt(receipt.meta.txID)

        assert(tx.success, 'Failed to get transaction receipt')
        assert(tx.body != null, 'Failed to get transaction receipt body')

        expect(tx.body.meta.txID).toEqual(receipt.meta.txID)
        expect(tx.httpCode).toEqual(200)
    })
})
