const PREFIX = '0x'
const PREFIX_REGEX = /^0x/
export const HEX_REGEX = /^(0x)?[a-fA-F0-9]*$/

export const HEX_AT_LEAST_1 = /^(0x)?[a-fA-F0-9]+$/

// Can be used to match a 16 character hex string with or without the hex prefix, eg. Block Ref
export const HEX_REGEX_16 = /^(0x)?[a-fA-F0-9]{16}$/

// Can be used to match a 40 character hex string with or without the hex prefix, eg. Account Address
export const HEX_REGEX_40 = /^(0x)?[a-fA-F0-9]{40}$/

// Can be used to match a 64 character hex string with or without the hex prefix, eg. Block ID
export const HEX_REGEX_64 = /^(0x)?[a-fA-F0-9]{64}$/

/**
 * Returns the provided hex string with the hex prefix removed.
 * If the prefix doesn't exist the hex is returned unmodified
 * @param hex - the input hex string
 * @returns the input hex string with the hex prefix removed
 * @throws an error if the input is not a valid hex string
 */
const removePrefix = (hex: string): string => {
    validate(hex)
    return hex.replace(PREFIX_REGEX, '')
}

/**
 * Returns the provided hex string with the hex prefix added.
 * If the prefix already exists the string is returned unmodified.
 * If the string contains an UPPER case `X` in the prefix it will be replaced with a lower case `x`
 * @param hex - the input hex string
 * @returns the input hex string with the hex prefix added
 * @throws an error if the input is not a valid hex string
 */
const addPrefix = (hex: string): string => {
    validate(hex)
    return PREFIX_REGEX.test(hex)
        ? hex.replace(PREFIX_REGEX, PREFIX)
        : `${PREFIX}${hex}`
}

/**
 * Validate the hex string. Throws an Error if not valid
 * @param hex - the input hex string
 * @throws an error if the input is not a valid hex string
 */
const validate = (hex: string) => {
    if (!isValid(hex)) throw Error('Provided hex value is not valid')
}

/**
 * Check if input string is valid
 * @param hex - the input hex string
 * @returns boolean representing whether the input hex is valid
 */
const isValid = (hex?: string | null): boolean => {
    return !!hex && HEX_REGEX.test(hex)
}

const isInvalid = (hex?: string | null): boolean => {
    return !isValid(hex)
}

const normalize = (hex: string): string => {
    return addPrefix(hex.toLowerCase().trim())
}

const compare = (hex1: string, hex2: string): boolean => {
    try {
        return (
            removePrefix(hex1).toLowerCase() ===
            removePrefix(hex2).toLowerCase()
        )
    } catch (e) {
        return false
    }
}

export default {
    removePrefix,
    addPrefix,
    validate,
    isValid,
    isInvalid,
    normalize,
    compare,
}
