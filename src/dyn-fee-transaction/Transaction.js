import * as nc_utils from '@noble/curves/abstract/utils'
import {
    Address,
    Blake2b256,
    BufferKind,
    CompactFixedHexBlobKind,
    Hex,
    HexBlobKind,
    HexUInt,
    NumericKind,
    OptionalFixedHexBlobKind,
    RLPProfiler,
    Secp256k1,
    Units,
    VTHO,
} from '@vechain/sdk-core'
import {
    InvalidDataType,
    InvalidSecp256k1PrivateKey,
    InvalidTransactionField,
    NotDelegatedTransaction,
    UnavailableTransactionField,
} from '@vechain/sdk-errors'

/**
 * @typedef {import('./TransactionBody').DynFeeTransactionBody}
 * @typedef {import('@vechain/sdk-core').TransactionClause}
 */

/**
 * Represents an immutable transaction entity.
 */
class DynFeeTransaction {
    /**
     * A collection of constants used for gas calculations in transactions.
     */
    static GAS_CONSTANTS = {
        TX_GAS: 5000n,
        CLAUSE_GAS: 16000n,
        CLAUSE_GAS_CONTRACT_CREATION: 48000n,
        ZERO_GAS_DATA: 4n,
        NON_ZERO_GAS_DATA: 68n,
    }
    /**
     * Represent the block reference length in bytes.
     */
    static BLOCK_REF_LENGTH = 8
    /**
     * RLP_FIELDS is an array of objects that defines the structure and encoding scheme
     * for various components in a transaction using Recursive Length Prefix (RLP) encoding.
     */
    static RLP_FIELDS = [
        { name: 'chainTag', kind: new NumericKind(1) },
        { name: 'blockRef', kind: new CompactFixedHexBlobKind(8) },
        { name: 'expiration', kind: new NumericKind(4) },
        {
            name: 'clauses',
            kind: {
                item: [
                    {
                        name: 'to',
                        kind: new OptionalFixedHexBlobKind(20),
                    },
                    { name: 'value', kind: new NumericKind(32) },
                    { name: 'data', kind: new HexBlobKind() },
                ],
            },
        },
        { name: 'maxPriorityFeePerGas', kind: new NumericKind(32) },
        { name: 'maxFeePerGas', kind: new NumericKind(32) },
        { name: 'gas', kind: new NumericKind(8) },
        { name: 'dependsOn', kind: new OptionalFixedHexBlobKind(32) },
        { name: 'nonce', kind: new NumericKind(8) },
        { name: 'reserved', kind: { item: new BufferKind() } },
    ]

    /**
     * Represent the Recursive Length Prefix (RLP) of the transaction features.
     */
    static RLP_FEATURES = {
        name: 'reserved.features',
        kind: new NumericKind(4),
    }
    /**
     * Represents a Recursive Length Prefix (RLP) of the transaction signature.
     */
    static RLP_SIGNATURE = {
        name: 'signature',
        kind: new BufferKind(),
    }
    /**
     * Represents a Recursive Length Prefix (RLP) of the signed transaction.
     */
    static RLP_SIGNED_TRANSACTION_PROFILE = {
        name: 'tx',
        kind: DynFeeTransaction.RLP_FIELDS.concat([
            DynFeeTransaction.RLP_SIGNATURE,
        ]),
    }
    /**
     * Represents a Recursive Length Prefix (RLP) of the unsigned transaction.
     */
    static RLP_UNSIGNED_TRANSACTION_PROFILE = {
        name: 'tx',
        kind: DynFeeTransaction.RLP_FIELDS,
    }

    /**
     * Represents the transaction body.
     * @type {DynFeeTransactionBody}
     */
    body

    /**
     * Represents the transaction signature.
     * @type {Uint8Array}
     */
    signature

    /**
     * Creates a new instance of the Transaction class.
     * @param body {DynFeeTransactionBody}
     * @param [signature] {Uint8Array} - optional
     */
    constructor(body, signature) {
        this.body = body
        this.signature = signature
    }

