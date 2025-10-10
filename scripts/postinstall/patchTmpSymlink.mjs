import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const modulePath = path.join(process.cwd(), 'node_modules', 'tmp', 'lib', 'tmp.js');

if (!fs.existsSync(modulePath)) {
  // Dependency not installed; nothing to patch.
  process.exit(0);
}

const fileContent = fs.readFileSync(modulePath, 'utf8');

if (fileContent.includes('_resolveAndSanitizeDir')) {
  // Patch already applied.
  process.exit(0);
}

const tmpDirSentinel = '  tmpDir = osTmpDir(),';
if (!fileContent.includes(tmpDirSentinel)) {
  throw new Error('tmp symlink patch failed: tmpDir sentinel not found.');
}

const updatedWithRealTmp = fileContent.replace(
  tmpDirSentinel,
  `${tmpDirSentinel}\n  realTmpDir = fs.realpathSync(tmpDir),`
);

const originalGenerateFunction = `function _generateTmpName(opts) {\n  if (opts.name) {\n    return path.join(opts.dir || tmpDir, opts.name);\n  }\n\n  // mkstemps like template\n  if (opts.template) {\n    return opts.template.replace(TEMPLATE_PATTERN, _randomChars(6));\n  }\n\n  // prefix and postfix\n  const name = [\n    opts.prefix || 'tmp-',\n    process.pid,\n    _randomChars(12),\n    opts.postfix || ''\n  ].join('');\n\n  return path.join(opts.dir || tmpDir, name);\n}\n`;

if (!updatedWithRealTmp.includes(originalGenerateFunction)) {
  throw new Error('tmp symlink patch failed: _generateTmpName sentinel not found.');
}

const patchedGenerateFunction = `function _resolveAndSanitizeDir(customDir) {\n  const baseDir = realTmpDir;\n  if (!customDir) {\n    return baseDir;\n  }\n\n  const candidate = path.isAbsolute(customDir) ? customDir : path.join(baseDir, customDir);\n  const resolvedDir = fs.realpathSync(candidate);\n  const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;\n\n  if (resolvedDir === baseDir) {\n    return resolvedDir;\n  }\n\n  if (!resolvedDir.startsWith(baseWithSep)) {\n    throw new Error('dir option must be relative to "' + baseDir + '", found "' + resolvedDir + '".');\n  }\n\n  return resolvedDir;\n}\n\nfunction _generateTmpName(opts) {\n  const targetDir = _resolveAndSanitizeDir(opts.dir);\n\n  if (opts.name) {\n    return path.join(targetDir, opts.name);\n  }\n\n  // mkstemps like template\n  if (opts.template) {\n    return opts.template.replace(TEMPLATE_PATTERN, _randomChars(6));\n  }\n\n  // prefix and postfix\n  const name = [\n    opts.prefix || 'tmp-',\n    process.pid,\n    _randomChars(12),\n    opts.postfix || ''\n  ].join('');\n\n  return path.join(targetDir, name);\n}\n`;

const patchedContent = updatedWithRealTmp.replace(originalGenerateFunction, patchedGenerateFunction);

fs.writeFileSync(modulePath, patchedContent);
