// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 */
contract Storage {

    uint256 private number;

    event StoreEvent(address owner);

    function store(uint256 num) public {
        require(num < 100, "Number must be < 100");

        emit StoreEvent(msg.sender);
        number = num;
    }

    function retrieve() public view returns (uint256){
        return number;
    }
}
