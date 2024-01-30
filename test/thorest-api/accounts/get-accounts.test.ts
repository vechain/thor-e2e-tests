import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_REGEX } from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readPopulatedData } from '../../../src/populated-data'
import assert from 'node:assert'
import { FAUCET_AMOUNT } from '../../../src/account-faucet'

describe('GET /accounts/{address}', function () {
    const invalidAddresses = [
        '0x00000000',
        'zzzzzzz',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffeZ',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffe',
    ]

    let accountWithBalance: string

    beforeAll(async () => {
        const chainData = readPopulatedData()
        const receipt = chainData.transfers[0].receipt
        const toAccount = receipt.outputs?.[0].transfers?.[0].recipient
        assert(toAccount, 'Failed to get toAccount')
        accountWithBalance = toAccount
    })

    it('correct balance', async function () {
        const toAccountBalance =
            await Node1Client.getAccount(accountWithBalance)

        expect(toAccountBalance.success).toBeTruthy()
        expect(toAccountBalance.httpCode).toEqual(200)
        expect(toAccountBalance.body).toEqual({
            balance: FAUCET_AMOUNT,
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    it('contract account hasCode', async function () {
        const addr = contractAddresses.energy
        const res = await Node1Client.getAccount(addr)

        expect(res.success).toBeTruthy()
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual({
            balance: expect.stringMatching(HEX_REGEX),
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: true,
        })
    })

    it.each(revisions.valid())('valid revision %s', async function (revision) {
        const res = await Node1Client.getAccount(accountWithBalance, revision)
        expect(res.success).toBeTruthy()
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual({
            balance: expect.stringMatching(HEX_REGEX),
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    it.each(invalidAddresses)('invalid address: %s', async (a) => {
        const res = await Node1Client.getAccount(a as string)
        expect(res.success).toBeFalsy()
        expect(res.httpCode).toEqual(400)
    })

    it.each(revisions.invalid)('invalid revision: %s', async (r) => {
        const res = await Node1Client.getAccount(accountWithBalance, r)
        expect(res.success).toBeFalsy()
        expect(res.httpCode).toEqual(400)
    })
})
