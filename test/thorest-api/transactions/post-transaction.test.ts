import { generateWalletWithFunds } from '../../../src/wallet'

describe('POST /transactions', function () {
    it('should send a transaction', async function () {
        const { receipt } = await generateWalletWithFunds()

        expect(receipt.reverted).toEqual(false)
    })
})
