import { abi, keccak256 } from '@vechain/sdk-core'

const errorSelector =
    '0x' + keccak256('Error(string)').toString('hex').slice(0, 8)
const panicSelector =
    '0x' + keccak256('Panic(uint256)').toString('hex').slice(0, 8)

export function decodeRevertReason(data: string): string {
    try {
        if (data.startsWith(errorSelector)) {
            return abi.decode(
                'string',
                '0x' + data.slice(errorSelector.length),
            ) as string
        } else if (data.startsWith(panicSelector)) {
            const decoded = abi.decode(
                'uint256',
                '0x' + data.slice(panicSelector.length),
            ) as string
            return `Panic(0x${parseInt(decoded).toString(16).padStart(2, '0')})`
        }
        return ''
    } catch {
        return ''
    }
}
