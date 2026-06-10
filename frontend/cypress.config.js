import { defineConfig } from "cypress";
import coverageTask from "@cypress/code-coverage/task";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      coverageTask(on, config);
      return config;
    },
  },
});