    get gasPayer() {
        if (this.isDelegated) {
            if (this.signature !== undefined) {
                const gasPayer = this.signature.slice(
                    Secp256k1.SIGNATURE_LENGTH,
                    this.signature.length,
                )
                const gasPayerPublicKey = Secp256k1.recover(
                    this.getTransactionHash(this.origin).bytes,
                    gasPayer,
                )
                return Address.ofPublicKey(gasPayerPublicKey)
            }
            throw new UnavailableTransactionField(
                'Transaction.gasPayer()',
                'missing gas payer signature',
                { fieldName: 'gasPayer' },
            )
        }
        throw new NotDelegatedTransaction(
            'Transaction.gasPayer()',
            'not delegated transaction',
            undefined,
        )
    }

    get encoded() {
        return this.encode(this.isSigned)
    }

    get id() {
        if (this.isSigned) {
            return Blake2b256.of(
                nc_utils.concatBytes(
                    this.getTransactionHash().bytes,
                    this.origin.bytes,
                ),
            )
        }
        throw new UnavailableTransactionField(
            'Transaction.id()',
            'not signed transaction: id unavailable',
            { fieldName: 'id' },
        )
    }

    get intrinsicGas() {
        return DynFeeTransaction.intrinsicGas(this.body.clauses)
    }

    get isDelegated() {
        return DynFeeTransaction.isDelegated(this.body)
    }

    get isSigned() {
        if (this.signature !== undefined) {
            return DynFeeTransaction.isSignatureLengthValid(
                this.body,
                this.signature,
            )
        }
        return false
    }

    get origin() {
        if (this.signature !== undefined) {
            return Address.ofPublicKey(
                Secp256k1.recover(
                    this.getTransactionHash().bytes,
                    this.signature.slice(0, Secp256k1.SIGNATURE_LENGTH),
                ),
            )
        }
        throw new UnavailableTransactionField(
            'Transaction.origin()',
            'not signed transaction, no origin',
            { fieldName: 'origin' },
        )
    }

    static decode(rawTransaction, isSigned) {
        const profile = isSigned
            ? DynFeeTransaction.RLP_SIGNED_TRANSACTION_PROFILE
            : DynFeeTransaction.RLP_UNSIGNED_TRANSACTION_PROFILE
        const decodedRLPBody = RLPProfiler.ofObjectEncoded(
            rawTransaction,
            profile,
        ).object
        const bodyWithoutReservedField = {
            blockRef: decodedRLPBody.blockRef,
            chainTag: decodedRLPBody.chainTag,
            clauses: decodedRLPBody.clauses,
            dependsOn: decodedRLPBody.dependsOn,
            expiration: decodedRLPBody.expiration,
            maxPriorityFeePerGas: decodedRLPBody.maxPriorityFeePerGas,
            maxFeePerGas: decodedRLPBody.maxFeePerGas,
            gas: decodedRLPBody.gas,
            nonce: decodedRLPBody.nonce,
        }
        const correctTransactionBody =
            decodedRLPBody.reserved.length > 0
                ? {
                      ...bodyWithoutReservedField,
                      reserved: DynFeeTransaction.decodeReservedField(
                          decodedRLPBody.reserved,
                      ),
                  }
                : bodyWithoutReservedField
        return decodedRLPBody.signature !== undefined
            ? DynFeeTransaction.of(
                  correctTransactionBody,
                  decodedRLPBody.signature,
              )
            : DynFeeTransaction.of(correctTransactionBody)
    }

    /**
     * Calculates the intrinsic gas required for the given transaction clauses.
     *
     * @param {TransactionClause[]} clauses - An array of transaction clauses to calculate the intrinsic gas for.
     * @return {VTHO} The total intrinsic gas required for the provided clauses.
     * @throws {InvalidDataType} If clauses have invalid data as invalid addresses.
     */
    static intrinsicGas(clauses) {
        if (clauses.length > 0) {
            // Some clauses.
            return VTHO.of(
                clauses.reduce((sum, clause) => {
                    if (clause.to !== null) {
                        // Invalid address or no vet.domains name
                        if (
                            !Address.isValid(clause.to) &&
                            !clause.to.includes('.')
                        )
                            throw new InvalidDataType(
                                'Transaction.intrinsicGas',
                                'invalid data type in clause: each `to` field must be a valid address.',
                                { clause },
                            )

                        sum += DynFeeTransaction.GAS_CONSTANTS.CLAUSE_GAS
                    } else {
                        sum +=
                            DynFeeTransaction.GAS_CONSTANTS
                                .CLAUSE_GAS_CONTRACT_CREATION
                    }
                    sum += DynFeeTransaction.computeUsedGasFor(clause.data)
                    return sum
                }, DynFeeTransaction.GAS_CONSTANTS.TX_GAS),
                Units.wei,
            )
        }
        // No clauses.
        return VTHO.of(
            DynFeeTransaction.GAS_CONSTANTS.TX_GAS +
                DynFeeTransaction.GAS_CONSTANTS.CLAUSE_GAS,
            Units.wei,
        )
    }

