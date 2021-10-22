var CryptoIndex = artifacts.require("./CryptoIndexBinance.sol");

module.exports = function(deployer) {
  
  deployer.deploy(CryptoIndex);
};
