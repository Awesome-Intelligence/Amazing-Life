const fs = require('fs');
const path = 'E:/Awesome Intelligence/Amazing Life/src/core/Contacts/ContactManager.ts';
let c = fs.readFileSync(path, 'utf8');
let n = 0;

// 用简单字符串替换：源码里有 "\\\\n" "\\\\s" "\\\\d" 表示 JS 正则里想要 \n \s \d
// 但因为生成时已经写成 \\n 即字面 \n + n 两个字符，现在要替换为单个 \n

// 简单粗暴：把正则中出现的 \\n 替换为 \n, \\s 替换为 \s, \\d 替换为 \d
// 但只针对 regex literal 上下文

// 安全做法：精确替换每处
const fixes = [
  // 138: ## 备注
  ["const descMatch = fileContent.match(/## 备注\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);",
   "const descMatch = fileContent.match(/## 备注\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);"],
  // 143: ## 联系方式
  ["const infoMatch = fileContent.match(/## 联系方式\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);",
   "const infoMatch = fileContent.match(/## 联系方式\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);"],
  // 191: frontmatter
  ["const m = content.match(/^---\\n([\\s\\S]*?)\\n---/);",
   "const m = content.match(/^---\\n([\\s\\S]*?)\\n---/);"],
  // 193: split
  ["const lines = m[1].split('\\n');",
   "const lines = m[1].split('\\n');"],
  // 207: 数字
  ["if (/^-?\\d+$/.test(value)) { result[key] = Number(value); continue; }",
   "if (/^-?\\d+$/.test(value)) { result[key] = Number(value); continue; }"],
  // 555: 互动 split
  ["const lines = b.content.split('\\n');",
   "const lines = b.content.split('\\n');"],
  // 563: date match
  ["const dateMatch = fname.match(/(\\d{4}-\\d{2}-\\d{2})/);",
   "const dateMatch = fname.match(/(\\d{4}-\\d{2}-\\d{2})/);"]
];

for (const [from, to] of fixes) {
  if (c.includes(from)) { c = c.replace(from, to); n++; console.log('fixed:', from.substring(0, 60)); }
  else { console.log('NOT FOUND:', from.substring(0, 60)); }
}
fs.writeFileSync(path, c, 'utf8');
console.log('total:', n);