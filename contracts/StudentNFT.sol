// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract StudentNFT is ERC721URIStorage, Ownable {
    uint256 public constant mintPrice = 0.01 ether;
    uint256 public constant maxSupply = 100;
    uint256 private _nextTokenId;

    error IncorrectMintPrice(uint256 expected, uint256 received);
    error MaxSupplyReached();
    error OwnershipRenunciationDisabled();

    event Minted(address to, uint256 tokenId, string tokenURI);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {}

    function mint(string calldata uri) external payable {
        if (msg.value != mintPrice) revert IncorrectMintPrice(mintPrice, msg.value);
        if (_nextTokenId >= maxSupply) revert MaxSupplyReached();

        uint256 tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit Minted(msg.sender, tokenId, uri);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function withdraw() external onlyOwner {
        Address.sendValue(payable(owner()), address(this).balance);
    }

    // Keep an owner who can withdraw mint proceeds.
    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }
}
