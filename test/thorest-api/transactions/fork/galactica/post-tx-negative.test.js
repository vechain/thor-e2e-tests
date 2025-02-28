import { Clause, Hex, Units, VET } from '@vechain/sdk-core'
import { Client } from '../../../../../src/thor-client'
import { ThorWallet } from '../../../../../src/wallet'

/**
 * @group api
 * @group transactions
 * @group fork
 */

describe('POST /transactions', () => {
    it.e2eTest(
        'should reject a transaction with not enough maxFeePerGas to cover for the baseFee',
        ['solo', 'default-private'],
        async () => {
            const wallet = ThorWallet.withFunds()

            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const txBody = await wallet.buildTransaction([clause], {
                isDynFeeTx: true,
                maxFeePerGas: baseFee - 1,
            })
            const tx = await wallet.signTransaction(txBody)

            const hex = Hex.of(tx.encoded)

            const res = await Client.raw.sendTransaction({
                raw: hex.toString(),
            })

            const expectedErrMsg =
                'tx rejected: max fee per gas is less than block base fee'
            expect(res.success).toBeFalsy()
            expect(res.httpMessage.trimEnd()).toBe(expectedErrMsg)
        },
    )

    it.e2eTest(
        'should reject a transaction with maxPriorityFeePerGas lower then maxFeePerGas',
        ['solo', 'default-private'],
        async () => {
            const wallet = ThorWallet.withFunds()

            const clause = Clause.transferVET(
                wallet.address,
                VET.of(1, Units.wei),
            )

            const bestBlk = await Client.raw.getBlock('best')
            expect(bestBlk.success).toBeTruthy()

            const baseFee = bestBlk.body?.baseFee
            const txBody = await wallet.buildTransaction([clause], {
                isDynFeeTx: true,
                maxPriorityFeePerGas: baseFee * 10,
                maxFeePerGas: baseFee,
            })
            const tx = await wallet.signTransaction(txBody)

            const hex = Hex.of(tx.encoded)

            const res = await Client.raw.sendTransaction({
                raw: hex.toString(),
            })

            const expectedErrMsg =
                'tx rejected: max fee per gas (10000000000000) must be greater than max priority fee per gas (100000000000000)'
            expect(res.success).toBeFalsy()
            expect(res.httpMessage.trimEnd()).toBe(expectedErrMsg)
        },
    )
})
