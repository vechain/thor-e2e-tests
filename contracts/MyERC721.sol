// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyERC721 is ERC721 {
    constructor() ERC721("MyERC721", "MYERC721") {
        for (uint256 i = 0; i < 100; i++) {
            _mint(msg.sender, i);
        }
    }

    function faucet(uint256 tokenId) external {
        _mint(msg.sender, tokenId);
    }

    function mint(address tokenId, uint256 amount) external {
        _mint(tokenId, amount);
    }

    function mintBatch(address[] memory to, uint256[] memory amount) external {
        require(to.length == amount.length, "to and amount length mismatch");
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amount[i]);
        }
    }
}
