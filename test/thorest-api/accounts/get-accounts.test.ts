import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { sendClauses } from '../../../src/transactions'
import {
    generateEmptyWallet,
    generateWalletWithFunds,
    Wallet,
} from '../../../src/wallet'

describe('GET /accounts/{address}', function () {
    const invalidAddresses = [
        '0x00000000',
        'zzzzzzz',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffeZ',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffe',
    ]

    const validRevisions = [
        'best',
        '1',
        '0x00000000b4d1257f314d7b3f6720f99853bef846fa0a3d4873a2e1f5f869b42d',
    ]

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

        expect(toAccountBalance.success).toBeTruthy()
        expect(toAccountBalance.body?.balance).toEqual(sendAmount)
        expect(toAccountBalance.httpCode).toEqual(200)
    })

    it('contract account hasCode', async function () {
        const addr = contractAddresses.energy
        const res = await Node1Client.getAccount(addr)
        expect(res.success).toBeTruthy()
        expect(res.httpCode).toEqual(200)
        expect(res.body?.hasCode).toEqual(true)
    })

    it.each(validRevisions)('valid revision %s', async function (revision) {
        const res = await Node1Client.getAccount(wallet.address, revision)
        expect(res.success).toBeTruthy()
        expect(res.httpCode).toEqual(200)
    })

    it.each(invalidAddresses)('invalid address: %s', async (a) => {
        const res = await Node1Client.getAccount(a as string)
        expect(res.success).toBeFalsy()
        expect(res.httpCode).toEqual(400)
    })
})
