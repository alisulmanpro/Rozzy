const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function loadTs(relPath) {
  let full = path.resolve(__dirname, relPath);
  if (!full.endsWith('.ts') && !full.endsWith('.tsx')) {
    if (fs.existsSync(full + '.ts')) full += '.ts';
    else if (fs.existsSync(full + '.tsx')) full += '.tsx';
    else if (fs.existsSync(path.join(full, 'index.ts'))) full = path.join(full, 'index.ts');
  }
  const dir = path.dirname(full);
  const src = fs.readFileSync(full, 'utf8');
  const t = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const m = { exports: {} };

  function localReq(reqPath) {
    if (reqPath.startsWith('@/')) {
      return loadTs(path.join('src', reqPath.slice(2)));
    } else if (reqPath.startsWith('.')) {
      return loadTs(path.join(dir, reqPath));
    }
    return require(reqPath);
  }

  (new Function('require', 'exports', 'module', t.outputText))(localReq, m.exports, m);
  return m.exports;
}

const testFiles = fs.readdirSync(path.join(__dirname, 'tests')).filter(f => f.endsWith('.test.ts'));
console.log(`Running ${testFiles.length} test file(s)...`);

for (const file of testFiles) {
  console.log(`\n=== Running: ${file} ===`);
  loadTs(path.join('tests', file));
}
console.log('\nAll test runners completed successfully!');
