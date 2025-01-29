import { ThorWallet } from '../../../src/wallet'
import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { Extension__factory } from '../../../typechain-types'
import { addUintPadding } from '../../../src/utils/padding-utils'

describe('Builtin :: Extension', () => {
    const wallet = ThorWallet.withFunds()
    const extension = Client.sdk.contracts.load(
        contractAddresses.extension,
        Extension__factory.abi,
    )

    it.e2eTest('should be able to get the clause count', 'all', async () => {
        const count = 100
        const contractCall = await extension.clause.txClauseCount()
        const clause = {
            to: extension.address,
            value: '0x0',
            data: contractCall.clause.data,
        }
        const best = await Client.raw.getBlock('best')
        const clauses = Array.from({ length: count }).map(() => clause)
        const batchCall = await Client.raw.executeAccountBatch(
            {
                gas: 10_000_000,
                caller: wallet.address,
                clauses,
            },
            best.body.id,
        )

        for (let i = 0; i < count; i++) {
            expect(batchCall.body[i].data).toEqual('0x' + addUintPadding(count))
        }
    })

    it.e2eTest('should be able to get the clause index', 'all', async () => {
        const amount = 50

        const contractCall = await extension.clause.txClauseIndex()
        const clause = {
            to: extension.address,
            value: '0x0',
            data: contractCall.clause.data,
        }

        const clauses = Array.from({ length: amount }).map(() => clause)

        const best = await Client.raw.getBlock('best')
        const batchCall = await Client.raw.executeAccountBatch(
            {
                gas: 10_000_000,
                caller: wallet.address,
                clauses,
            },
            best.body.id,
        )

        for (let i = 0; i < amount; i++) {
            expect(batchCall.body[i].data).toEqual('0x' + addUintPadding(i))
        }
    })
})
