module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
  },
  'extends': [
    'google',
  ],
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module',
  },
  'rules': {
    // 'max-len': ['error', {'code': 160}],
    'max-len': 'off',
    'require-jsdoc': 'off',
    'no-invalid-this': 'off',
  },
};
