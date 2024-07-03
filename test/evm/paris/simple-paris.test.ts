import { ThorWallet } from '../../../src/wallet'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'
import { testCase } from '../../../src/test-case'

/**
 * @group opcodes
 * @group evm
 * @group paris
 */
describe('Simple Paris', () => {
    const wallet: ThorWallet = ThorWallet.withFunds({
        vet: '0x0',
        vtho: 6000e18,
    })

    testCase(['solo', 'default-private', 'testnet'])(
        'should be able to deploy a paris contract',
        async () => {
            const contract = await wallet.deployContract(
                ParisCounter.bytecode,
                ParisCounter.abi,
            )

            const startValue = await contract.read
                .getCounter()
                .then((r) => r[0])

            expect(startValue).toBe(0n)

            await contract.transact.incrementCounter().then((r) => r.wait())

            const endValue = await contract.read.getCounter().then((r) => r[0])

            expect(endValue).toBe(1n)
        },
    )
})
