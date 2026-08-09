import tsparser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  ...tseslint.configs.recommendedTypeChecked,
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      // sanitizeHTMLToDom 返回类型的 unsafe assignment
      "@typescript-eslint/no-unsafe-assignment": "off",
      // safeSetHTML 函数调用的 unsafe call
      "@typescript-eslint/no-unsafe-call": "off",
      // frontmatter 对象在模板字符串中的 toString 问题
      "@typescript-eslint/no-base-to-string": "off",
      // await 非 Promise 的情况
      "@typescript-eslint/await-thenable": "off",
      // floating promises（回调中的 promise 未处理）
      "@typescript-eslint/no-floating-promises": "off",
      // misused promises（回调中返回 promise）
      "@typescript-eslint/no-misused-promises": "off",
      // unsafe argument
      "@typescript-eslint/no-unsafe-argument": "off",
      // 不必要的类型断言
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      // 多余的类型联合成员
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // console.log
      "no-console": "off",
      // 空块语句
      "no-empty": "off",
      // 无用转义字符
      "no-useless-escape": "off",
      // any 类型
      "@typescript-eslint/no-explicit-any": "off",
      // 未使用变量
      "@typescript-eslint/no-unused-vars": "off",
      // 使用 createEl 而不是 document.createElement
      "obsidianmd/prefer-create-el": "off",
      // 使用 window.setTimeout
      "obsidianmd/prefer-window-timers": "off",
    },
  },
];
