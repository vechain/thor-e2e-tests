import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { generateWalletWithFunds } from '../../../src/wallet'

describe('GET /transactions/{id}', function () {
    it('should get a transaction', async function () {
        const { receipt } = await generateWalletWithFunds()
        const tx = await Node1Client.getTransaction(receipt.meta.txID!, {
            pending: true,
        })

        assert(tx.success, 'Failed to get transaction')
        assert(tx.body != null, 'Failed to get transaction body')

        expect(tx.body.id).toEqual(receipt.meta.txID)
        expect(tx.httpCode).toEqual(200)
    })
})
