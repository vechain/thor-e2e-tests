import { ThorWallet } from '../../../src/wallet'
import { SimpleCounterParis__factory as ParisCounter } from '../../../typechain-types'
import { testCase } from '../../../src/test-case'
import { Client } from '../../../src/thor-client'

/**
 * @group opcodes
 * @group evm
 * @group paris
 */
describe('Simple Paris', () => {
    const wallet: ThorWallet = ThorWallet.withFunds()

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

            const lastBlock = await Client.raw.getBlock('best')
            await contract.transact.incrementCounter().then((r) => r.wait())

            let latestBlock = await Client.raw.getBlock('best')
            while (latestBlock.body?.number! < lastBlock.body?.number! + 1) {
                latestBlock = await Client.raw.getBlock('best')
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }

            const endValue = await contract.read.getCounter().then((r) => r[0])

            expect(endValue).toBe(1n)
        },
    )
})
