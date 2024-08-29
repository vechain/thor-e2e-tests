import { ThorWallet } from '../../src/wallet'
import {
    SimpleCounterParis__factory as ParisCounter,
    SimpleCounterShanghai__factory as ShanghaiCounter,
} from '../../typechain-types'
import { pollReceipt } from '../../src/transactions'

/**
 * @group opcodes
 * @group evm
 */
describe('fork contract tests', () => {
    const wallet: ThorWallet = ThorWallet.withFunds()

    const counters = [
        {
            countrct: ParisCounter,
            name: 'Paris',
        },
        {
            countrct: ShanghaiCounter,
            name: 'Shanghai',
        },
    ]

    counters.forEach((counter) => {
        it.e2eTest(
            `should be able to deploy a ${counter.name} contract`,
            'all',
            async () => {
                const contract = await wallet.deployContract(
                    counter.countrct.bytecode,
                    counter.countrct.abi,
                )

                const startValue = await contract.read
                    .getCounter()
                    .then((r) => r[0])

                expect(startValue).toBe(0n)
                const increment = await contract.transact.incrementCounter()
                await pollReceipt(increment.id)

                const endValue = await contract.read
                    .getCounter()
                    .then((r) => r[0])
                expect(endValue).toBe(1n)
            },
        )
    })
})
