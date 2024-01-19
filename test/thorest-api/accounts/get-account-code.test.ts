import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import HexUtils from '../../../src/utils/hex-utils'
import { generateEmptyWallet } from '../../../src/wallet'

describe('GET /accounts/{address}/code', function () {
    const accountAddress = [
        generateEmptyWallet(),
        generateEmptyWallet(),
        generateEmptyWallet(),
        generateEmptyWallet(),
    ].map((w) => w.address)

    it.each(accountAddress)(
        'should return no code for newly created address: %s',
        async function (addr) {
            const res = await Node1Client.getAccountCode(addr)

            expect(res.success).toBeTruthy()
            expect(res.httpCode).toEqual(200)
            expect(res.body?.code).toEqual('0x')
        },
    )

    const noPrefix = Object.entries(contractAddresses).map(
        ([name, address]) => [name, address.slice(2)],
    )

    it.each([...Object.entries(contractAddresses), ...noPrefix])(
        'should return the code for %s: %s',
        async function (entry, address) {
            const res = await Node1Client.getAccountCode(address)

            expect(res.success).toEqual(true)
            expect(res.httpCode).toEqual(200)
            expect(res.body?.code?.length).toBeGreaterThan(2)
            expect(HexUtils.isValid(res.body?.code)).toEqual(true)
        },
    )

    it.each([
        'bad address', //not hex
        '0x0001234', //too short
        '0', //too short
        false,
    ])(`should return 400 for invalid address: %s`, async function (addr) {
        const res = await Node1Client.getAccountCode(addr as string)

        expect(res.success).toEqual(false)
        expect(res.httpCode).toEqual(400)
    })
})
