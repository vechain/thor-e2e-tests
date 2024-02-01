import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { MyERC20__factory } from '../../../typechain-types'
import { interfaces } from '../../../src/contracts/hardhat'
import { getBlockRef } from '../../../src/utils/block-utils'
import { revisions } from '../../../src/constants'
import { generateAddress, ThorWallet } from '../../../src/wallet'

const CALLER_ADDR = '0x435933c8064b4Ae76bE665428e0307eF2cCFBD68'
const GAS_PAYER = '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'

const SEND_VTHO_AMOUNT = '0x100000'
const SEND_VTHO_CLAUSE = {
    to: contractAddresses.energy,
    value: '0x0',
    data: interfaces.energy.encodeFunctionData('transfer', [
        generateAddress(),
        SEND_VTHO_AMOUNT,
    ]),
}

describe('POST /accounts/*', function () {
    let wallet = ThorWallet.new(true)

    beforeAll(async () => {
        await wallet.waitForFunding()
    })

    it('should execute an array of clauses', async function () {
        const to = generateAddress()

        const tokenAmount = '0x100000'

        const res = await Node1Client.executeAccountBatch({
            clauses: [
                // VET Transfer
                {
                    to: to,
                    value: tokenAmount,
                    data: '0x',
                },
                // VTHO Transfer (Contract Call)
                {
                    to: contractAddresses.energy,
                    value: '0x0',
                    data: interfaces.energy.encodeFunctionData('transfer', [
                        to,
                        tokenAmount,
                    ]),
                },
                // Contract Deployment
                {
                    value: '0x0',
                    data: MyERC20__factory.createInterface().encodeDeploy(),
                },
            ],
            caller: wallet.address,
        })

        expect(res.success).toEqual(true)
        expect(res.httpCode).toEqual(200)
        expect(res.body).toEqual([
            {
                data: '0x',
                events: [],
                transfers: [
                    {
                        sender: wallet.address,
                        recipient: to,
                        amount: tokenAmount,
                    },
                ],
                gasUsed: expect.any(Number),
                reverted: false,
                vmError: '',
            },
            {
                data: '0x0000000000000000000000000000000000000000000000000000000000000001',
                events: [
                    {
                        address: '0x0000000000000000000000000000456e65726779',
                        topics: [
                            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                            `0x000000000000000000000000${wallet.address.slice(2)}`,
                            `0x000000000000000000000000${to.slice(2)}`,
                        ],
                        data: `0x0000000000000000000000000000000000000000000000000000000000${tokenAmount.slice(2)}`,
                    },
                ],
                transfers: [],
                gasUsed: expect.any(Number),
                reverted: false,
                vmError: '',
            },
            {
                data: '0x',
                events: [
                    {
                        address: expect.any(String),
                        topics: [
                            '0xb35bf4274d4295009f1ec66ed3f579db287889444366c03d3a695539372e8951',
                        ],
                        data: expect.any(String),
                    },
                ],
                transfers: [],
                gasUsed: expect.any(Number),
                reverted: false,
                vmError: '',
            },
        ])
    })

    it('should be able to query historic revisions', async () => {
        const request = {
            clauses: [SEND_VTHO_CLAUSE],
            caller: wallet.address,
        }

        // generated wallet had no funds configured in genesis, so this should be reverted
        const historicCall = await Node1Client.executeAccountBatch(request, '0')

        expect(historicCall.success).toEqual(true)
        expect(historicCall.httpCode).toEqual(200)
        expect(historicCall.body?.[0]?.reverted).toEqual(true)

        // generated wallet was funded, so this should be successful
        const currentCall = await Node1Client.executeAccountBatch(
            request,
            'best',
        )

        expect(currentCall.success).toEqual(true)
        expect(currentCall.httpCode).toEqual(200)
        expect(currentCall.body?.[0]?.reverted).toEqual(false)
    })

    it.each(revisions.valid())(
        'should be able execute clauses for valid revision: %s',
        async (revision) => {
            const res = await Node1Client.executeAccountBatch(
                {
                    clauses: [SEND_VTHO_CLAUSE],
                    caller: wallet.address,
                },
                revision,
            )

            expect(res.success).toEqual(true)
            expect(res.httpCode).toEqual(200)
        },
    )

    it.each(revisions.validNotFound)(
        'valid revisions not found: %s',
        async function (revision) {
            const res = await Node1Client.executeAccountBatch(
                {
                    clauses: [SEND_VTHO_CLAUSE],
                    caller: wallet.address,
                },
                revision,
            )

            expect(res.success).toEqual(false)
            expect(res.httpCode).toEqual(400)
        },
    )

    describe('execute with evm fields', () => {
        it('should return the correct block ref', async () => {
            const blockRef = await getBlockRef('1')

            const res = await Node1Client.executeAccountBatch({
                clauses: [
                    {
                        to: contractAddresses.extension,
                        value: '0x0',
                        data: interfaces.extension.encodeFunctionData(
                            'txBlockRef',
                        ),
                    },
                ],
                caller: CALLER_ADDR,
                blockRef,
            })

            expect(res.httpCode).toEqual(200)
            expect(res.success).toEqual(true)
            expect(res.body).toEqual([
                {
                    data: `${blockRef}000000000000000000000000000000000000000000000000`,
                    events: [],
                    gasUsed: expect.any(Number),
                    reverted: false,
                    transfers: [],
                    vmError: '',
                },
            ])
        })

        it('should return the correct gas payer', async () => {
            const requestBody = {
                clauses: [
                    {
                        to: contractAddresses.extension,
                        value: '0x0',
                        data: interfaces.extension.encodeFunctionData(
                            'txGasPayer',
                        ),
                    },
                ],
                caller: CALLER_ADDR,
                gasPayer: GAS_PAYER,
            }

            const res = await Node1Client.executeAccountBatch(requestBody)

            expect(res.httpCode).toEqual(200)
            expect(res.success).toEqual(true)
            expect(res.body).toEqual([
                {
                    data: `0x000000000000000000000000${GAS_PAYER.slice(2)}`,
                    events: [],
                    gasUsed: expect.any(Number),
                    reverted: false,
                    transfers: [],
                    vmError: '',
                },
            ])
        })

        it('should return the correct proved work', async () => {
            const provedWork = '191923'

            const res = await Node1Client.executeAccountBatch({
                clauses: [
                    {
                        to: contractAddresses.extension,
                        value: '0x0',
                        data: interfaces.extension.encodeFunctionData(
                            'txProvedWork',
                        ),
                    },
                ],
                caller: CALLER_ADDR,
                provedWork,
            })

            expect(res.httpCode).toEqual(200)
            expect(res.success).toEqual(true)
            expect(res.body).toEqual([
                {
                    data: '0x000000000000000000000000000000000000000000000000000000000002edb3',
                    events: [],
                    gasUsed: expect.any(Number),
                    reverted: false,
                    transfers: [],
                    vmError: '',
                },
            ])

            const amount = parseInt(res.body?.[0]?.data?.slice(2) ?? '0', 16)
            expect(amount).toEqual(parseInt(provedWork))
        })

        it('should return the correct expiration', async () => {
            const expiration = 13627

            const res = await Node1Client.executeAccountBatch({
                clauses: [
                    {
                        to: contractAddresses.extension,
                        value: '0x0',
                        data: interfaces.extension.encodeFunctionData(
                            'txExpiration',
                        ),
                    },
                ],
                caller: CALLER_ADDR,
                expiration,
            })

            expect(res.httpCode).toEqual(200)
            expect(res.success).toEqual(true)
            expect(res.body).toEqual([
                {
                    data: '0x000000000000000000000000000000000000000000000000000000000000353b',
                    events: [],
                    gasUsed: 388,
                    reverted: false,
                    transfers: [],
                    vmError: '',
                },
            ])

            const amount = parseInt(res.body?.[0]?.data?.slice(2) ?? '0', 16)
            expect(amount).toEqual(expiration)
        })
    })
})
