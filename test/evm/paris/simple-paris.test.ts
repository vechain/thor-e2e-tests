import { ThorWallet } from '../../../src/wallet'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'

describe('Simple Paris', () => {
    let wallet: ThorWallet

    beforeAll(() => {
        wallet = ThorWallet.new(true)
    })

    it('should be able to deploy a paris contract', async () => {
        const contract = await wallet.deployContract(
            ParisCounter.bytecode,
            ParisCounter.abi,
        )

        const startValue = await contract.read.getCounter().then((r) => r[0])

        expect(startValue).toBe(0n)

        await contract.transact.incrementCounter().then((r) => r.wait())

        const endValue = await contract.read.getCounter().then((r) => r[0])

        expect(endValue).toBe(1n)
    })
})
