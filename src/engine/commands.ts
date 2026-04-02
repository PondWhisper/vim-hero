// ─── Command Registry ─────────────────────────────────────────────────────────
// Metadata-only registry: key → {desc, category}.
// Actual key handling is performed by @replit/codemirror-vim.
// Level configs reference keys from this registry via `commandKeys: string[]`
// so the sidebar cheatsheet never has inline, duplicated descriptions.
//
// To add a new command: append an entry to COMMAND_REGISTRY — no other
// file changes are required.

export interface CommandMeta {
  key:      string;
  desc:     string;
  category: string;
}

// Single source of truth for every Vim command the game teaches.
export const COMMAND_REGISTRY: Record<string, CommandMeta> = {
  // ── Mode switching ────────────────────────────────────────────────────────
  'i':   { key: 'i',   desc: '在光标前进入 Insert 模式',             category: '模式切换' },
  'I':   { key: 'I',   desc: '在行首（非空白）进入 Insert 模式',     category: '模式切换' },
  'a':   { key: 'a',   desc: '在光标后进入 Insert 模式（append）',   category: '模式切换' },
  'A':   { key: 'A',   desc: '在行尾进入 Insert 模式（Append）',     category: '模式切换' },
  'o':   { key: 'o',   desc: '在当前行下方新建行并进入 Insert',       category: '模式切换' },
  'O':   { key: 'O',   desc: '在当前行上方新建行并进入 Insert',       category: '模式切换' },
  'v':   { key: 'v',   desc: '进入 Visual（字符）模式',              category: '模式切换' },
  'V':   { key: 'V',   desc: '进入 Visual（整行）模式',              category: '模式切换' },
  'Esc': { key: 'Esc', desc: '返回 Normal 模式',                    category: '模式切换' },

  // ── Basic navigation ──────────────────────────────────────────────────────
  'h':  { key: 'h',  desc: '向左移动',                              category: '基础移动' },
  'j':  { key: 'j',  desc: '向下移动',                              category: '基础移动' },
  'k':  { key: 'k',  desc: '向上移动',                              category: '基础移动' },
  'l':  { key: 'l',  desc: '向右移动',                              category: '基础移动' },
  '0':  { key: '0',  desc: '跳到行首（第 1 列）',                   category: '基础移动' },
  '$':  { key: '$',  desc: '跳到行尾（最后一个字符）',              category: '基础移动' },
  '^':  { key: '^',  desc: '跳到行首第一个非空白字符',              category: '基础移动' },
  'gg': { key: 'gg', desc: '跳到文件第一行',                        category: '基础移动' },
  'G':  { key: 'G',  desc: '跳到文件最后一行',                      category: '基础移动' },

  // ── Word navigation ───────────────────────────────────────────────────────
  'w':  { key: 'w',  desc: '跳到下一个单词开头',                    category: '单词跳转' },
  'e':  { key: 'e',  desc: '跳到当前/下一个单词结尾',               category: '单词跳转' },
  'b':  { key: 'b',  desc: '跳到上一个单词开头',                    category: '单词跳转' },
  'W':  { key: 'W',  desc: '跳到下一个 WORD 开头（空白分隔）',      category: '单词跳转' },
  'E':  { key: 'E',  desc: '跳到当前/下一个 WORD 结尾',             category: '单词跳转' },
  'B':  { key: 'B',  desc: '跳到上一个 WORD 开头',                  category: '单词跳转' },

  // ── Editing ───────────────────────────────────────────────────────────────
  'x':   { key: 'x',   desc: '删除光标下字符',                       category: '编辑' },
  'X':   { key: 'X',   desc: '删除光标前字符',                       category: '编辑' },
  'dd':  { key: 'dd',  desc: '删除（剪切）整行',                     category: '编辑' },
  'yy':  { key: 'yy',  desc: '复制整行',                             category: '编辑' },
  'p':   { key: 'p',   desc: '在光标后粘贴',                         category: '编辑' },
  'P':   { key: 'P',   desc: '在光标前粘贴',                         category: '编辑' },
  'u':   { key: 'u',   desc: '撤销（Undo）',                         category: '编辑' },
  'r':   { key: 'r',   desc: '替换光标下单个字符',                   category: '编辑' },
  'cw':  { key: 'cw',  desc: '修改当前单词（change word）',          category: '编辑' },
  'ciw': { key: 'ciw', desc: '修改整个单词（change inner word）',    category: '编辑' },
  'ci"': { key: 'ci"', desc: '修改双引号内内容',                     category: '编辑' },
  "ci'": { key: "ci'", desc: '修改单引号内内容',                     category: '编辑' },
  'ci(': { key: 'ci(', desc: '修改括号内内容',                       category: '编辑' },
  '.':   { key: '.',   desc: '重复上一次命令',                        category: '编辑' },

  // ── Search ────────────────────────────────────────────────────────────────
  '/':  { key: '/',  desc: '向前搜索',                               category: '搜索' },
  '?':  { key: '?',  desc: '向后搜索',                               category: '搜索' },
  'n':  { key: 'n',  desc: '跳到下一个匹配',                         category: '搜索' },
  'N':  { key: 'N',  desc: '跳到上一个匹配',                         category: '搜索' },
  'f':  { key: 'f',  desc: '向右查找字符（行内）',                   category: '搜索' },
  'F':  { key: 'F',  desc: '向左查找字符（行内）',                   category: '搜索' },
  't':  { key: 't',  desc: '移动到字符前一格（行内）',               category: '搜索' },
  'T':  { key: 'T',  desc: '向左移动到字符后一格（行内）',           category: '搜索' },
  ';':  { key: ';',  desc: '重复上次 f/F/t/T',                       category: '搜索' },
};

/**
 * Given an array of key names, return corresponding CommandMeta objects.
 * Unknown keys are silently skipped (never throws).
 *
 * @example
 *   resolveCommands(['i', 'Esc'])
 *   // → [{key:'i', desc:'在光标前进入 Insert 模式', category:'模式切换'}, …]
 */
export function resolveCommands(keys: string[]): CommandMeta[] {
  return keys.flatMap(k => {
    const entry = COMMAND_REGISTRY[k];
    return entry ? [entry] : [];
  });
}
