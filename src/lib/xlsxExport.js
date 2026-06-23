/**
 * Birebir XLSX export engine.
 *
 * Strategy: take the ORIGINAL .xlsx, reuse `xl/styles.xml` and `xl/theme/theme1.xml`
 * VERBATIM, and rebuild a clean workbook that contains only the exported checklist
 * sheet(s), each with only the kept rows (renumbered to be contiguous). Because the
 * style/theme/font definitions and every cell's style index (`s="..."`) are preserved
 * untouched, the output is visually identical to the source file.
 *
 * The source uses inline strings (no sharedStrings) and has no merged cells, which is
 * what makes row deletion + renumbering safe and lossless.
 */
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

// Durum dropdown options — lifted from the original sheet's J-column dataValidation.
export const DURUM_OPTIONS = ['Yapılmadı', 'Devam Ediyor', 'Tamamlandı', 'Beklemede', 'İptal'];
const DURUM_LIST = DURUM_OPTIONS.join(',');

// Editable field -> column letter
const FIELD_COL = { sorumlu: 'I', durum: 'J', markaNotlari: 'K' };

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Filter one worksheet XML down to keepRows, renumber rows to be contiguous,
 * inject any edited Sorumlu/Durum/Marka Notları values, and rebuild the tail
 * (autoFilter + a self-contained Durum dropdown + pageMargins).
 *
 * @param {string} xml      original worksheet XML
 * @param {Set<number>} keepRows  absolute (original) row indices to keep
 * @param {Map<number, {sorumlu?:string,durum?:string,markaNotlari?:string}>} edits
 * @returns {string}
 */
export function filterWorksheet(xml, keepRows, edits) {
  const sdOpen = xml.indexOf('<sheetData>');
  const sdClose = xml.indexOf('</sheetData>');
  if (sdOpen === -1 || sdClose === -1) throw new Error('sheetData bulunamadı');

  let head = xml.slice(0, sdOpen);
  const body = xml.slice(sdOpen + '<sheetData>'.length, sdClose);

  // Match each <row ...>...</row> (or self-closing). Inline-string text is XML-escaped,
  // so a literal </row> can never appear inside cell content.
  const rowRe = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g;
  const kept = [];
  let m;
  while ((m = rowRe.exec(body))) {
    const rowStr = m[0];
    const rm = /<row\b[^>]*?\br="(\d+)"/.exec(rowStr);
    if (!rm) continue;
    const oldR = parseInt(rm[1], 10);
    if (!keepRows.has(oldR)) continue;
    kept.push({ oldR, rowStr });
  }
  kept.sort((a, b) => a.oldR - b.oldR);

  let newRows = '';
  let newMax = 0;
  for (const { oldR, rowStr } of kept) {
    newMax += 1;
    let s = rowStr;

    const ed = edits.get(oldR);
    if (ed) {
      for (const field of Object.keys(FIELD_COL)) {
        if (ed[field] == null) continue;
        const col = FIELD_COL[field];
        const cre = new RegExp('<c r="' + col + oldR + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)');
        const cm = cre.exec(s);
        if (!cm) continue;
        const sm = / s="(\d+)"/.exec(cm[0]);
        const sAttr = sm ? ' s="' + sm[1] + '"' : '';
        const val = String(ed[field]);
        const cell = val === ''
          ? '<c r="' + col + oldR + '"' + sAttr + ' t="n"></c>'
          : '<c r="' + col + oldR + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(val) + '</t></is></c>';
        s = s.slice(0, cm.index) + cell + s.slice(cm.index + cm[0].length);
      }
    }

    // Renumber the row's own index, then every cell ref's row part. Cell refs start
    // with column letters (A-L) so the row's digit-only r="..." is untouched here.
    s = s.replace(/(<row\b[^>]*?\br=")\d+(")/, '$1' + newMax + '$2');
    s = s.replace(/(\br="[A-Z]+)\d+(")/g, '$1' + newMax + '$2');
    newRows += s;
  }

  head = head.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:L' + newMax + '"/>');

  const pmMatch = /<pageMargins\b[^>]*\/>/.exec(xml);
  const pageMargins = pmMatch
    ? pmMatch[0]
    : '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>';

  const autoFilter = '<autoFilter ref="A3:L' + newMax + '"/>';
  const durumDV =
    '<dataValidations count="1"><dataValidation sqref="J4:J' + newMax + '" ' +
    'showDropDown="0" showInputMessage="0" showErrorMessage="0" allowBlank="1" type="list">' +
    '<formula1>"' + DURUM_LIST + '"</formula1></dataValidation></dataValidations>';

  return head + '<sheetData>' + newRows + '</sheetData>' + autoFilter + durumDV + pageMargins + '</worksheet>';
}

