import { Transaction } from "@vechain/sdk-core";
import { components } from "../../../../src/open-api-types";
import { Response, Schema } from "../../../../src/thor-client";

/** 
 * Types
 */
type TestCasePlan = {
    postTxStep: {
        rawTx: string
        expectedResult: (input: any) => void
    };
    getTxStep?: {
        expectedResult: (input: any) => void
    };
    getTxReceiptStep?: {
        expectedResult: (input: any) => void
    }
    getTxBlockStep?: {
        expectedResult: (input: any) => void
    }
};

type PostTxExpectedResultBody = {
    success: boolean;
    body: any;
    httpCode: number | undefined;
    httpMessage: string | undefined;
}
type GetTxExpectedResultBody = Response<Schema['GetTxResponse'] | null>
type GetTxReceiptExpectedResultBody = components['schemas']['GetTxReceiptResponse']
type BlockBody = Schema['Block'] & { transactions: Transaction[] }
type GetTxBlockExpectedResultBody = {
    block: Response<BlockBody | null>,
    txId: string
}

/**
 * Custom error class
 */
class TestCasePlanStepError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TestCasePlanStepError.prototype);
    }
}


export {
    PostTxExpectedResultBody,
    GetTxExpectedResultBody,
    GetTxReceiptExpectedResultBody,
    GetTxBlockExpectedResultBody,
    TestCasePlanStepError,
    TestCasePlan,
}