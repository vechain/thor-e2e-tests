import { Client } from '../../../src/thor-client'
import {
    getTransferDetails,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import { components } from '../../../src/open-api-types'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'
import { testCase, testCaseEach } from '../../../src/test-case'

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


    testCase(['solo', 'default-private', 'testnet'])(
        'should find a log with all parameters set', async () => {
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

    testCase(['solo', 'default-private', 'testnet'])('should be able to omit all the parameters', async () => {
        const transfer = await readRandomTransfer()

        const response = await Client.raw.queryTransferLogs({
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
        testCase(['solo', 'default-private', 'testnet'])('should be able set the range to null', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: null,
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "from" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    from: undefined,
                },
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "to" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    to: undefined,
                },
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be omit the "unit" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                range: {
                    ...request.range,
                    unit: undefined,
                },
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by time', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by block', async () => {
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
        testCase(['solo', 'default-private', 'testnet'])('should be able omit all the options', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                options: null,
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "offset" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                options: {
                    limit: 1_000,
                    offset: undefined,
                },
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "limit" field', async () => {
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
        })

        testCase(['solo', 'default-private', 'testnet'])('should have default maximum of 1000', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 1001,
                },
            }

            const transferLogs = await Client.raw.queryTransferLogs(request)

            expect(transferLogs.success, 'API response should fail').toBeFalse()
            expect(transferLogs.httpCode, 'Expected HTTP Code').toEqual(403)
        })

        testCase(['solo', 'default-private', 'testnet'])('should have no minimum "limit"', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able paginate requests', async () => {
            const { firstBlock, lastBlock } = await transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalTransfers = pages * amountPerPage

            const query = async (offset: number, limit: number) =>
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
        testCase(['solo', 'default-private', 'testnet'])('should be able query by "sender"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                    },
                ],
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by "recipient"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        recipient: transfer.vet.recipient,
                    },
                ],
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by "txOrigin"', async () => {
            await runTransferLogsTest((request, transfer) => ({
                ...request,
                criteriaSet: [
                    {
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
            }))
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by "sender" and "recipient"', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by "sender" and "txOrigin"', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by "recipient" and "txOrigin"', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by all criteria', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "criteriaSet" field', async () => {
            await runTransferLogsTest((request) => ({
                ...request,
                criteriaSet: null,
            }))
        })
    })

    describe('query by "order"', () => {
        const queryTransferLogsTest = async (order?: 'asc' | 'desc' | null) => {
            const { firstBlock, lastBlock } = await getTransferDetails()

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
                    ? (blockNumbers as number[]).sort((a, b) => a - b)
                    : (blockNumbers as number[]).sort((a, b) => b - a),
            )
        }

        testCase(['solo', 'default-private', 'testnet'])('events should be ordered by DESC', async () => {
            await queryTransferLogsTest('desc')
        })

        testCase(['solo', 'default-private', 'testnet'])('events should be ordered by ASC', async () => {
            await queryTransferLogsTest('asc')
        })

        testCase(['solo', 'default-private', 'testnet'])('default should be asc', async () => {
            await queryTransferLogsTest(undefined)
        })

        testCase(['solo', 'default-private', 'testnet'])('default should be asc', async () => {
            await queryTransferLogsTest(null)
        })
    })
})
