// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract GasEstimation {
    event BlockEmitted(uint256 blockNumber);

    mapping(uint256 => string) public blockData1;
    mapping(uint256 => string) public blockData2;
    mapping(uint256 => string) public blockData3;
    mapping(uint256 => string) public blockData4;
    mapping(uint256 => string) public blockData5;
    mapping(uint256 => string) public blockData6;

    uint256 private nextBlock;

    function setNextBlock() public {
        if (nextBlock == block.number) {
            emit BlockEmitted(nextBlock);
        } else {
            // extra storage op here
            nextBlock = block.number;
            emit BlockEmitted(nextBlock);

            // Pointless assignments to increase gas cost based on a condition
            blockData1[nextBlock] = 'data1';
            blockData2[nextBlock] = 'data2';
            blockData3[nextBlock] = 'data3';
            blockData4[nextBlock] = 'data4';
            blockData5[nextBlock] = 'data5';
            blockData6[nextBlock] = 'data6';
        }
    }
}
