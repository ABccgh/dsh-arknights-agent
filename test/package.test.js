/**
 * dsh-arknights-agent（「明日方舟」智能体预设 bundle，1.0.0）的包完整性离线测试。
 *
 * 只读 bundle 自己的交付文件：package.json / cordis.patch.yml / locale/{zh,en}.json /
 * icon.svg / README.md / .gitignore / DO-NOT-DELETE.txt。不安装 bundle、不改任何文件、不联网。
 *
 * 设计原则：文件缺失或 patch 与 1.0.0 工具面（13 全局 + 2 预设 + 10 PRTS）不一致时，
 * 给出「哪个文件/哪段文本不对」的明确失败——预设激活失败在客户端只显示 broken，这里是最早的防线。
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
  'DO-NOT-DELETE.txt',
];

/** 1.0.0 预设工具入口的完整形态（安装路径与 ?v=3 都是发布契约的一部分）。 */
const PRESET_TOOL_URL = "name: 'file:///C:/Users/11210/dsh-bundles/arknights/lib/preset/index.js?v=3'";

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

/** 取 patch 文本（多处断言复用）。 */
async function readPatch() {
  return readRequired('cordis.patch.yml');
}

/** 取 persona 前缀文本（从 `prefix: |` 到下一个同级 `- id:`）。 */
async function personaText() {
  const yaml = await readPatch();
  const start = yaml.indexOf('prefix: |');
  assert.ok(start > 0, 'cordis.patch.yml 缺少 persona 的 prefix: |');
  const rest = yaml.slice(start);
  const end = rest.indexOf('\n          - id: agent-instructions');
  assert.ok(end > start, 'persona 区块后应紧跟 agent-instructions 行');
  return rest.slice(0, end);
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
  assert.deepEqual(missing, [], `预设 bundle 不完整，缺少：${missing.join('、')}（目录 ${PACKAGE_ROOT}）`);
  const readme = await readRequired('README.md');
  assert.ok(readme.trim().length > 1500, `README.md 内容过短（${readme.trim().length} 字符），应说明安装/预设/工具/白名单/排障`);
});

// —— package.json ——

test('package.json: 名称/版本 1.0.0/私有/ESM/bundle 声明', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.name, '@local/arknights-agent');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
  assert.ok(pkg.description.length > 80, 'description 应说明这是什么 bundle 与工具面');
  assert.match(pkg.description, /Arknights operations agent/);
  assert.match(pkg.description, /ark_diag/);
  assert.match(pkg.description, /ark_solutions/);
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

test('package.json: meta.title 为「明日方舟」，description 与新工具面一致（2 预设 + 13 全局）', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.meta?.title, '明日方舟');
  assert.equal(typeof pkg.meta?.description, 'string');
  assert.match(pkg.meta.description, /2 个/);
  assert.match(pkg.meta.description, /ark_diag\/ark_solutions/);
  assert.match(pkg.meta.description, /日常/);
  assert.match(pkg.meta.description, /账本/);
  assert.equal(pkg.meta.description.includes('7 个'), false, 'meta.description 不应再提 0.2.0 的 7 个工具');
});

// —— cordis.patch.yml ——

test('cordis.patch.yml: 预设行关键字段', async () => {
  const yaml = await readPatch();
  assert.match(yaml, /^[ ]*- id: preset-arknights$/m, '缺少预设行 id: preset-arknights');
  assert.match(yaml, /^[ ]*name: '@deepseek-ai\/dsh-agent-preset'$/m, '预设行 name 应为 @deepseek-ai/dsh-agent-preset');
  assert.match(yaml, /^[ ]*id: arknights$/m, '缺少预设 config.id: arknights');
  assert.match(yaml, /^[ ]*name: 明日方舟$/m, '缺少预设显示名「明日方舟」');
  assert.match(yaml, /^[ ]*order: 6$/m, '预设 order 应为 6');
  assert.match(yaml, /^[ ]*description: 打关\/推关\/肉鸽\/日常/m, '预设 description 应说明打关/推关/肉鸽/日常');
  assert.match(yaml, /ark_diag\/ark_solutions/, '预设 description 应提到 2 个预设工具');
});

test('cordis.patch.yml: 预设工具入口 URL 精确为 ?v=3，且工具行 id 正确', async () => {
  const yaml = await readPatch();
  assert.ok(yaml.includes(PRESET_TOOL_URL), `预设工具入口应为：${PRESET_TOOL_URL}`);
  assert.match(yaml, /^[ ]*- id: arknights-preset-tools$/m, '缺少 arknights-preset-tools 工具行');
  assert.equal(yaml.includes('?v=2'), false, '1.0.0 不应再引用 ?v=2');
  assert.equal(yaml.includes('?v=4'), false, '1.0.0 的缓存标记应为 ?v=3');
});

