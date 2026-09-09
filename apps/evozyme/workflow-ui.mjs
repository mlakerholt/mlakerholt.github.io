import {workflowIssues,configDiff,minimumControls} from './workflow.mjs';
import {e,table,callout,num} from './ui.mjs';
import {budget} from './core.mjs';
export function issueList(r,stage=null) {
  const issues=workflowIssues(r).filter(x=>!stage||x.stage===stage);
  return issues.length?'<ul class="text-list">'+issues.map(x=>`<li><a href="#${x.stage}" data-go-field="${e(x.path)}"><strong>${e({analysis:'Analysis blocked',planning:'Plan conflict',evidence:'Evidence needed',review:'Review needed',information:'Information needed'}[x.kind])}:</strong> ${e(x.message)}</a></li>`).join('')+'</ul>':'<p>Planning checks are recorded. Confirm that the experimental evidence supports proceeding.</p>';
}
export const stageHelp=(r,stage)=>`<details class="next-actions"><summary>Next useful actions for this stage</summary>${issueList(r,stage)}<small>Completing records does not establish experimental validity.</small></details>`;
export function settingsPreview(before,after) {
  const diff=configDiff(before,after),show=x=>x===undefined?'Not recorded':JSON.stringify(x);
  return `<details open><summary>Settings used for this analysis</summary>${diff.length?table(['Setting','Current','Imported'],diff.map(x=>[e(x.key),e(show(x.before)),e(show(x.after))])):'<p>The imported settings match the current settings.</p>'}${table(['Effective setting','Value'],Object.entries(after).map(([k,v])=>[e(k),e(show(v))]))}</details>`;
}
export function controlProposal(r) {
  const required=minimumControls(r.assay);
  if(required===null)throw new Error('Complete the assay control and replicate counts first.');
  const controls=Math.max(required,r.budget.controls),technical=Math.max(r.assay.minimum_technical_wells,r.budget.technical);
  const proposed={...r.budget,controls,technical};let before;try{before=budget(r.budget);}catch{}
  const after=budget(proposed);
  return {proposed,html:callout(`Use at least <strong>${controls} control wells</strong> and <strong>${technical} technical wells per preparation</strong>. Extra reserved controls are retained.`)+table(['Result','Current','Proposed'],[['Primary slots',num(before?.slots,0),num(after.slots,0)],['Expected usable',num(before?.usable,1),num(after.usable,1)],['Recurring round cost',num(before?.total),num(after.total)]])};
}
