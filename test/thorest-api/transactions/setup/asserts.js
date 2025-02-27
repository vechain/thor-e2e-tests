import { Hex } from '@vechain/sdk-core'
import hexUtils from '../../../../src/utils/hex-utils'

/**
 * Functions to be used in the test plan
 */
const successfulPostTx = ({ success, body, httpCode }) => {
    expect(success).toBeTruthy()
    expect(httpCode).toBe(200)
    expect(body?.id).toBeDefined()
}

const revertedPostTx = (
    { success, body, httpCode, httpMessage },
    expectedErrorMsg,
) => {
    expect(success).toBeFalsy()
    expect(httpCode).toBe(400)
    expect(httpMessage?.trimEnd().toLowerCase()).toEqual(
        expectedErrorMsg.toLowerCase(),
    )
    expect(body).toBeUndefined()
}

const compareSentTxWithCreatedTx = (sentTx, createdTx) => {
    expect(sentTx.body).toBeDefined()
    expect(sentTx.success).toBeTruthy()
    expect(sentTx.httpCode).toBe(200)

    const { body } = sentTx
    expect(body?.id).toEqual(createdTx.id.toString())
    expect(body?.origin.toLowerCase()).toEqual(
        createdTx.origin.toString().toLowerCase(),
    )
    expect(body?.gas).toEqual(createdTx.body.gas)
    compareClauses(body?.clauses, createdTx.body.clauses)
    expect(body?.chainTag).toEqual(createdTx.body.chainTag)
    expect(body?.blockRef).toEqual(createdTx.body.blockRef)
    expect(body?.expiration).toEqual(createdTx.body.expiration)
    expect(body?.dependsOn).toEqual(createdTx.body.dependsOn)
    const hexNonce = createdTx.body.nonce.toString(16)
    expect(body?.nonce).toEqual(hexUtils.addPrefix(hexNonce))
    expect(body?.gasPrice).toEqual(createdTx.body.gasPrice)
    if (body?.txType === '0x0') {
        expect(body?.gasPriceCoef).toEqual(createdTx.body.gasPriceCoef)
    } else {
        // TODO: fix the conversion from hex to decimal
        // expect(body?.maxFeePerGas).toEqual(createdTx.body.maxFeePerGas)
        // expect(body?.maxPriorityFeePerGas).toEqual(createdTx.body.maxPriorityFeePerGas)
    }
}

const compareClauses = (sentClauses, createdClauses) => {
    expect(sentClauses).toBeDefined()
    expect(sentClauses).toHaveLength(createdClauses.length)

    sentClauses?.forEach((clause, index) => {
        expect(clause.to).toEqual(createdClauses[index].to)
        expect(clause.data).toEqual(createdClauses[index].data.toString())
        const hexValue = createdClauses[index].value.toString(16)
        expect(clause.value).toEqual(hexUtils.addPrefix(hexValue))
    })
}

const checkDelegatedTransaction = (sentTx, createdTx) => {
    expect(sentTx.body?.delegator.toString().toLowerCase()).toEqual(
        createdTx.delegator.toString().toLowerCase(),
    )
}

const successfulReceipt = (receipt, createdTx) => {
    expect(receipt.reverted).toBeFalsy()
    expect(receipt.gasPayer).toBeDefined()
    expect(receipt.meta?.txID).toEqual(createdTx.id.toString())
    expect(receipt.meta?.txOrigin).toEqual(
        createdTx.origin.toString().toLowerCase(),
    )
}

const unsuccessfulReceipt = (receipt, createdTx) => {
    expect(receipt.reverted).toBeTruthy()
    expect(receipt.gasPayer).toBeDefined()
    expect(receipt.meta?.txID).toEqual(createdTx.id.toString().toLowerCase())
    expect(receipt.meta?.txOrigin).toEqual(
        createdTx.origin.toString().toLowerCase(),
    )
}

const checkDelegatedTransactionReceipt = (receipt, createdTx) => {
    expect(receipt.gasPayer.toLowerCase()).toEqual(
        createdTx.delegator.toString().toLowerCase(),
    )
}

const checkTxInclusionInBlock = (input) => {
    const { block, txId } = input
    const { body, httpCode, success } = block

    expect(success).toBeTruthy()
    expect(httpCode).toBe(200)
    expect(body).toBeDefined()

    expect(body?.transactions).toContain(txId)
}

const checkTransactionLogSuccess = (input, block, tx, transferClauses) => {
    const { success, httpCode, body } = input

    expect(success).toBeTruthy()
    expect(httpCode).toBe(200)
    expect(body).toBeDefined()

    const transferLogs = body?.filter(
        (log) => log?.meta?.txID === Hex.of(tx.id.bytes).toString(),
    )
    expect(transferLogs).toHaveLength(transferClauses.length)

    transferLogs?.forEach((log, index) => {
        expect(log?.sender.toLowerCase()).toEqual(
            tx.origin.toString().toLowerCase(),
        )
        expect(log?.recipient.toLowerCase()).toEqual(
            transferClauses[index].to.toLowerCase(),
        )
        const hexAmount = transferClauses[index].value.toString(16)
        expect(log?.amount).toEqual(hexUtils.addPrefix(hexAmount))

        const meta = log?.meta
        expect(meta?.blockID).toEqual(block.blockID)
        expect(meta?.blockNumber).toEqual(block.blockNumber)
        expect(meta?.blockTimestamp).toEqual(block.blockTimestamp)
        expect(meta?.txID).toEqual(Hex.of(tx.id.bytes).toString())
        expect(meta?.txOrigin).toEqual(Hex.of(tx.origin.bytes).toString())
    })
}

export {
    checkDelegatedTransaction,
    checkDelegatedTransactionReceipt,
    checkTransactionLogSuccess,
    checkTxInclusionInBlock,
    compareSentTxWithCreatedTx,
    revertedPostTx,
    successfulPostTx,
    successfulReceipt,
    unsuccessfulReceipt,
}
