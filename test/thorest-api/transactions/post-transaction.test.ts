import { ThorWallet } from '../../../src/wallet'

describe('POST /transactions', function () {
    it('should send a transaction', async function () {
        const { fundReceipt } = await ThorWallet.new(true)

        expect(fundReceipt?.reverted).toEqual(false)
    })
})
