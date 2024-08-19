// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SimpleTransfer {
    event TransferInitiated(address indexed txOrigin, address indexed sender, uint256 amount);

    function transfer(address payable recipient) external payable {
        require(msg.value > 0, "Incorrect amount sent");
        emit TransferInitiated(tx.origin, msg.sender, msg.value);
        recipient.transfer(msg.value);
    }
}