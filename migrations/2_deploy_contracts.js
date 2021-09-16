var SushiIndex = artifacts.require("./sushiIndex.sol");

module.exports = function(deployer) {
  
  deployer.deploy(SushiIndex);
};