    /**
     * Return `true` if the transaction body is valid, `false` otherwise.
     *
     * @param {DynFeeTransactionBody} body - The transaction body to validate.
     * @return {boolean} `true` if the transaction body is valid, `false` otherwise.
     */
    static isValidBody(body) {
        return (
            // Chain tag
            body.chainTag !== undefined &&
            body.chainTag >= 0 &&
            body.chainTag <= 255 &&
            // Block reference
            body.blockRef !== undefined &&
            Hex.isValid0x(body.blockRef) &&
            HexUInt.of(body.blockRef).bytes.length ===
                DynFeeTransaction.BLOCK_REF_LENGTH &&
            body.maxFeePerGas !== undefined &&
            body.maxPriorityFeePerGas !== undefined &&
            // Expiration
            body.expiration !== undefined &&
            // Clauses
            body.clauses !== undefined &&
            // Gas
            body.gas !== undefined &&
            // Depends on
            body.dependsOn !== undefined &&
            // Nonce
            body.nonce !== undefined
        )
    }

    /**
     * Creates a new Transaction instance if the provided body is valid.
     *
     * @param {DynFeeTransactionBody} body - The transaction body to be validated.
     * @param {Uint8Array} [signature] - Optional signature.
     * @return {DynFeeTransaction} A new Transaction instance if validation is successful.
     * @throws {InvalidTransactionField} If the provided body is invalid.
     */
    static of(body, signature) {
        if (DynFeeTransaction.isValidBody(body)) {
            return new DynFeeTransaction(body, signature)
        }
        throw new InvalidTransactionField('Transaction.of', 'invalid body', {
            fieldName: 'body',
            body,
        })
    }

    /**
     * Computes the amount of gas used for the given data.
     *
     * @param {string} data - The hexadecimal string data for which the gas usage is computed.
     * @return {bigint} The total gas used for the provided data.
     * @throws {InvalidDataType} If the data is not a valid hexadecimal string.
     *
     * @remarks gas value is expressed in {@link Units.wei} unit.
     */
    static computeUsedGasFor(data) {
        // Invalid data
        if (data !== '' && !Hex.isValid(data))
            throw new InvalidDataType(
                'calculateDataUsedGas()',
                `Invalid data type for gas calculation. Data should be a hexadecimal string.`,
                { data },
            )

        let sum = 0n
        for (let i = 2; i < data.length; i += 2) {
            if (data.substring(i, i + 2) === '00') {
                sum += DynFeeTransaction.GAS_CONSTANTS.ZERO_GAS_DATA
            } else {
                sum += DynFeeTransaction.GAS_CONSTANTS.NON_ZERO_GAS_DATA
            }
        }
        return sum
    }

    /**
     * Decodes the {@link DynFeeTransactionBody.reserved} field from the given buffer array.
     *
     * @param {Buffer[]} reserved  - An array of Uint8Array objects representing the reserved field data.
     * @return {Object} An object containing the decoded features and any unused buffer data.
     * @return {number} [return.features] The decoded features from the reserved field.
     * @return {Buffer[]} [return.unused] An array of Buffer objects representing unused data, if any.
     * @throws {InvalidTransactionField} Thrown if the reserved field is not properly trimmed.
     */
    static decodeReservedField(reserved) {
        // Not trimmed reserved field
        if (reserved[reserved.length - 1].length > 0) {
            // Get features field.
            const featuresField = DynFeeTransaction.RLP_FEATURES.kind
                .buffer(reserved[0], DynFeeTransaction.RLP_FEATURES.name)
                .decode()
            // Return encoded reserved field
            return reserved.length > 1
                ? {
                      features: featuresField,
                      unused: reserved.slice(1),
                  }
                : { features: featuresField }
        }
        throw new InvalidTransactionField(
            'Transaction.decodeReservedField',
            'invalid reserved field: fields in the `reserved` property must be properly trimmed',
            { fieldName: 'reserved', reserved },
        )
    }