test('cordis.patch.yml: 全局工具白名单恰好 ark_ / prts_ / input_', async () => {
  const yaml = await readPatch();
  const block = /allowGlobalToolPrefixes:\s*\r?\n((?:[ ]+- \S+\r?\n)+)/.exec(yaml);
  assert.ok(block !== null, '缺少 allowGlobalToolPrefixes 列表');
  const prefixes = [...block[1].matchAll(/- (\S+)/g)].map((match) => match[1]);
  assert.deepEqual(prefixes, ['ark_', 'prts_', 'input_']);
});

test('cordis.patch.yml: 预设工具行 config 覆盖路径/日志/截图/超时/白名单键', async () => {
  const yaml = await readPatch();
  for (const key of [
    'maaPath:',
    'pythonPath:',
    'userDir:',
    'adbPath:',
    'address:',
    'mumuInstallPath:',
    'managerPath:',
    'vmIndex: 0',
    'logFile:',
    'screenshotDir:',
    'maxScreenshots: 20',
    'maxLogLines: 400',
    'clientType: Official',
    'launchTimeoutMs: 120000',
  ]) {
    assert.ok(yaml.includes(key), `预设工具行 config 缺 ${key}`);
  }
  assert.equal(yaml.includes('ledgerFile:'), false, '1.0.0 的预设不再使用 ledgerFile（账本归全局插件）');
});

test('cordis.patch.yml: base 插件行与默认工具行结构完整', async () => {
  const yaml = await readPatch();
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
  assert.match(yaml, /exit_plan_mode/, 'plan-mode section 文本应存在');
});

test('cordis.patch.yml: persona 写明工具面（13 全局 + 2 预设 + 10 PRTS）', async () => {
  const persona = await personaText();
  assert.match(persona, /13 个全局/);
  assert.match(persona, /2 个预设工具/);
  assert.match(persona, /10 个 prts_\*/);
  assert.match(persona, /ark_diag/);
  assert.match(persona, /ark_solutions/);
});

test('cordis.patch.yml: persona 覆盖确认/安全/难度/满星/排查/配置关键约束', async () => {
  const persona = await personaText();
  for (const phrase of [
    'ark_status',
    'confirm=false',
    'confirm=true',
    'difficulty=tough',
    '-HARD',
    'medicine',
    'useSanityPotion',
    '至纯源石',
    '招聘许可',
    '加急许可',
    'analyze',
    'execute',
    'stars=3',
    'ark_push',
    'ark_rogue',
    'ark_stop',
    'ark_box',
    'E_BUSY',
    'ark_diag(action=device)',
    'ark_diag(action=logs)',
    'ark_diag(action=screen)',
    'ark_diag(action=probe)',
    '16-16',
    'skill arknights',
    'cordis.patch.yml',
    '重启 DSH',
  ]) {
    assert.ok(persona.includes(phrase), `persona 缺少关键约束：${phrase}`);
  }
  assert.equal(persona.includes('ark_screen'), false, 'persona 不应再教模型调用旧工具 ark_screen');
});

// —— locale ——

test('locale/zh.json: meta 与 package.json meta 完全一致', async () => {
  const pkg = await packageJson();
  const zh = await readJson('locale/zh.json');
  assert.deepEqual(zh, {
    meta: { title: pkg.meta.title, description: pkg.meta.description },
  });
});

test('locale/en.json: 英文标题/描述齐备、与新工具面一致且与中文不同', async () => {
  const pkg = await packageJson();
  const en = await readJson('locale/en.json');
  assert.equal(en.meta?.title, 'Arknights');
  assert.equal(typeof en.meta?.description, 'string');
  assert.match(en.meta.description, /^Arknights operations agent:/);
  assert.match(en.meta.description, /ark_diag/);
  assert.match(en.meta.description, /ark_solutions/);
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

test('README.md: 说明安装/预设/工具/白名单/排障这几个关键面向', async () => {
  const readme = await readRequired('README.md');
  for (const phrase of [
    'install_bundle',
    'arknights-preset-activation.json',
    '2 个',
    '13 个',
    '10 个',
    '白名单',
    '?v=3',
    'allowGlobalToolPrefixes',
    'ark_diag',
    'ark_solutions',
    '重启 DSH',
  ]) {
    assert.ok(readme.includes(phrase), `README.md 缺少关键说明：${phrase}`);
  }
  assert.equal(readme.includes('?v=2'), false, 'README 不应再提 0.2.0 的 ?v=2');
  assert.equal(readme.includes('ark_screen'), false, 'README 不应再列旧工具 ark_screen');
});

test('版本一致性: package 1.0.0、patch ?v=3 与 README 描述一致', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.version, '1.0.0');
  const yaml = await readPatch();
  assert.ok(yaml.includes('?v=3'));
  const readme = await readRequired('README.md');
  assert.ok(readme.includes('1.0.0'), 'README 应标注 bundle 版本 1.0.0');
  assert.ok(readme.includes('?v=3'), 'README 应说明当前 ESM 缓存标记是 ?v=3');
});
