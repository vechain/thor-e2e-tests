import { ThorWallet } from '../../../src/wallet'

describe('POST /transactions', function () {
    it('should send a transaction', async function () {
        const wallet = ThorWallet.new(true)

        const receipt = await wallet.waitForFunding()

        expect(receipt?.reverted).toEqual(false)
    })
})
