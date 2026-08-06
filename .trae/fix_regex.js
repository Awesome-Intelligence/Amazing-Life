const fs = require('fs');
const path = 'E:/Awesome Intelligence/Amazing Life/src/core/Contacts/ContactManager.ts';
let c = fs.readFileSync(path, 'utf8');

const fixes = [
  // 备注
  [/fileContent\.match\(\/## 备注\\s\*\\n\(\[\\s\\S\]\*\?\)\(?=\\n## \|\n\$\/\);/g,
   "fileContent.match(/## 备注\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);"],
  // 联系方式
  [/fileContent\.match\(\/## 联系方式\\s\*\\n\(\[\\s\\S\]\*\?\)\(?=\\n## \|\n\$\/\);/g,
   "fileContent.match(/## 联系方式\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)/);"],
  // frontmatter 主匹配
  [/content\.match\(\/\^---\\n\(\[\\s\\S\]\*\?\)\\n---\/\);/g,
   "content.match(/^---\\n([\\s\\S]*?)\\n---/);"],
  // split \n
  [/m\[1\]\.split\('\\n'\);/g,
   "m[1].split('\\n');"],
  // 数字检测
  [/\/-\?\\d\+\$\//g, "/-?\\d+$/"],
  // 联系人互动 split
  [/b\.content\.split\('\\n'\);/g,
   "b.content.split('\\n');"],
  // date match
  [/fname\.match\(/(\d\{4\}-\d\{2\}-\d\{2\})/\)/g,
   "fname.match(/(\\d{4}-\\d{2}-\\d{2})/)"]
];
// Actually JS regex \\d in source is 2 chars \\d which in regex = literal \d.
// We want \d which is JS regex for [0-9]. So source needs single \\d in regex.
let fixCount = 0;
for (const [pat, rep] of fixes) {
  const before = c;
  c = c.replace(pat, rep);
  if (c !== before) { fixCount++; console.log('fixed:', pat.toString().substring(0, 60)); }
}
fs.writeFileSync(path, c, 'utf8');
console.log('total fixes:', fixCount);