function buildContentTypes(sheetCount) {
  let overrides = '';
  for (let i = 1; i <= sheetCount; i++) {
    overrides += '<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
  }
  return '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    overrides + '</Types>';
}

function buildWorkbookXml(sheetNames) {
  const sheets = sheetNames.map((nm, i) =>
    '<sheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" name="' +
    xmlEscape(nm) + '" sheetId="' + (i + 1) + '" state="visible" r:id="rId' + (i + 1) + '"/>'
  ).join('');
  return '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets>' + sheets +
    '</sheets><calcPr calcId="124519"/></workbook>';
}

function buildWorkbookRels(sheetCount) {
  let rels = '';
  for (let i = 1; i <= sheetCount; i++) {
    rels += '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + i + '.xml" Id="rId' + i + '"/>';
  }
  rels += '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" Id="rId' + (sheetCount + 1) + '"/>';
  rels += '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml" Id="rId' + (sheetCount + 2) + '"/>';
  return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>';
}

function buildAppXml(sheetNames) {
  const n = sheetNames.length;
  const titles = sheetNames.map((nm) => '<vt:lpstr>' + xmlEscape(nm) + '</vt:lpstr>').join('');
  return '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>Inbound GEO Checklist</Application>' +
    '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Çalışma Sayfaları</vt:lpstr></vt:variant><vt:variant><vt:i4>' + n + '</vt:i4></vt:variant></vt:vector></HeadingPairs>' +
    '<TitlesOfParts><vt:vector size="' + n + '" baseType="lpstr">' + titles + '</vt:vector></TitlesOfParts>' +
    '</Properties>';
}

const RELS_ROOT =
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml" Id="rId1"/>' +
  '<Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml" Id="rId2"/>' +
  '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml" Id="rId3"/>' +
  '</Relationships>';

/**
 * Build a filtered workbook (Uint8Array) from the original .xlsx bytes.
 *
 * @param {Uint8Array} originalBytes
 * @param {Array<{sheetName:string, sheetFile:string, keepRows:Set<number>, edits:Map}>} exportsList
 * @returns {Uint8Array}
 */
export function buildFilteredWorkbook(originalBytes, exportsList) {
  if (!exportsList.length) throw new Error('Export edilecek sayfa yok');
  const files = unzipSync(originalBytes);
  const out = {};

  // Styles + theme reused from the source verbatim — guarantees identical look.
  // (The source template is already Inbound-colored.)
  out['xl/styles.xml'] = files['xl/styles.xml'];
  out['xl/theme/theme1.xml'] = files['xl/theme/theme1.xml'];
  if (files['docProps/core.xml']) out['docProps/core.xml'] = files['docProps/core.xml'];

  const sheetNames = exportsList.map((e) => e.sheetName);
  out['[Content_Types].xml'] = strToU8(buildContentTypes(exportsList.length));
  out['_rels/.rels'] = strToU8(RELS_ROOT);
  out['docProps/app.xml'] = strToU8(buildAppXml(sheetNames));
  out['xl/workbook.xml'] = strToU8(buildWorkbookXml(sheetNames));
  out['xl/_rels/workbook.xml.rels'] = strToU8(buildWorkbookRels(exportsList.length));

  exportsList.forEach((e, i) => {
    const part = files['xl/worksheets/' + e.sheetFile];
    if (!part) throw new Error('Worksheet bulunamadı: ' + e.sheetFile);
    const xml = strFromU8(part);
    out['xl/worksheets/sheet' + (i + 1) + '.xml'] = strToU8(filterWorksheet(xml, e.keepRows, e.edits));
  });

  return zipSync(out, { level: 6 });
}
