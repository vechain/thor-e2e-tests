// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract AuthorizeTransaction {
    bool private authorized = false;
    bool public paid = false;

    function authorize() external {
        authorized = true;
    }

    function pay() external {
        require(authorized, 'Not authorized');
        paid = true;
    }
}
