import { Transaction, TransactionClause } from '@vechain/sdk-core'
import { components } from '../../../../src/open-api-types'
import { Response, Schema } from '../../../../src/thor-client'
import hexUtils from '../../../../src/utils/hex-utils'
import {
    GetTxBlockExpectedResultBody,
    GetTxLogBody,
    PostTxExpectedResultBody,
} from './models'

/**
 * Functions to be used in the test plan
 */
const successfulPostTx = ({
    success,
    body,
    httpCode,
}: PostTxExpectedResultBody) => {
    expect(success).toBeTrue()
    expect(httpCode).toBe(200)
    expect(body?.id).toBeDefined()
}

const revertedPostTx = (
    { success, body, httpCode, httpMessage }: PostTxExpectedResultBody,
    expectedErrorMsg: string,
) => {
    expect(success).toBeFalse()
    expect(httpCode).toBe(400)
    expect(httpMessage?.trimEnd()).toEqualCaseInsensitive(expectedErrorMsg)
    expect(body).toBeUndefined()
}

const compareSentTxWithCreatedTx = (
    sentTx: Response<Schema['GetTxResponse'] | null>,
    createdTx: Transaction,
) => {
    expect(sentTx.body).toBeDefined()
    expect(sentTx.success).toBeTrue()
    expect(sentTx.httpCode).toBe(200)

    const { body } = sentTx
    expect(body?.id).toEqual(createdTx.id)
    expect(body?.origin).toEqualCaseInsensitive(createdTx.origin)
    expect(body?.gas).toEqual(createdTx.body.gas)
    compareClauses(body?.clauses, createdTx.body.clauses)
    expect(body?.chainTag).toEqual(createdTx.body.chainTag)
    expect(body?.blockRef).toEqual(createdTx.body.blockRef)
    expect(body?.expiration).toEqual(createdTx.body.expiration)
    expect(body?.dependsOn).toEqual(createdTx.body.dependsOn)
    const hexNonce = createdTx.body.nonce.toString(16)
    expect(body?.nonce).toEqual(hexUtils.addPrefix(hexNonce))
    expect(body?.gasPriceCoef).toEqual(createdTx.body.gasPriceCoef)
}

const compareClauses = (
    sentClauses: components['schemas']['Clause'][] | undefined,
    createdClauses: Transaction['body']['clauses'],
) => {
    expect(sentClauses).toBeDefined()
    expect(sentClauses).toHaveLength(createdClauses.length)

    sentClauses?.forEach((clause, index) => {
        expect(clause.to).toEqualCaseInsensitive(createdClauses[index].to!)
        expect(clause.data).toEqual(createdClauses[index].data.toString())
        const hexValue = createdClauses[index].value.toString(16)
        expect(clause.value).toEqual(hexUtils.addPrefix(hexValue))
    })
}

const checkDelegatedTransaction = (
    sentTx: Response<Schema['GetTxResponse'] | null>,
    createdTx: Transaction,
) => {
    expect(sentTx.body?.delegator).toEqualCaseInsensitive(createdTx.delegator)
}

const successfulReceipt = (
    receipt: components['schemas']['GetTxReceiptResponse'],
    createdTx: Transaction,
) => {
    expect(receipt.reverted).toBeFalse()
    expect(receipt.gasPayer).toBeDefined()
    expect(receipt.meta?.txID).toEqual(createdTx.id)
    expect(receipt.meta?.txOrigin).toEqualCaseInsensitive(createdTx.origin)
}

const unsuccessfulReceipt = (
    receipt: components['schemas']['GetTxReceiptResponse'],
    createdTx: Transaction,
) => {
    expect(receipt.reverted).toBeTrue()
    expect(receipt.gasPayer).toBeDefined()
    expect(receipt.meta?.txID).toEqual(createdTx.id)
    expect(receipt.meta?.txOrigin).toEqualCaseInsensitive(createdTx.origin)
}

const checkDelegatedTransactionReceipt = (
    receipt: components['schemas']['GetTxReceiptResponse'],
    createdTx: Transaction,
) => {
    expect(receipt.gasPayer).toEqualCaseInsensitive(createdTx.delegator)
}

const checkTxInclusionInBlock = (input: GetTxBlockExpectedResultBody) => {
    const { block, txId } = input
    const { body, httpCode, success } = block

    expect(success).toBeTrue()
    expect(httpCode).toBe(200)
    expect(body).toBeDefined()

    expect(body?.transactions).toContain(txId)
}

const checkTransactionLogSuccess = (
    input: GetTxLogBody,
    block: components['schemas']['ReceiptMeta'],
    tx: Transaction,
    transferClauses: TransactionClause[],
) => {
    const { success, httpCode, body } = input

    expect(success).toBeTrue()
    expect(httpCode).toBe(200)
    expect(body).toBeDefined()

    const transferLogs = body?.filter((log) => log?.meta?.txID === tx.id)
    expect(transferLogs).toHaveLength(transferClauses.length)

    transferLogs?.forEach((log, index) => {
        expect(log?.sender).toEqualCaseInsensitive(tx.origin)
        expect(log?.recipient).toEqualCaseInsensitive(
            transferClauses[index].to!,
        )
        const hexAmount = transferClauses[index].value.toString(16)
        expect(log?.amount).toEqual(hexUtils.addPrefix(hexAmount))

        const meta = log?.meta
        expect(meta?.blockID).toEqual(block.blockID)
        expect(meta?.blockNumber).toEqual(block.blockNumber)
        expect(meta?.blockTimestamp).toEqual(block.blockTimestamp)
        expect(meta?.txID).toEqual(tx.id)
        expect(meta?.txOrigin).toEqualCaseInsensitive(tx.origin)
    })
}

export {
    successfulPostTx,
    revertedPostTx,
    compareSentTxWithCreatedTx,
    checkDelegatedTransaction,
    successfulReceipt,
    checkDelegatedTransactionReceipt,
    checkTxInclusionInBlock,
    checkTransactionLogSuccess,
    unsuccessfulReceipt,
}
