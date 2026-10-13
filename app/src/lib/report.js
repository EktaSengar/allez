/* ---------------------------------------------------------
   The test notes (APP-TASKS 2.3). At the end of the test each person
   sends us what the app counted on their phone, as plain text through
   the share sheet, so they can read every word before it goes. Nothing
   leaves the phone without that tap, and places are named only if they
   say so.
   --------------------------------------------------------- */

import { V } from './voice';

const VERDICTS = ['loved', 'good', 'meh', 'skipped'];

export function testNotes(saved, { names = false, now = new Date() } = {}) {
  const p = saved.profile || {};
  const c = saved.counts || {};
  const outings = saved.outings || [];
  const n = k => c[k] || 0;

  const byDay = c.opensByDay || {};
  const days = Object.keys(byDay).sort();
  const opens = days.reduce((t, d) => t + byDay[d], 0);

  const verdicts = Object.fromEntries(VERDICTS.map(v => [v, outings.filter(o => o.verdict === v).length]));
  const answered = outings.filter(o => o.verdict && o.verdict !== 'skipped' && o.anyway != null);
  const anyway = answered.filter(o => o.anyway).length;

  const horizon = p.horizon === 'until' && p.until ? `here until ${p.until}` : p.horizon || 'not answered';
  const lines = [
    `Allez test notes · ${now.toISOString().slice(0, 10)}`,
    '',
    `How long here: ${horizon}`,
    `Work hours: ${p.hours || 'not answered'}`,
    '',
    `Opens: ${opens} over ${days.length} ${days.length === 1 ? 'day' : 'days'}`,
    ...(days.length ? [`  ${days.map(d => `${d.slice(5)}: ${byDay[d]}`).join(', ')}`] : []),
    `Today stack finished: ${n('stackFinished')} ${n('stackFinished') === 1 ? 'day' : 'days'}`,
    '',
    `Weekend plan opened: ${n('weekendOpened')}`,
    `Swaps: ${n('swaps')}`,
    `Decks sent: ${n('decksSent')} · matched: ${n('decksMatched')}`,
    '',
    `Outings started: ${outings.length}`,
    `  loved ${verdicts.loved} · fine ${verdicts.good} · not for me ${verdicts.meh} · didn't go ${verdicts.skipped} · not answered ${outings.filter(o => !o.verdict).length}`,
    `  would have gone anyway: ${anyway} of ${answered.length}`,
    '',
    `Postcards made: ${outings.filter(o => o.postcard).length} · shared: ${n('postcardsShared')}`
  ];
  if (names && outings.length) {
    lines.push('', 'Places:');
    outings.slice().reverse().forEach(o => {
      const v = o.verdict ? V.how[o.verdict] : 'not answered';
      lines.push(`  ${new Date(o.startedAt).toISOString().slice(0, 10)} ${o.title}: ${v}`);
    });
  }
  return lines.join('\n');
}
