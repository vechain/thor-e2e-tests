import { Eip1559Transaction } from '../../../src/eip-1559-transaction'
import { Clause, Address, VET, Units, Hex } from '@vechain/sdk-core'
import { ThorWallet } from '../../../src/wallet'
import { getBlockRef } from '../../../src/utils/block-utils'
import { Client } from '../../../src/thor-client'
import { generateNonce } from '../../../src/transactions'

const buildTx = async (clauses, options) => {
    const bestBlockRef = await getBlockRef('best')
    const genesisBlock = await Client.raw.getBlock('0')

    if (!genesisBlock.success || !genesisBlock.body?.id) {
        throw new Error('Could not get best block')
    }

    return new Eip1559Transaction({
        blockRef: bestBlockRef,
        expiration: 1000,
        clauses: clauses,
        maxPriorityFeePerGas: 10,
        maxFeePerGas: 1000,
        gas: 1_000_000,
        dependsOn: options?.dependsOn ?? null,
        nonce: generateNonce(),
        chainTag: parseInt(genesisBlock.body.id.slice(-2), 16),
    })
}

describe('EIP-1559 Transaction', () => {
    it.e2eTest(
        'should be able to send an EIP-1559 transaction',
        ['solo', 'default-private'],
        async () => {
            const wallet = ThorWallet.withFunds()

            const clause = Clause.transferVET(
                Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
                VET.of(1, Units.wei),
            )

            const tx = await wallet.signTransaction(await buildTx([clause]))

            const hex = Hex.of(tx.encoded)

            const res = await Client.raw.sendTransaction({
                raw: hex.toString(),
            })

            expect(res.success).toBeTruthy()
        },
    )
})
