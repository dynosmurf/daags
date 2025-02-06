module.exports = {
  parser: '@typescript-eslint/parser', // Uses TypeScript parser
  parserOptions: {
    ecmaVersion: 2020, // Allow modern JavaScript features
    sourceType: 'module' // Allow ES module imports
  },
  extends: [
    'eslint:recommended', // Basic ESLint rules
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'plugin:import/recommended', // Import plugin for module resolution
    'plugin:import/typescript' // Import plugin for TypeScript support
  ],
  plugins: ['@typescript-eslint', 'import'], // Enable necessary plugins
  env: {
    browser: true, // Enable browser globals (window, document)
    node: true, // Enable Node.js globals (process, module)
    es2020: true // Enable ES2020 features
  },
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow implicit return types
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about `any` usage

    // Import plugin rules
    'import/no-unresolved': 'error', // Ensure all imports can be resolved
    'import/namespace': 'off',

    // Code style and best practices
    semi: ['error', 'always'], // Enforce semicolons
    quotes: ['error', 'single'], // Enforce single quotes for strings
    'no-console': 'warn', // Warn about console.log
    'no-unused-vars': 'warn', // Warn about unused variables
    eqeqeq: ['error', 'always'], // Enforce strict equality
    curly: 'error', // Enforce curly braces for blocks

    // Enforce consistent formatting
    indent: ['error', 2], // Enforce 2-space indentation
    'linebreak-style': ['error', 'unix'], // Enforce UNIX line breaks (\n)
    'no-trailing-spaces': 'error' // Disallow trailing spaces
    /* TODO: enable conditionally
    'max-len': ['warn', {              // Enforce a maximum line length
      code: 100,                         // Set max line length to 100 characters
      ignoreUrls: true,                  // Ignore URL lines
    }],
    */
  }
}
