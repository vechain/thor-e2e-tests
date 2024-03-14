import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_REGEX } from '../../../src/utils/hex-utils'
import { revisions } from '../../../src/constants'
import { readRandomTransfer, Transfer } from '../../../src/populated-data'
import { FAUCET_AMOUNT_HEX } from '../../../src/account-faucet'

describe('GET /accounts/{address}', function () {
    const invalidAddresses = [
        '0x00000000',
        'zzzzzzz',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffeZ',
        '0x7567d83b7b8d80addcb281a71d54fc7b3364ffe',
    ]

    let transfer: Transfer

    beforeAll(async () => {
        transfer = await readRandomTransfer()
    })

    it('correct balance', async function () {
        const res = await Node1Client.getAccount(transfer.vet.recipient)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Expected Response Body').toEqual({
            balance: FAUCET_AMOUNT_HEX,
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    it('contract account hasCode', async function () {
        const addr = contractAddresses.energy
        const res = await Node1Client.getAccount(addr)

        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Expected Response Body').toEqual({
            balance: expect.stringMatching(HEX_REGEX),
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: true,
        })
    })

    it.each(revisions.valid())('valid revision %s', async function (revision) {
        const res = await Node1Client.getAccount(
            transfer.vet.recipient,
            revision,
        )
        expect(res.success, 'API response should be a success').toBeTrue()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(res.body, 'Expected Response Body').toEqual({
            balance: expect.stringMatching(HEX_REGEX),
            energy: expect.stringMatching(HEX_REGEX),
            hasCode: false,
        })
    })

    it.each(invalidAddresses)('invalid address: %s', async (a) => {
        const res = await Node1Client.getAccount(a as string)
        expect(res.success, 'API Call should fail').toBeFalse()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
    })

    it.each(revisions.invalid)('invalid revision: %s', async (r) => {
        const res = await Node1Client.getAccount(transfer.vet.recipient, r)
        expect(res.success, 'API Call should fail').toBeFalse()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
    })
})
