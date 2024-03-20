import { ThorWallet } from '../../../src/wallet'
import { SimpleCounterShanghai__factory as ShanghaiCounter } from '../../../typechain-types'
import { Node1Client } from '../../../src/thor-client'
import { pollReceipt } from '../../../src/transactions'

describe('Simple Shanghai', () => {
    let wallet: ThorWallet

    beforeAll(async () => {
        wallet = ThorWallet.new(true)
        await wallet.waitForFunding()
    })

    it('should NOT be able to deploy a paris contract', async () => {
        const tx = await wallet.sendClauses(
            [
                {
                    data: ShanghaiCounter.bytecode,
                    value: 0,
                    to: null,
                },
            ],
            false,
        )

        const receipt = await pollReceipt(tx.id ?? '')

        expect(receipt.reverted).toBe(true)

        const debugged = await Node1Client.debugRevertedClause(tx.id ?? '', 0)

        // 0x5f is the PUSH0 opcode
        expect(debugged?.body?.error).toEqual('invalid opcode 0x5f')
    })
})
