import { ThorWallet } from '../../../src/wallet'

describe('POST /transactions', function () {
    it('should send a transaction', async function () {
        const wallet = ThorWallet.new(true)

        const fundReceipt = await wallet.waitForFunding()

        expect(fundReceipt?.reverted).toEqual(false)
    })
})
