// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SimpleTransfer {
    event TransferInitiated(address indexed txOrigin, address indexed sender, uint256 amount);

    function transfer(address payable recipient, uint256 amount) external payable {
        require(msg.value == amount, "Incorrect amount sent");

        emit TransferInitiated(tx.origin, msg.sender, amount);
        recipient.transfer(amount);
    }
}