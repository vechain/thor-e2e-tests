import { Transaction } from '@vechain/sdk-core'
import { components } from '../../../../src/open-api-types'
import { Response, Schema } from '../../../../src/thor-client'

/**
 * Types
 */
type TestCasePlan = {
    postTxStep: {
        rawTx: string
        expectedResult: (input: any) => void
    }
    getTxStep?: {
        expectedResult: (input: any) => void
    }
    getTxReceiptStep?: {
        expectedResult: (input: any) => void
    },
    getLogTransferStep?: {
        logFilters?: components['schemas']['TransferLogFilterRequest']
        expectedResult: (input: any, block: any) => void
    },
    getTxBlockStep?: {
        expectedResult: (input: any) => void
    }
}

type PostTxExpectedResultBody = Response<Schema['TXID']>
type GetTxExpectedResultBody = Response<Schema['GetTxResponse'] | null>
type GetTxReceiptExpectedResultBody =
    components['schemas']['GetTxReceiptResponse']
type BlockBody = Schema['Block'] & { transactions: Transaction[] }
type GetTxBlockExpectedResultBody = {
    block: Response<BlockBody | null>
    txId: string
}
type GetTxLogBody = Response<Schema['TransferLogsResponse']>

/**
 * Custom error class
 */
class TestCasePlanStepError extends Error {
    constructor(msg: string) {
        super(msg)

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TestCasePlanStepError.prototype)
    }
}

export {
    PostTxExpectedResultBody,
    GetTxExpectedResultBody,
    GetTxReceiptExpectedResultBody,
    GetTxBlockExpectedResultBody,
    GetTxLogBody,
    TestCasePlanStepError,
    TestCasePlan,
}