    /**
     * Return `true` if the transaction is delegated, else `false`.
     *
     * @param {DynFeeTransactionBody} body - The transaction body.
     * @return {boolean} `true` if the transaction is delegated, else `false`.
     */
    static isDelegated(body) {
        // Check if is reserved or not
        const reserved = body.reserved ?? {}
        // Features
        const features = reserved.features ?? 0
        // Fashion bitwise way to check if a number is even or not
        return (features & 1) === 1
    }

    /**
     * Validates the length of a given signature against the expected length.
     *
     * @param {DynFeeTransactionBody} body - The body of the transaction being validated.
     * @param {Uint8Array} signature - The signature to verify the length of.
     * @return {boolean} Returns true if the signature length matches the expected length, otherwise false.
     */
    static isSignatureLengthValid(body, signature) {
        // Verify signature length
        const expectedSignatureLength = this.isDelegated(body)
            ? Secp256k1.SIGNATURE_LENGTH * 2
            : Secp256k1.SIGNATURE_LENGTH

        return signature.length === expectedSignatureLength
    }

    /**
     * Computes the transaction hash, optionally incorporating a gas payer's address.
     *
     * @param {Address} [gasPayer] - Optional gas payer's address to include in the hash computation.
     * @return {Blake2b256} - The computed transaction hash.
     *
     * @remarks
     * `gasPayer` is used to sign a transaction on behalf of another account.
     *
     * @remarks Security auditable method, depends on
     * - {@link Blake2b256.of}.
     */
    getTransactionHash(gasPayer) {
        const txHash = Blake2b256.of(this.encode(false))
        if (gasPayer !== undefined) {
            return Blake2b256.of(
                nc_utils.concatBytes(txHash.bytes, gasPayer.bytes),
            )
        }
        return txHash
    }

    // ********** PRIVATE FUNCTIONS **********

    /**
     * Signs the transaction using the provided private key of the transaction sender.
     *
     * @param {Uint8Array} senderPrivateKey - The private key used to sign the transaction.
     * @return {DynFeeTransaction} The signed transaction.
     * @throws {InvalidTransactionField} If attempting to sign a delegated transaction.
     * @throws {InvalidSecp256k1PrivateKey} If the provided private key is not valid.
     *
     * @remarks Security auditable method, depends on
     * - {@link Secp256k1.isValidPrivateKey};
     * - {@link Secp256k1.sign}.
     */
    sign(senderPrivateKey) {
        // Check if the private key is valid.
        if (Secp256k1.isValidPrivateKey(senderPrivateKey)) {
            if (!this.isDelegated) {
                // Sign transaction
                const signature = Secp256k1.sign(
                    this.getTransactionHash().bytes,
                    senderPrivateKey,
                )
                // Return new signed transaction.
                return DynFeeTransaction.of(this.body, signature)
            }
            throw new InvalidTransactionField(
                `Transaction.sign`,
                'delegated transaction: use signAsSenderAndGasPayer method',
                { fieldName: 'gasPayer', body: this.body },
            )
        }
        throw new InvalidSecp256k1PrivateKey(
            `Transaction.sign`,
            'invalid private key: ensure it is a secp256k1 key',
            undefined,
        )
    }

