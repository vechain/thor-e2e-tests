import { Node1Client } from '../../../src/thor-client'
import {
    getTransferDetails,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import { components } from '../../../src/open-api-types'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'

const buildRequestFromTransfer = (
    transfer: Transfer,
): components['schemas']['TransferLogFilterRequest'] => {
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

type TransferLogFilterRequest =
    components['schemas']['TransferLogFilterRequest']

/**
 * @group api
 * @group events
 */
describe('POST /logs/transfers', () => {
    const transferDetails = getTransferDetails()

    it('should find a log with all parameters set', async () => {
        const transfer = await readRandomTransfer()

        const request = buildRequestFromTransfer(transfer)

        const response = await Node1Client.queryTransferLogs(request)

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

    it('should be able to omit all the parameters', async () => {
        const transfer = await readRandomTransfer()

        const response = await Node1Client.queryTransferLogs({
            range: null,
            options: null,
            criteriaSet: null,
        })

        expect(response.success, 'API response should be a success').toBeTrue()
        expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(
            response.body?.some(
                (log) => log?.meta?.txID === transfer.meta.txID,
            ),
            'The response body some contain the relevant log',
        ).toBeTrue()
    })

    const runTransferLogsTest = async (
        modifyRequest: (
            request: TransferLogFilterRequest,
            transfer: Transfer,
        ) => TransferLogFilterRequest,
    ) => {
        const transfer = await readRandomTransfer()
        const request = buildRequestFromTransfer(transfer)

        const modifiedRequest = modifyRequest(request, transfer)

        const response = await Node1Client.queryTransferLogs(modifiedRequest)

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
        it('should be able set the range to null', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: null,
            }))
        })

        it('should be able to omit the "from" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    from: undefined,
                },
            }))
        })

        it('should be able to omit the "to" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    to: undefined,
                },
            }))
        })

        it('should be omit the "unit" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    unit: undefined,
                },
            }))
        })

        it('should be able query by time', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            }))
        })

        it('should be able query by block', async () => {
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
        it('should be able omit all the options', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                options: null,
            }))
        })

        it('should be able to omit the "offset" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                options: {
                    limit: 1_000,
                    offset: undefined,
                },
            }))
        })

        it('should be able to omit the "limit" field', async () => {
            const request = {
                options: {
                    offset: 0,
                },
            }

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(
                transferLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(transferLogs.body?.length).toEqual(0)
        })

        it('should have default maximum of 1000', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 1001,
                },
            }

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(
                transferLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(transferLogs.body?.length).toBeGreaterThan(0)
        })

        it('should have no minimum "limit"', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 0,
                },
            }

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(
                transferLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(transferLogs.body?.length).toEqual(0)
        })

        it('should be able paginate requests', async () => {
            const { firstBlock, lastBlock } = await transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalTransfers = pages * amountPerPage

            const query = async (offset: number, limit: number) =>
                Node1Client.queryTransferLogs({
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

            const paginatedTransfers: components['schemas']['TransferLogsResponse'][] =
                []

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

                const elements =
                    paginatedResponse.body as components['schemas']['TransferLogsResponse'][]

                paginatedTransfers.push(...elements)
            }

            expect(allElements.body, 'Expected Response Body').toEqual(
                paginatedTransfers,
            )
        })
    })

    describe('query by "criteriaSet"', () => {
        it('should be able query by "sender"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                    },
                ],
            }))
        })

        it('should be able query by "recipient"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        recipient: transfer.vet.recipient,
                    },
                ],
            }))
        })

        it('should be able query by "txOrigin"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        it('should be able query by "sender" and "recipient"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                        recipient: transfer.vet.recipient,
                    },
                ],
            }))
        })

        it('should be able query by "sender" and "txOrigin"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        it('should be able query by "recipient" and "txOrigin"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        recipient: transfer.vet.recipient,
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        it('should be able query by all criteria', async () => {
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

        it('should be able to omit the "criteriaSet" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                criteriaSet: null,
            }))
        })
    })

    describe('query by "order"', () => {
        const queryTransferLogsTest = async (order?: 'asc' | 'desc' | null) => {
            const { firstBlock, lastBlock } = await getTransferDetails()

            const response = await Node1Client.queryTransferLogs({
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
                    ? (blockNumbers as number[]).sort((a, b) => a - b)
                    : (blockNumbers as number[]).sort((a, b) => b - a),
            )
        }

        it('events should be ordered by DESC', async () => {
            await queryTransferLogsTest('desc')
        })

        it('events should be ordered by ASC', async () => {
            await queryTransferLogsTest('asc')
        })

        it('default should be asc', async () => {
            await queryTransferLogsTest(undefined)
        })

        it('default should be asc', async () => {
            await queryTransferLogsTest(null)
        })
    })
})
