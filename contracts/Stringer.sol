// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract Stringer {
    string public text = 'Hello, World!';

    function setText(string memory _text) public {
        text = _text;
    }
}
