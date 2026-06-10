import { defineConfig } from "cypress";
// import codeCoverageTask from "@cypress/code-coverage/task";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8082",
    testIsolation: false,
    viewportWidth: 414,
    viewportHeight: 896,
  },
  allowCypressEnv: false,
});
