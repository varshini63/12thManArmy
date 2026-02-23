const InsuranceClaim = artifacts.require("InsuranceClaim");

module.exports = function (deployer) {
  deployer.deploy(InsuranceClaim);
};