    /**
     * Signs a transaction as a gas payer using the provided private key. This is applicable only if the transaction
     * has been marked as delegated and already contains the signature of the transaction sender
     * that needs to be extended with the gas payer's signature.
     *
     * @param {Address} sender - The address of the sender for whom the transaction hash is generated.
     * @param {Uint8Array} gasPayerPrivateKey - The private key of the gas payer. Must be a valid secp256k1 key.
     *
     * @return {DynFeeTransaction} - A new transaction object with the gas payer's signature appended.
     *
     * @throws {InvalidSecp256k1PrivateKey} If the provided gas payer private key is not valid.
     * @throws {InvalidTransactionField} If the transaction is unsigned or lacks a valid signature.
     * @throws {NotDelegatedTransaction} If the transaction is not set as delegated.
     *
     * @remarks Security auditable method, depends on
     * - {@link Secp256k1.isValidPrivateKey};
     * - {@link Secp256k1.sign}.
     */
    signAsGasPayer(sender, gasPayerPrivateKey) {
        if (Secp256k1.isValidPrivateKey(gasPayerPrivateKey)) {
            if (this.isDelegated) {
                if (this.signature !== undefined) {
                    const senderHash = this.getTransactionHash(sender).bytes
                    return new DynFeeTransaction(
                        this.body,
                        nc_utils.concatBytes(
                            // Drop any previous gas payer signature.
                            this.signature.slice(0, Secp256k1.SIGNATURE_LENGTH),
                            Secp256k1.sign(senderHash, gasPayerPrivateKey),
                        ),
                    )
                }
                throw new InvalidTransactionField(
                    'Transaction.signAsGasPayer',
                    'unsigned transaction: use signAsSender method',
                    { fieldName: 'signature' },
                )
            }
            throw new NotDelegatedTransaction(
                'Transaction.signAsGasPayer',
                'not delegated transaction: use sign method',
                undefined,
            )
        }
        throw new InvalidSecp256k1PrivateKey(
            `Transaction.signAsGasPayer`,
            'invalid gas payer private key: ensure it is a secp256k1 key',
            undefined,
        )
    }

    /**
     * Signs a delegated transaction using the provided transaction sender's private key,
     * call the {@link signAsGasPayer} to complete the signature,
     * before such call {@link isDelegated} returns `true` but
     * {@link isSigned} returns `false`.
     *
     * @param senderPrivateKey The private key of the transaction sender, represented as a Uint8Array. It must be a valid secp256k1 private key.
     * @return A new Transaction object with the signature applied, if the transaction is delegated and the private key is valid.
     * @throws NotDelegatedTransaction if the current transaction is not marked as delegated, instructing to use the regular sign method instead.
     * @throws InvalidSecp256k1PrivateKey if the provided senderPrivateKey is not a valid secp256k1 private key.
     *
     * @remarks Security auditable method, depends on
     * - {@link Secp256k1.isValidPrivateKey};
     * - {@link Secp256k1.sign}.
     */
    signAsSender(senderPrivateKey) {
        if (Secp256k1.isValidPrivateKey(senderPrivateKey)) {
            if (this.isDelegated) {
                const transactionHash = this.getTransactionHash().bytes
                return new DynFeeTransaction(
                    this.body,
                    Secp256k1.sign(transactionHash, senderPrivateKey),
                )
            }
            throw new NotDelegatedTransaction(
                'Transaction.signAsSender',
                'not delegated transaction: use sign method',
                undefined,
            )
        }
        throw new InvalidSecp256k1PrivateKey(
            `Transaction.signAsSender`,
            'invalid sender private key: ensure it is a secp256k1 key',
            undefined,
        )
    }

