// Node test harness for the export engine. Builds a sample selection and writes
// /tmp/test-export.xlsx, which is then validated by scripts/validate-export.py.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildFilteredWorkbook } from '../src/lib/xlsxExport.js';
import { computeExportPlan } from '../src/lib/selection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const original = readFileSync(join(root, 'public', 'GEO-AEO-Checklist-v5.xlsx'));
const data = JSON.parse(readFileSync(join(root, 'src', 'data', 'checklist.json'), 'utf-8'));

// --- sample selection ---
const et = data['E-Ticaret'];
const hz = data['Hizmet'];

// E-Ticaret: select first task (r6) + two of its subtasks (r7,r9); select another
// task's subtask only (r13 under task r12) to verify parent auto-include.
const selectedET = new Set();
const t6 = et.phases[0].sections[0].tasks[0]; // row 6
selectedET.add(t6.id);
selectedET.add(t6.subtasks[0].id); // r7
selectedET.add(t6.subtasks[2].id); // r9
const t12 = et.phases[0].sections[0].tasks[1]; // row 12
selectedET.add(t12.subtasks[0].id); // r13 -> parent r12 must auto-include

// Hizmet: select one task (no subtasks selected)
const selectedHZ = new Set();
const hzTask = hz.phases[1].sections[1].tasks[0];
selectedHZ.add(hzTask.id);

// edits keyed by absolute row
const editsET = {
  [t6.row]: { durum: 'Devam Ediyor', markaNotlari: 'Öncelikli — Q3 hedefi', sorumlu: 'SEO Ekibi (Ahmet)' },
  [t6.subtasks[0].row]: { markaNotlari: 'GSC verisi hazır' },
};
const editsHZ = {
  [hzTask.row]: { durum: 'Tamamlandı' },
};

const planET = computeExportPlan(et, selectedET, editsET);
const planHZ = computeExportPlan(hz, selectedHZ, editsHZ);

console.log('E-Ticaret keepRows:', [...planET.keepRows].sort((a, b) => a - b).join(','));
console.log('E-Ticaret edits rows:', [...planET.edits.keys()].join(','));
console.log('Hizmet keepRows:', [...planHZ.keepRows].sort((a, b) => a - b).join(','));

const exportsList = [
  { sheetName: et.sheet, sheetFile: et.sheetFile, keepRows: planET.keepRows, edits: planET.edits },
  { sheetName: hz.sheet, sheetFile: hz.sheetFile, keepRows: planHZ.keepRows, edits: planHZ.edits },
];

const bytes = buildFilteredWorkbook(original, exportsList);
writeFileSync('/tmp/test-export.xlsx', bytes);
console.log('\nwrote /tmp/test-export.xlsx', bytes.length, 'bytes');

// expectations for the validator
const expected = {
  'E-Ticaret': [...planET.keepRows].sort((a, b) => a - b),
  'Hizmet': [...planHZ.keepRows].sort((a, b) => a - b),
};
writeFileSync('/tmp/test-export-expected.json', JSON.stringify(expected));
