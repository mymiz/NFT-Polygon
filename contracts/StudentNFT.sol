// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract StudentNFT is ERC721URIStorage {
    uint256 private _nextTokenId;

    event Minted(address to, uint256 tokenId, string tokenURI);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(string calldata uri) external {
        uint256 tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit Minted(msg.sender, tokenId, uri);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
