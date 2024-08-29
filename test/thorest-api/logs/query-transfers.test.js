import { Client } from '../../../src/thor-client'
import {
    readRandomTransfer,
    readTransferDetails,
} from '../../../src/populated-data'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'

const buildRequestFromTransfer = (transfer) => {
    return {
        range: {
            to: transfer.meta.blockNumber,
            from: transfer.meta.blockNumber,
            unit: 'block',
        },
        options: {
            offset: 0,
            limit: 1_000,
        },
        criteriaSet: [
            {
                sender: transfer.vet.sender,
                recipient: transfer.vet.recipient,
            },
        ],
    }
}

/**
 * @group api
 * @group events
 */
describe('POST /logs/transfers', () => {
    const transferDetails = readTransferDetails()

    it.e2eTest('should find a log with all parameters set', 'all', async () => {
        const transfer = await readRandomTransfer()

        const request = buildRequestFromTransfer(transfer)

        const response = await Client.raw.queryTransferLogs(request)

        const relevantLog = response.body?.find(
            (log) => log?.meta?.txID === transfer.meta.txID,
        )

        expect(relevantLog, 'Transfer event should be found').toBeDefined()
        expect(
            relevantLog,
            'Transfer event should have the correct response body',
        ).toEqual({
            sender: transfer.vet.sender,
            recipient: transfer.vet.recipient,
            amount: transfer.vet.amount,
            meta: {
                blockID: expect.stringMatching(HEX_REGEX_64),
                blockNumber: expect.any(Number),
                blockTimestamp: expect.any(Number),
                txID: expect.stringMatching(HEX_REGEX_64),
                txOrigin: transfer.meta.txOrigin,
                clauseIndex: 0,
            },
        })
    })

    it.e2eTest(
        'should be able to omit all the parameters',
        ['solo', 'default-private'],
        async () => {
            const transfer = await readRandomTransfer()

            const response = await Client.raw.queryTransferLogs({
                range: null,
                options: null,
                criteriaSet: null,
            })

            expect(
                response.success,
                'API response should be a success',
            ).toBeTrue()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.txID === transfer.meta.txID,
                ),
                'The response body some contain the relevant log',
            ).toBeTrue()
        },
    )

    const runTransferLogsTest = async (modifyRequest) => {
        const transfer = await readRandomTransfer()
        const request = buildRequestFromTransfer(transfer)

        const modifiedRequest = modifyRequest(request, transfer)

        const response = await Client.raw.queryTransferLogs(modifiedRequest)

        const relevantLog = response.body?.find(
            (log) => log?.meta?.txID === transfer.meta.txID,
        )

        expect(response.success, 'API response should be a success').toBeTrue()
        expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(relevantLog).toBeDefined()
        expect(relevantLog).toEqual({
            sender: transfer.vet.sender,
            recipient: transfer.vet.recipient,
            amount: transfer.vet.amount,
            meta: {
                blockID: expect.stringMatching(HEX_REGEX_64),
                blockNumber: expect.any(Number),
                blockTimestamp: expect.any(Number),
                txID: transfer.meta.txID,
                txOrigin: transfer.meta.txOrigin,
                clauseIndex: 0,
            },
        })
    }

    describe('query by "range"', () => {
        it.e2eTest('should be able set the range to null', 'all', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: null,
            }))
        })

        it.e2eTest(
            'should be able to omit the "from" field',
            'all',
            async () => {
                await runTransferLogsTest((request) => ({
                    ...request,
                    range: {
                        ...request.range,
                        from: undefined,
                    },
                }))
            },
        )

        it.e2eTest('should be able to omit the "to" field', 'all', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    to: undefined,
                },
            }))
        })

        it.e2eTest('should be omit the "unit" field', 'all', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    unit: undefined,
                },
            }))
        })

        it.e2eTest('should be able query by time', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            }))
        })

        it.e2eTest('should be able query by block', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                range: {
                    to: transfer.meta.blockNumber,
                    from: transfer.meta.blockNumber,
                    unit: 'block',
                },
            }))
        })
    })

    describe('query by "options"', () => {
        it.e2eTest('should be able omit all the options', 'all', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                options: null,
            }))
        })

        it.e2eTest(
            'should be able to omit the "offset" field',
            'all',
            async () => {
                await runTransferLogsTest((request) => ({
                    ...request,
                    options: {
                        limit: 1_000,
                        offset: undefined,
                    },
                }))
            },
        )

        it.e2eTest(
            'should be able to omit the "limit" field',
            'all',
            async () => {
                const request = {
                    options: {
                        offset: 0,
                    },
                }

                const transferLogs = await Client.raw.queryTransferLogs(request)

                expect(
                    transferLogs.success,
                    'API response should be a success',
                ).toBeTrue()
                expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(transferLogs.body?.length).toEqual(0)
            },
        )

        it.e2eTest(
            'should have default maximum of 1000',
            ['solo', 'default-private'],
            async () => {
                const request = {
                    options: {
                        offset: 0,
                        limit: 1001,
                    },
                }

                const transferLogs = await Client.raw.queryTransferLogs(request)

                expect(
                    transferLogs.success,
                    'API response should fail',
                ).toBeFalse()
                expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(403)
            },
        )

        it.e2eTest('should have no minimum "limit"', 'all', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 0,
                },
            }

            const transferLogs = await Client.raw.queryTransferLogs(request)

            expect(
                transferLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(transferLogs.body?.length).toEqual(0)
        })

        it.e2eTest('should be able paginate requests', 'all', async () => {
            const { firstBlock, lastBlock } = transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalTransfers = pages * amountPerPage

            const query = async (offset, limit) =>
                Client.raw.queryTransferLogs({
                    range: {
                        from: firstBlock,
                        to: lastBlock,
                        unit: 'block',
                    },
                    options: {
                        offset,
                        limit,
                    },
                    criteriaSet: [],
                })

            const allElements = await query(0, totalTransfers)

            expect(
                allElements.success,
                'API response should be a success',
            ).toBeTrue()
            expect(allElements.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(allElements.body?.length).toEqual(totalTransfers)

            const paginatedTransfers = []

            for (let i = 0; i < pages; i++) {
                const paginatedResponse = await query(
                    paginatedTransfers.length,
                    amountPerPage,
                )

                expect(
                    paginatedResponse.success,
                    'API response should be a success',
                ).toBeTrue()
                expect(
                    paginatedResponse.httpCode,
                    'Expected HTTP Code',
                ).toEqual(200)
                expect(paginatedResponse.body?.length).toEqual(amountPerPage)

                const elements = paginatedResponse.body

                paginatedTransfers.push(...elements)
            }

            expect(allElements.body, 'Expected Response Body').toEqual(
                paginatedTransfers,
            )
        })
    })

    describe('query by "criteriaSet"', () => {
        it.e2eTest('should be able query by "sender"', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                    },
                ],
            }))
        })

        it.e2eTest('should be able query by "recipient"', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        recipient: transfer.vet.recipient,
                    },
                ],
            }))
        })

        it.e2eTest('should be able query by "txOrigin"', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        it.e2eTest(
            'should be able query by "sender" and "recipient"',
            'all',
            async () => {
                await runTransferLogsTest((request, transfer) => ({
                    ...request,
                    criteriaSet: [
                        {
                            sender: transfer.vet.sender,
                            recipient: transfer.vet.recipient,
                        },
                    ],
                }))
            },
        )

        it.e2eTest(
            'should be able query by "sender" and "txOrigin"',
            'all',
            async () => {
                await runTransferLogsTest((request, transfer) => ({
                    ...request,
                    criteriaSet: [
                        {
                            sender: transfer.vet.sender,
                            txOrigin: transfer.meta.txOrigin,
                        },
                    ],
                }))
            },
        )

        it.e2eTest(
            'should be able query by "recipient" and "txOrigin"',
            'all',
            async () => {
                await runTransferLogsTest((request, transfer) => ({
                    ...request,
                    criteriaSet: [
                        {
                            recipient: transfer.vet.recipient,
                            txOrigin: transfer.meta.txOrigin,
                        },
                    ],
                }))
            },
        )

        it.e2eTest('should be able query by all criteria', 'all', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                        recipient: transfer.vet.recipient,
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        it.e2eTest(
            'should be able to omit the "criteriaSet" field',
            'all',
            async () => {
                await runTransferLogsTest((request) => ({
                    ...request,
                    criteriaSet: null,
                }))
            },
        )
    })

    describe('query by "order"', () => {
        const queryTransferLogsTest = async (order) => {
            const { firstBlock, lastBlock } = readTransferDetails()

            const response = await Client.raw.queryTransferLogs({
                range: {
                    from: firstBlock,
                    to: lastBlock,
                    unit: 'block',
                },
                options: {
                    offset: 0,
                    limit: 1_000,
                },
                criteriaSet: [],
                order: order,
            })

            expect(
                response.success,
                'API response should be a success',
            ).toBeTrue()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === firstBlock,
                ),
                'First block should be present',
            ).toBeTrue()
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === lastBlock,
                ),
                'Last block should be present',
            ).toBeTrue()

            const blockNumbers = response.body?.map(
                (log) => log?.meta?.blockNumber,
            )

            expect(blockNumbers, 'The result should be an array').toBeArray()
            expect(
                blockNumbers,
                'The result should be sorted correctly',
            ).toEqual(
                order === 'asc' || order === undefined
                    ? blockNumbers.sort((a, b) => a - b)
                    : blockNumbers.sort((a, b) => b - a),
            )
        }

        it.e2eTest('events should be ordered by DESC', 'all', async () => {
            await queryTransferLogsTest('desc')
        })

        it.e2eTest('events should be ordered by ASC', 'all', async () => {
            await queryTransferLogsTest('asc')
        })

        it.e2eTest('default should be asc', 'all', async () => {
            await queryTransferLogsTest(undefined)
        })

        it.e2eTest('default should be asc', 'all', async () => {
            await queryTransferLogsTest(null)
        })
    })
})
