import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { MyERC20__factory } from '../../../typechain-types'
import {
    generateEmptyWallet,
    generateWalletWithFunds,
    Wallet,
} from '../../../src/wallet'
import { interfaces } from '../../../src/contracts/hardhat'
import { getBlockRef } from '../../../src/utils/block-utils'

const CALLER_ADDR = '0x435933c8064b4Ae76bE665428e0307eF2cCFBD68'
const GAS_PAYER = '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'

describe('POST /accounts/*', function () {
    let wallet: Wallet

    beforeAll(async () => {
        wallet = await generateWalletWithFunds()
    })

    it('should execute an array of clauses', async function () {
        const to = generateEmptyWallet()

        const tokenAmount = '0x100000'

        const res = await Node1Client.executeAccountBatch({
            clauses: [
                // VET Transfer
                {
                    to: to.address,
                    value: tokenAmount,
                    data: '0x',
                },
                // VTHO Transfer (Contract Call)
                {
                    to: contractAddresses.energy,
                    value: '0x0',
                    data: interfaces.energy.encodeFunctionData('transfer', [
                        to.address,
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
                        recipient: to.address,
                        amount: '0x100000',
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
                            `0x000000000000000000000000${to.address.slice(2)}`,
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
