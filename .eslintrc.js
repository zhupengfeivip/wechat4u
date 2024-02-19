module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    //为统一风格，不允许;结尾，--fix可以自动删除
    semi: ['error', 'never'],
    //允许使用any类型
    '@typescript-eslint/no-explicit-any': ['off'],
    // disable the rule for all files
    "@typescript-eslint/explicit-module-boundary-types": "off",
    'no-restricted-syntax': [
      'off',
      {
        selector: 'TSAnyKeyword',
        message: '不推荐使用any类型. 建议指定更具体的对象类型',
      },
    ],
  },
}
