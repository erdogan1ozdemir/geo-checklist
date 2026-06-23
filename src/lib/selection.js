/**
 * Selection -> export plan.
 *
 * Given a sheet's data tree, the set of selected item ids, and a per-row edits map,
 * compute the absolute rows to keep in the export.
 *
 * Rules (matches the "Tikliler + başlıklar" choice):
 *  - rows 1-3 (title / date / column header) are always kept
 *  - a task row is kept if the task itself is selected OR any of its subtasks is
 *  - only the *selected* subtasks are kept (not all subtasks of a selected task)
 *  - a section banner is kept iff it contains a kept task
 *  - a phase banner is kept iff it contains a kept section
 *  - edits (Sorumlu / Durum / Marka Notları) are carried only for kept rows
 */
export function computeExportPlan(sheetData, selectedIds, editsByRow) {
  const keepRows = new Set([1, 2, 3]);
  const edits = new Map();
  let anySelected = false;

  const carryEdit = (row) => {
    const e = editsByRow && editsByRow[row];
    if (e && (e.sorumlu != null || e.durum != null || e.markaNotlari != null)) {
      edits.set(row, e);
    }
  };

  for (const phase of sheetData.phases) {
    let phaseHasKept = false;
    for (const section of phase.sections) {
      let sectionHasKept = false;
      for (const task of section.tasks) {
        const taskSel = selectedIds.has(task.id);
        const selectedSubs = (task.subtasks || []).filter((st) => selectedIds.has(st.id));
        if (taskSel || selectedSubs.length) {
          keepRows.add(task.row);
          carryEdit(task.row);
          for (const st of selectedSubs) {
            keepRows.add(st.row);
            carryEdit(st.row);
          }
          sectionHasKept = true;
          anySelected = true;
        }
      }
      if (sectionHasKept) {
        keepRows.add(section.row);
        phaseHasKept = true;
      }
    }
    if (phaseHasKept) keepRows.add(phase.row);
  }

  return { keepRows, edits, anySelected };
}
