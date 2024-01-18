import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { contractAddresses } from '../../../src/contracts/addresses'
import { sendClauses } from '../../../src/transactions'
import {
    generateEmptyWallet,
    generateWalletWithFunds,
    Wallet,
} from '../../../src/wallet'

describe('GET /accounts/{address}', function () {
    const invalidAddresses = ['0x00000000', 'zzzzzzz']

    const validRevisions = ['best', '1']

    let wallet: Wallet

    beforeAll(async () => {
        wallet = await generateWalletWithFunds()
    })

    it('correct balance', async function () {
        const toAccount = generateEmptyWallet()

        const sendAmount = '0x100'

        await sendClauses(
            [
                {
                    to: toAccount.address,
                    value: sendAmount,
                    data: '0x',
                },
            ],
            wallet.privateKey,
            true,
        )

        const toAccountBalance = await Node1Client.getAccount(toAccount.address)

        assert(toAccountBalance.success, 'Failed to get account details')

        expect(toAccountBalance.body?.balance).toEqual(sendAmount)
        expect(toAccountBalance.httpCode).toEqual(200)
    })

    it('contract account hasCode', async function () {
        const addr = contractAddresses.energy
        const res = await Node1Client.getAccount(addr)
        assert(res.success, 'Failed to get account')
        expect(res.httpCode).toEqual(200)
        expect(res.body.hasCode).toEqual(true)
    })

    it.each(validRevisions)('valid revision %s', async function (revision) {
        const res = await Node1Client.getAccount(wallet.address, revision)
        assert(res.success, 'Failed to get account')
        expect(res.httpCode).toEqual(200)
    })

    it.each(invalidAddresses)('invalid address: %s', async (a) => {
        const res = await Node1Client.getAccount(a as string)
        assert(!res.success, 'Should not be successful')
        expect(res.httpCode).toEqual(400)
    })
})
