import { Node1Client } from '../../../src/thor-client'
import { generateWalletWithFunds, Wallet } from '../../../src/wallet'
import { sendClauses } from '../../../src/transactions'
import { SimpleCounter__factory } from '../../../typechain-types'
import { addUintPadding } from '../../../src/utils/padding-utils'

describe('GET /accounts/{address}/storage', function () {
    let wallet: Wallet
    let simpleStorageAddress: string

    beforeAll(async () => {
        wallet = await generateWalletWithFunds()

        const txReceipt = await sendClauses(
            [
                {
                    to: null,
                    value: '0x0',
                    data: SimpleCounter__factory.bytecode,
                },
            ],
            wallet.privateKey,
            true,
        )

        expect(txReceipt.outputs[0].contractAddress).toBeTruthy()
        simpleStorageAddress = txReceipt.outputs[0].contractAddress as string
    })

    it.each([1, 100, 100000, 12341234, 98734523])(
        'should return the storage value: %s',
        async function (amount) {
            await sendClauses(
                [
                    {
                        to: simpleStorageAddress,
                        value: '0x0',
                        data: SimpleCounter__factory.createInterface().encodeFunctionData(
                            'setCounter',
                            [amount],
                        ),
                    },
                ],
                wallet.privateKey,
                true,
                true,
            )

            const key =
                '0x0000000000000000000000000000000000000000000000000000000000000000'

            const res = await Node1Client.getAccountStorage(
                simpleStorageAddress,
                key,
            )

            expect(res.success).toEqual(true)
            expect(res.httpCode).toEqual(200)
            expect(res.body?.value).toEqual(addUintPadding(amount))
        },
    )
})
