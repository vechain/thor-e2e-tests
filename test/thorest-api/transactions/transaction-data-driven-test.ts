import { Node1Client, Schema, Response } from "../../../src/thor-client";
import { components } from "../../../src/open-api-types";
import { pollReceipt } from "../../../src/transactions";
import { Transaction } from "@vechain/sdk-core";
import hexUtils from "../../../src/utils/hex-utils";

class TransactionDataDrivenTest {
    private readonly plan: TestCasePlan

    constructor(plan: TestCasePlan) {
        this.plan = plan
    }

    public async runTestFlow() {
        const txId = await this.postTransaction()

        await this.getTransaction(txId)

        const blockId = await this.getTransactionReceipt(txId)

        await this.getTransactionBlock(blockId, txId)
    }

    private async postTransaction(): Promise<string | undefined> {
        const { rawTx, expectedResult } = this.plan.postTxStep
        const { success, body, httpCode, httpMessage } = await Node1Client.sendTransaction({
            raw: `0x${rawTx}`,
        })

        expectedResult({ success, body, httpCode, httpMessage })

        return body?.id
    }

    private async getTransaction(txId?: string) {
        if (!this.plan.getTxStep) {
            return
        }

        const { expectedResult } = this.plan.getTxStep
        if (!txId) {
            throw new TestCasePlanStepError('getTransaction step expected to execute, but txId is not defined')
        }

        const tx = await Node1Client.getTransaction(txId, {
            pending: true,
        })

        expectedResult(tx)
    }

    private async getTransactionReceipt(txId?: string): Promise<string | undefined> {
        if (!this.plan.getTxReceiptStep) {
            return
        }

        const { expectedResult } = this.plan.getTxReceiptStep
        if (!txId) {
            throw new TestCasePlanStepError('getTransactionReceipt step expected to execute, but txId is not defined')
        }

        const receipt = await pollReceipt(txId)

        expectedResult(receipt)

        return receipt.meta?.blockID
    }

    private async getTransactionBlock(blockId: string | undefined, txId: string | undefined) {
        if (!this.plan.getTxBlockStep) {
            return
        }
        
        const { expectedResult } = this.plan.getTxBlockStep
        if (!blockId || !txId) {
            throw new TestCasePlanStepError('getTransactionBlock step expected to execute, but txId or blockId are not defined')
        }

        const block = await Node1Client.getBlock(blockId)

        expectedResult({block, txId})
    }
}

/** 
 * Types
 */
type TestCasePlan = {
    postTxStep: {
        rawTx: string
        expectedResult: (input: PostTxExpectedResultBody) => void
    };
    getTxStep?: {
        expectedResult: (input: GetTxExpectedResultBody) => void
    };
    getTxReceiptStep?: {
        expectedResult: (input: GetTxReceiptExpectedResultBody) => void
    }
    getTxBlockStep?: {
        expectedResult: (input: GetTxBlockExpectedResultBody) => void
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
type GetTxBlockExpectedResultBody = {
    block: Response<Schema['Block'] | null>,
    txId: string
}

/**
 * Functions to be used in the test plan
 */
const successfulPostTx = ({ success, body, httpCode }: PostTxExpectedResultBody) => {
    expect(success).toBeTrue()
    expect(httpCode).toBe(200)
    expect(body?.id).toBeDefined()
}

const revertedPostTx = ({ success, body, httpCode, httpMessage }: PostTxExpectedResultBody, expectedErrorMsg: string) => {
    expect(success).toBeFalse()
    expect(httpCode).toBe(400)
    expect(httpMessage?.trimEnd()).toEqualCaseInsensitive(expectedErrorMsg)
    expect(body).toBeUndefined()
}

const compareSentTxWithCreatedTx = (sentTx: Response<Schema['GetTxResponse'] | null>, createdTx: Transaction) => {
    expect(sentTx.body).toBeDefined()
    expect(sentTx.success).toBeTrue()
    expect(sentTx.httpCode).toBe(200)

    const { body } = sentTx
    expect(body?.id).toEqual(createdTx.id)
    expect(body?.origin).toEqualCaseInsensitive(createdTx.origin)
    expect(body?.gas).toEqual(createdTx.body.gas)
    expect(body?.clauses).toEqual(createdTx.body.clauses)
    expect(body?.chainTag).toEqual(createdTx.body.chainTag)
    expect(body?.blockRef).toEqual(createdTx.body.blockRef)
    expect(body?.expiration).toEqual(createdTx.body.expiration)
    expect(body?.dependsOn).toEqual(createdTx.body.dependsOn)
    const hexNonce = createdTx.body.nonce.toString(16)
    expect(body?.nonce).toEqual(hexUtils.addPrefix(hexNonce))
    expect(body?.delegator).toEqualCaseInsensitive(createdTx.delegator)
    expect(body?.gasPriceCoef).toEqual(createdTx.body.gasPriceCoef)
}

const successfulReceipt = (receipt: components['schemas']['GetTxReceiptResponse'], createdTx: Transaction) => {
    expect(receipt.reverted).toBeFalse()
    expect(receipt.gasPayer).toBeDefined()
    expect(receipt.gasPayer).toEqualCaseInsensitive(createdTx.delegator)
    expect(receipt.meta?.txID).toEqual(createdTx.id)
    expect(receipt.meta?.txOrigin).toEqualCaseInsensitive(createdTx.origin)
}

const checkTxInclusionInBlock = (input: GetTxBlockExpectedResultBody) => {
    const { block, txId } = input
    const { body, success, httpCode } = block

    expect(success).toBeTrue()
    expect(httpCode).toBe(200)
    expect(body).toBeDefined()

    expect(body?.transactions).toContain(txId)
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
    successfulPostTx,
    revertedPostTx,
    compareSentTxWithCreatedTx,
    successfulReceipt,
    checkTxInclusionInBlock,
    PostTxExpectedResultBody,
    GetTxExpectedResultBody,
    GetTxReceiptExpectedResultBody,
    GetTxBlockExpectedResultBody,
    TestCasePlan,
    TransactionDataDrivenTest
}
