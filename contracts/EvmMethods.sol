// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract EvmMethods {

    function getBlockHash(uint blockNumber) public view returns (bytes32) {
        return blockhash(blockNumber);
    }

    function getBaseFee() public view returns (uint) {
        return block.basefee;
    }

    function getChainId() public view returns (uint) {
        return block.chainid;
    }

    function getCoinbase() public view returns (address payable) {
        return block.coinbase;
    }

    function getBlockDifficulty() public view returns (uint) {
        return block.difficulty;
    }
    
    function getGasLimit() public view returns (uint) {
        return block.gaslimit;
    }

    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    function getPrevRandao() public view returns (uint) {
        return block.prevrandao;
    }

    function getTimestamp() public view returns (uint) {
        return block.timestamp;
    }

    function getGasLeft() public view returns (uint) {
        return gasleft();
    }

    function getMsgData() public pure returns (bytes memory) {
        return msg.data;
    }

    function getMsgSender() public view returns (address) {
        return msg.sender;
    }

    function getMsgSig() public pure returns (bytes4) {
        return msg.sig;
    }

    function getMsgValue() public payable returns (uint) {
        return msg.value;
    }

    function getTxGasPrice() public view returns (uint) {
        return tx.gasprice;
    }

    function getTxOrigin() public view returns (address) {
        return tx.origin;
    }

    function getContractAddress() public view returns (address) {
        return address(this);
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getCurrentTimestamp() public view returns (uint) {
        return block.timestamp;
    }

    function requireCondition(bool condition, string memory message) public pure {
        require(condition, message);
    }

    function assertCondition(bool condition) public pure {
        assert(condition);
    }

    function revertWithMessage(string memory message) public pure {
        revert(message);
    }

    function callExternalFunction(address target, bytes memory data) public returns (bool, bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        return (success, result);
    }

    function delegateCallExternalFunction(address target, bytes memory data) public returns (bool, bytes memory) {
        (bool success, bytes memory result) = target.delegatecall(data);
        return (success, result);
    }

    function encodeData(uint256 value) public pure returns (bytes memory) {
        return abi.encode(value);
    }

    function decodeData(bytes memory data) public pure returns (uint256) {
        (uint256 value) = abi.decode(data, (uint256));
        return value;
    }

    function calculateKeccak256(bytes memory data) public pure returns (bytes32) {
        return keccak256(data);
    }

}