    /**
     * Signs the transaction using both the transaction sender and the gas payer private keys.
     *
     * @param {Uint8Array} senderPrivateKey - The private key of the transaction sender.
     * @param {Uint8Array} gasPayerPrivateKey - The private key of the gas payer.
     * @return {DynFeeTransaction} A new transaction with the concatenated signatures
     * of the transaction sender and the gas payer.
     * @throws {InvalidSecp256k1PrivateKey} - If either the private key of the transaction sender or gas payer is invalid.
     * @throws {NotDelegatedTransaction} - If the transaction is not delegated.
     *
     * @remarks Security auditable method, depends on
     * - {@link Address.ofPublicKey}
     * - {@link Secp256k1.isValidPrivateKey};
     * - {@link Secp256k1.sign}.
     */
    signAsSenderAndGasPayer(senderPrivateKey, gasPayerPrivateKey) {
        // Check if the private key of the sender is valid.
        if (Secp256k1.isValidPrivateKey(senderPrivateKey)) {
            // Check if the private key of the gas payer is valid.
            if (Secp256k1.isValidPrivateKey(gasPayerPrivateKey)) {
                if (this.isDelegated) {
                    const senderHash = this.getTransactionHash().bytes
                    const gasPayerHash = this.getTransactionHash(
                        Address.ofPublicKey(
                            Secp256k1.derivePublicKey(senderPrivateKey),
                        ),
                    ).bytes
                    // Return new signed transaction
                    return DynFeeTransaction.of(
                        this.body,
                        nc_utils.concatBytes(
                            Secp256k1.sign(senderHash, senderPrivateKey),
                            Secp256k1.sign(gasPayerHash, gasPayerPrivateKey),
                        ),
                    )
                }
                throw new NotDelegatedTransaction(
                    'Transaction.signAsSenderAndGasPayer',
                    'not delegated transaction: use sign method',
                    undefined,
                )
            }
            throw new InvalidSecp256k1PrivateKey(
                `Transaction.signAsSenderAndGasPayer`,
                'invalid gas payer private key: ensure it is a secp256k1 key',
                undefined,
            )
        }
        throw new InvalidSecp256k1PrivateKey(
            `Transaction.signAsSenderAndGasPayer`,
            'invalid sender private key: ensure it is a secp256k1 key',
            undefined,
        )
    }

    /**
     * Encodes the transaction body using RLP encoding.
     *
     * @param {boolean} isSigned - Indicates whether the transaction is signed.
     * @return {Uint8Array} The RLP encoded transaction body.
     *
     * @see encoded
     */
    encode(isSigned) {
        // Encode transaction body with RLP
        const encodedBody = this.encodeBodyField(
            {
                // Existing body and the optional `reserved` field if present.
                ...this.body,
                clauses: this.body.clauses,
                reserved: this.encodeReservedField(),
            },
            isSigned,
        )

        // Prepend dynamicFeeTxType if the transaction is signed
        const dynamicFeeTxType = 0x51
        return nc_utils.concatBytes(
            new Uint8Array([dynamicFeeTxType]),
            encodedBody,
        )
    }

    /**
     * Encodes the given transaction body into a Uint8Array, depending on whether
     * the transaction is signed or not.
     *
     * @param body {RLPValidObject} - The transaction object adhering to the RLPValidObject structure.
     * @param isSigned {boolean} - A boolean indicating if the transaction is signed.
     * @return A Uint8Array representing the encoded transaction.
     *
     * @see encoded
     */
    encodeBodyField(body, isSigned) {
        // Encode transaction object - SIGNED
        if (isSigned) {
            return RLPProfiler.ofObject(
                {
                    ...body,
                    signature: Uint8Array.from(this.signature),
                },
                DynFeeTransaction.RLP_SIGNED_TRANSACTION_PROFILE,
            ).encoded
        }
        // Encode transaction object - UNSIGNED
        return RLPProfiler.ofObject(
            body,
            DynFeeTransaction.RLP_UNSIGNED_TRANSACTION_PROFILE,
        ).encoded
    }

    /**
     * Encodes the {@link DynFeeTransactionBody.reserved} field data for a transaction.
     *
     * @return {Uint8Array[]} The encoded list of reserved features.
     * It removes any trailing unused features that have zero length from the list.
     *
     * @remarks The {@link DynFeeTransactionBody.reserved} is optional, albeit
     * is required to perform RLP encoding.
     *
     * @see encode
     */
    encodeReservedField() {
        // Check if is reserved or not
        const reserved = this.body.reserved ?? {}
        // Init kind for features
        const featuresKind = DynFeeTransaction.RLP_FEATURES.kind
        // Features list
        const featuresList = [
            featuresKind
                .data(
                    reserved.features ?? 0,
                    DynFeeTransaction.RLP_FEATURES.name,
                )
                .encode(),
            ...(reserved.unused ?? []),
        ]
        // Trim features list
        while (featuresList.length > 0) {
            if (featuresList[featuresList.length - 1].length === 0) {
                featuresList.pop()
            } else {
                break
            }
        }
        return featuresList
    }
}

export { DynFeeTransaction }
