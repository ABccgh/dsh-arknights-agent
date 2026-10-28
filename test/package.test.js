/**
 * dsh-arknights-agent（「明日方舟」智能体预设 bundle）的包完整性离线测试。
 *
 * 只读 bundle 自己的交付文件：package.json / cordis.patch.yml / locale/{zh,en}.json /
 * icon.svg / README.md / .gitignore。不安装 bundle、不改任何文件、不联网。
 *
 * 设计原则：文件缺失时给出「哪个文件缺、在哪个目录」的明确失败，方便 Lead 判断
 * bundle 是否完整（预设激活失败在客户端只显示 broken，这里是最早的完整性防线）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** bundle 根目录（本文件在 <root>/test/ 下）。 */
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 必须存在的交付文件（相对 bundle 根目录）。 */
const REQUIRED_FILES = [
  'package.json',
  'cordis.patch.yml',
  'locale/zh.json',
  'locale/en.json',
  'icon.svg',
  'README.md',
  '.gitignore',
];

/**
 * 预设工具入口 URL 的**形态**（不写死具体用户目录：换机器只需改 cordis.patch.yml）。
 * 要求 `file:///` 绝对路径 + `/lib/preset/index.js` + ESM 缓存标记 `?v=N`。
 */
const PRESET_TOOL_URL_PATTERN = /name:\s*'file:\/\/\/[^']+\/lib\/preset\/index\.js\?v=(\d+)'/;

/** package.json 缓存（每个测试都读一遍没必要）。 */
let cachedPackageJson = null;

/**
 * 读一个必须存在的文件；缺失时用 assert.fail 给出明确信息。
 * @param {string} relative - 相对 bundle 根目录的路径。
 * @returns {Promise<string>} 文件内容（UTF-8）。
 */
async function readRequired(relative) {
  const file = path.join(PACKAGE_ROOT, relative);
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    assert.fail(
      `预设 bundle 不完整：缺少或读不到 ${relative}（预期在 ${PACKAGE_ROOT}；${error?.code ?? error?.message ?? error}）`,
    );
    return '';
  }
}

/**
 * 读一个必须存在的 JSON 文件；解析失败也视为 bundle 损坏。
 * @param {string} relative - 相对路径。
 * @returns {Promise<Record<string, any>>} 解析结果。
 */
async function readJson(relative) {
  const raw = await readRequired(relative);
  try {
    return JSON.parse(raw);
  } catch (error) {
    assert.fail(`${relative} 不是合法 JSON：${error.message}`);
    return {};
  }
}

/**
 * 取 package.json（带缓存）。
 * @returns {Promise<Record<string, any>>} package.json 内容。
 */
async function packageJson() {
  if (cachedPackageJson === null) cachedPackageJson = await readJson('package.json');
  return cachedPackageJson;
}

// —— 完整性守卫 ——

test('bundle: 交付文件齐全（缺任何一个都明确失败）', async () => {
  const missing = [];
  for (const relative of REQUIRED_FILES) {
    try {
      await fs.access(path.join(PACKAGE_ROOT, relative));
    } catch {
      missing.push(relative);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `预设 bundle 不完整，缺少：${missing.join('、')}（目录 ${PACKAGE_ROOT}）`,
  );
  const readme = await readRequired('README.md');
  assert.ok(readme.trim().length > 500, `README.md 内容过短（${readme.trim().length} 字符），应说明用途/安装/工具/排障`);
});

// —— package.json ——

test('package.json: 名称/版本/私有/ESM/bundle 声明', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.name, '@local/arknights-agent');
  assert.equal(pkg.version, '0.1.0');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.description.length > 40, true, 'description 应说明这是什么 bundle');
  assert.match(pkg.description, /Arknights operations agent/);
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml');
  assert.equal(pkg.scripts?.test, 'node --test "test/*.test.js"');
});

test('package.json: files 覆盖 patch/locale/icon/README，exports 暴露 locale 与 icon', async () => {
  const pkg = await packageJson();
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  for (const required of ['cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md']) {
    assert.ok(files.includes(required), `package.json files 缺少 ${required}（实际：${files.join(', ')}）`);
  }
  const exports = pkg.exports ?? {};
  assert.equal(exports['./locale/*.json'], './locale/*.json');
  assert.equal(exports['./icon'], './icon.svg');
  assert.equal(exports['./package.json'], './package.json');
  assert.equal(exports['.'], undefined, 'bundle 没有自己的 JS，不应有 "." 入口');
});

test('package.json: meta.title 为「明日方舟」，meta.description 提到 7 个查询排查工具', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.meta?.title, '明日方舟');
  assert.equal(typeof pkg.meta?.description, 'string');
  assert.match(pkg.meta.description, /7 个查询排查工具/);
  assert.match(pkg.meta.description, /关卡、作业站、截图、设备、游戏、模拟器、日志/);
});

// —— cordis.patch.yml ——

test('cordis.patch.yml: 预设行关键字段', async () => {
  const yaml = await readRequired('cordis.patch.yml');
  assert.match(yaml, /^[ ]*- id: preset-arknights$/m, '缺少预设行 id: preset-arknights');
  assert.match(yaml, /^[ ]*name: '@deepseek-ai\/dsh-agent-preset'$/m, '预设行 name 应为 @deepseek-ai/dsh-agent-preset');
  assert.match(yaml, /^[ ]*id: arknights$/m, '缺少预设 config.id: arknights');
  assert.match(yaml, /^[ ]*name: 明日方舟$/m, '缺少预设显示名「明日方舟」');
  assert.match(yaml, /^[ ]*order: 6$/m, '预设 order 应为 6');
  assert.match(yaml, /^[ ]*description: 打关卡\/推关\/肉鸽/m, '缺少预设 description');
});

