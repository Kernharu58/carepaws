module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "script",
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^(req|res|next)$" }],
    "no-console": "warn", // structured logging (pino) should be used instead — §11.5
    eqeqeq: ["error", "smart"],
    "no-var": "error",
    "prefer-const": "warn",
  },
  ignorePatterns: ["node_modules/", "coverage/"],
};
