#!/usr/bin/env node
import fs from 'fs/promises';

async function main() {
  const buf = await fs.readFile('/tmp/check-jsdoc-results.json','utf8');
  const r = JSON.parse(buf);
  const counts = {};
  for (const p of r.problems) counts[p.file] = (counts[p.file] || 0) + 1;
  const arr = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  console.log('Total problems:', r.total);
  console.log('\nTop files by missing items:');
  for (let i=0;i<Math.min(30, arr.length); i++) {
    console.log(`${i+1}. ${arr[i][0]} — ${arr[i][1]}`);
  }
  console.log('\nSuggested hot-path files to prioritize (heuristic):');
  const heur = [
    'src/helpers/battleEngineFacade.js',
    'src/helpers/classicBattle/orchestratorHandlers.js',
    'src/helpers/classicBattle/uiHelpers.js',
    'src/helpers/battle/battleUI.js',
    'src/helpers/classicBattle/roundManager.js',
    'src/helpers/classicBattle/roundUI.js',
    'src/helpers/classicBattle/roundResolver.js',
  ];
  for (const f of heur) if (counts[f]) console.log(`- ${f} — ${counts[f]}`);
}

main().catch(e=>{console.error(e);process.exit(1)});
