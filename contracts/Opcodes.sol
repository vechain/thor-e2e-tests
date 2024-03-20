// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title OpcodeTests
 * @dev This contract is used to test the different opcodes in the Ethereum Virtual Machine (EVM)
 */

contract OpcodeTests {
    function STOP() public payable {
        assembly {
            stop()
        }
    }

    function ADD(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := add(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function MUL(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := mul(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SUB(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := sub(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function DIV(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := div(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SDIV(int256 x, int256 y) public payable returns (int256) {
        assembly {
            let z := sdiv(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function MOD(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := mod(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SMOD(int256 x, int256 y) public payable returns (int256) {
        assembly {
            let z := smod(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function ADDMOD(uint256 x, uint256 y, uint256 z) public payable returns (uint256) {
        assembly {
            let w := addmod(x, y, z)
            mstore(0x20, w)
            return (0x20, 0x20)
        }
    }

    function MULMOD(uint256 x, uint256 y, uint256 z) public payable returns (uint256) {
        assembly {
            let w := mulmod(x, y, z)
            mstore(0x20, w)
            return (0x20, 0x20)
        }
    }

    function EXP(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := exp(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SIGNEXTEND() public payable returns (uint256) {
        assembly {
        // Load the value from memory
            let value := mload(0x40) // Load the first 32 bytes of memory

        // Extend the value from 16 bits to 32 bits
        // Note: SIGNEXTEND opcode extends the value to 256 bits, so we need to shift it back to 32 bits
            value := signextend(15, value) // Sign-extend the value from 16 to 32 bits

        // Store the extended value back to memory
            mstore(0x40, value)

        // Return the memory pointer
            return (0x40, 0x20)
        }
    }

    function LT(uint256 x, uint256 y) public payable returns (bool) {
        assembly {
            let z := lt(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function GT(uint256 x, uint256 y) public payable returns (bool) {
        assembly {
            let z := gt(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SLT(int256 x, int256 y) public payable returns (bool) {
        assembly {
            let z := slt(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SGT(int256 x, int256 y) public payable returns (bool) {
        assembly {
            let z := sgt(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function EQ(uint256 x, uint256 y) public payable returns (bool) {
        assembly {
            let z := eq(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function ISZERO(uint256 x) public payable returns (bool) {
        assembly {
            let y := iszero(x)
            mstore(0x20, y)
            return (0x20, 0x20)
        }
    }

    function AND(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := and(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function OR(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := or(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function XOR(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := xor(x, y)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function NOT(uint256 x) public payable returns (uint256) {
        assembly {
            let y := not(x)
            mstore(0x20, y)
            return (0x20, 0x20)
        }
    }

    function BYTE(uint256 x, uint256 y) public payable returns (uint256) {
        bytes1 z;
        assembly {
            z := byte(x, y)
        }
        return uint256(uint8(z)); // Casting bytes1 to uint256 via uint8
    }

    function SHL(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := shl(y, x) // Corrected operands order
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SHR(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := shr(y, x) // Corrected operands order
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SAR(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            let z := sar(y, x)
            mstore(0x20, z)
            return (0x20, 0x20)
        }
    }

    function SHA3(bytes memory x) public payable returns (bytes32) {
        bytes32 z;
        assembly {
            z := keccak256(add(x, 0x20), mload(x))
        }
        return z;
    }

    function ADDRESS() public payable returns (address) {
        address z;
        assembly {
            z := address()
        }
        return z;
    }

    function BALANCE(address x) public payable returns (uint256) {
        uint256 z;
        assembly {
            z := balance(x)
        }
        return z;
    }

    function ORIGIN() public payable returns (address) {
        address z;
        assembly {
            z := origin()
        }
        return z;
    }

    function CALLER() public payable returns (address) {
        address z;
        assembly {
            z := caller()
        }
        return z;
    }

    function CALLVALUE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := callvalue()
        }
        return z;
    }

    function CALLDATALOAD(uint256 x) public payable returns (uint256) {
        uint256 z;
        assembly {
            z := calldataload(x)
        }
        return z;
    }

    function CALLDATASIZE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := calldatasize()
        }
        return z;
    }

    function CALLDATACOPY(uint256 x, uint256 y, uint256 z) public payable returns (bytes memory) {
        bytes memory data = new bytes(z);
        assembly {
            calldatacopy(add(data, 0x20), y, z)
        }
        return data;
    }

    function CODESIZE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := codesize()
        }
        return z;
    }

    function CODECOPY(uint256 s, uint256 f, uint256 t) public payable returns (bytes memory) {
        bytes memory data = new bytes(s);
        assembly {
            codecopy(add(data, 0x20), f, t)
        }
        return data;
    }

    function GASPRICE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := gasprice()
        }
        return z;
    }

    function EXTCODESIZE(address x) public payable returns (uint256) {
        uint256 z;
        assembly {
            z := extcodesize(x)
        }
        return z;
    }

    function EXTCODECOPY(address x, uint256 f, uint256 t, uint256 s) public payable returns (bytes memory) {
        bytes memory data = new bytes(s);
        assembly {
            extcodecopy(x, add(data, 0x20), f, t)
        }
        return data;
    }

    function RETURNDATASIZE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := returndatasize()
        }
        return z;
    }

    function RETURNDATACOPY(uint256 x, uint256 y, uint256 z) public payable returns (bytes memory) {
        bytes memory data = new bytes(z);
        assembly {
            returndatacopy(add(data, 0x20), y, z)
        }
        return data;
    }

    function EXTCODEHASH(address x) public payable returns (bytes32) {
        bytes32 z;
        assembly {
            z := extcodehash(x)
        }
        return z;
    }

    function BLOCKHASH(uint256 x) public payable returns (bytes32) {
        bytes32 z;
        assembly {
            z := blockhash(x)
        }
        return z;
    }

    function COINBASE() public payable returns (address) {
        address z;
        assembly {
            z := coinbase()
        }
        return z;
    }

    function TIMESTAMP() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := timestamp()
        }
        return z;
    }

    function NUMBER() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := number()
        }
        return z;
    }

    function PREVRANDAO() public payable returns (bytes32) {
        bytes32 z;
        assembly {
            z := prevrandao()
        }
        return z;
    }

    function GASLIMIT() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := gaslimit()
        }
        return z;
    }

    function CHAINID() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := chainid()
        }
        return z;
    }

    function SELFBALANCE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := selfbalance()
        }
        return z;
    }

    function BASEFEE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := basefee()
        }
        return z;
    }

    function POP(uint256 x) public payable returns (uint256) {
        assembly {
            pop(x)
        }
        return x;
    }

    function MLOAD(uint256 x) public payable returns (uint256) {
        uint256 z;
        assembly {
            z := mload(x)
        }
        return z;
    }

    function MSTORE(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            mstore(x, y)
        }
        return y;
    }

    function MSTORE8(uint256 x, uint8 y) public payable returns (uint8) {
        assembly {
            mstore8(x, y)
        }
        return y;
    }

    function SLOAD(uint256 x) public payable returns (uint256) {
        uint256 z;
        assembly {
            z := sload(x)
        }
        return z;
    }

    function SSTORE(uint256 x, uint256 y) public payable returns (uint256) {
        assembly {
            sstore(x, y)
        }
        return y;
    }

    //TODO
//    function JUMP(uint256 x) public payable {
//        assembly {
//            jump(x)
//        }
//    }
// TODO
//    function JUMPI(uint256 x, uint256 y) public payable {
//        assembly {
//            jumpi(x, y)
//        }
//    }

    //TODO
//    function PC() public payable returns (uint256) {
//        uint256 z;
//        assembly {
//            z := pc()
//        }
//        return z;
//    }

    function MSIZE() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := msize()
        }
        return z;
    }

    function GAS() public payable returns (uint256) {
        uint256 z;
        assembly {
            z := gas()
        }
        return z;
    }

    function JUMPDEST() public payable {
        assembly {
            jumpdest()
        }
    }

    function PUSH1() public payable {
        assembly {
            push1(0x01)
        }
    }

    function PUSH2() public payable {
        assembly {
            push2(0x0102)
        }
    }

    function PUSH3() public payable {
        assembly {
            push3(0x010203)
        }
    }

    function PUSH4() public payable {
        assembly {
            push4(0x01020304)
        }
    }

    function PUSH5() public payable {
        assembly {
            push5(0x0102030405)
        }
    }

    function PUSH6() public payable {
        assembly {
            push6(0x010203040506)
        }
    }

    function PUSH7() public payable {
        assembly {
            push7(0x01020304050607)
        }
    }

    function PUSH8() public payable {
        assembly {
            push8(0x0102030405060708)
        }
    }

    function PUSH9() public payable {
        assembly {
            push9(0x010203040506070809)
        }
    }

    function PUSH10() public payable {
        assembly {
            push10(0x0102030405060708090A)
        }
    }

}