test('cordis.patch.yml: 预设工具入口 URL 与全局工具白名单', async () => {
  const yaml = await readRequired('cordis.patch.yml');
  // 入口必须是 file:// 绝对路径 + /lib/preset/index.js + ESM 缓存标记 `?v=N`
  // （改 lib/preset 后要 bump，所以这里只校验形态，不写死具体用户目录）
  const entry = PRESET_TOOL_URL_PATTERN.exec(yaml);
  assert.ok(entry !== null, "缺少预设工具入口（形态应为 name: 'file:///<安装路径>/lib/preset/index.js?v=N'）");
  assert.ok(Number(entry[1]) >= 1, 'ESM 缓存标记 ?v= 必须是 >= 1 的整数');
  assert.match(yaml, /^[ ]*- id: arknights-preset-tools$/m, '缺少 arknights-preset-tools 工具行');
  assert.ok(yaml.includes("name: '@deepseek-ai/dsh-agent-preset'"), '缺少预设行 name');
  // 白名单必须挂在 allowGlobalToolPrefixes 下，且正好是 ark_ / prts_ / input_
  const block = /allowGlobalToolPrefixes:\s*\r?\n((?:[ ]+- \S+\r?\n)+)/.exec(yaml);
  assert.ok(block !== null, '缺少 allowGlobalToolPrefixes 列表');
  const prefixes = [...block[1].matchAll(/- (\S+)/g)].map((match) => match[1]);
  assert.deepEqual(prefixes, ['ark_', 'prts_', 'input_']);
});

test('cordis.patch.yml: base 插件行与默认工具行结构完整', async () => {
  const yaml = await readRequired('cordis.patch.yml');
  for (const pluginId of [
    'persona',
    'agent-instructions',
    'time-context',
    'tool-bash',
    'tool-pwsh',
    'tool-fs',
    'tool-fs-search',
    'tool-jobs',
    'skill-filesystem',
    'tool-skill',
    'tool-todo',
    'tool-ask-user',
    'tool-web',
    'present',
    'planning',
    'compaction',
  ]) {
    assert.match(yaml, new RegExp(`^[ ]*- id: ${pluginId}$`, 'm'), `缺少 base 插件行 ${pluginId}`);
  }
  // Windows 上 bash 关、pwsh 开（Loader 的 !!js 表达式）
  assert.ok(yaml.includes("disabled: !!js process.platform === 'win32'"), 'tool-bash 应仅在非 Windows 启用');
  assert.ok(yaml.includes("disabled: !!js process.platform !== 'win32'"), 'tool-pwsh 应仅在 Windows 启用');
  // plan mode / compaction 两组
  assert.match(yaml, /^[ ]*planMode: true$/m);
  assert.match(yaml, /^[ ]*compaction: true$/m);
  assert.match(yaml, /Exit plan mode|exit_plan_mode/, 'plan-mode section 文本应存在');
});

test('cordis.patch.yml: persona 覆盖 9 条硬规则的关键约束', async () => {
  const yaml = await readRequired('cordis.patch.yml');
  for (const phrase of [
    'ark_status',
    'confirm=true',
    'difficulty=tough',
    'medicine',
    'useSanityPotion',
    'stars=3',
    'ark_push',
    'ark_rogue',
    'ark_screen',
    'ark_log',
    'ark_device',
    'ark_emulator',
    'skill',
  ]) {
    assert.ok(yaml.includes(phrase), `persona 缺少关键约束：${phrase}`);
  }
});

// —— locale ——

test('locale/zh.json: meta 与 package.json meta 完全一致', async () => {
  const pkg = await packageJson();
  const zh = await readJson('locale/zh.json');
  assert.deepEqual(zh, {
    meta: { title: pkg.meta.title, description: pkg.meta.description },
  });
});

test('locale/en.json: 英文标题/描述齐备且与中文不同', async () => {
  const pkg = await packageJson();
  const en = await readJson('locale/en.json');
  assert.equal(en.meta?.title, 'Arknights');
  assert.equal(typeof en.meta?.description, 'string');
  assert.match(en.meta.description, /^Arknights operations agent:/);
  assert.notEqual(en.meta.description, pkg.meta.description);
});

// —— icon ——

test('icon.svg: 是合法的 SVG 外壳（64×64，去 BOM 后以 <svg 开头）', async () => {
  const raw = await readRequired('icon.svg');
  const svg = raw.replace(/^\uFEFF/, '').trim();
  assert.ok(svg.startsWith('<svg'), `icon.svg 应以 <svg 开头，实际开头：${svg.slice(0, 40)}`);
  assert.ok(svg.includes('</svg>'), 'icon.svg 缺少 </svg>');
  assert.match(svg, /viewBox="0 0 64 64"/, 'icon.svg 应为 64×64 视图');
  assert.doesNotMatch(svg, /<text[\s>]/, 'icon.svg 不应包含文字元素');
  assert.doesNotMatch(svg, /href="https?:/, 'icon.svg 不应引用外部资源');
});

// —— README ——

test('README.md: 说明预设/安装/工具/排障这几个关键面向', async () => {
  const readme = await readRequired('README.md');
  for (const phrase of [
    'install_bundle',
    'arknights-preset-activation.json',
    '7 个',
    '白名单',
    '?v=',
  ]) {
    assert.ok(readme.includes(phrase), `README.md 缺少关键说明：${phrase}`);
  }
});
