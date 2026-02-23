module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7550, // Ganache port
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000000
    }
  },
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true   // ✅ Enables IR-based compilation to fix "stack too deep"
      }
    }
  },
  db: {
    enabled: false
  }
};
