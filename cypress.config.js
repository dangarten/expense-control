const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,

  e2e: {
    specPattern: ["cypress/e2e/**/*.cy.js", "e2e/**/*.cy.js"],
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
