/**
 * Simple type for transaction clause.
 */
interface TransactionClause {
    /**
     * Destination address where:
     * * transfer token to or
     * * invoke contract method on.
     *
     * @note Set null destination to deploy a contract.
     */
    to: string | null

    /**
     * Amount of token to transfer to the destination
     */
    value: string | number

    /**
     * Input data for contract method invocation or deployment
     */
    data: string
}

export type { TransactionClause }
