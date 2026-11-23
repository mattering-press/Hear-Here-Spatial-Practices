// CSL-JSON to RIS, the tagged format that reference managers (Zotero, EndNote, Mendeley) import, for the References
// page's Copy menus and its download (citations.mjs, formatReferences). Pandoc reads RIS but cannot write it.
//   toRis(item)  one CSL-JSON entry -> its RIS entry: lines of "TY  - JOUR", ending with "ER  - ", joined by \n
// The tags and the creators' places follow the RIS specification as Zotero's RIS translator reads and writes it, so
// that an entry comes back into Zotero as it went out: AU the authors, A2 the editors (A3 those of a whole book), A4
// the translators, C2 the author of the book a chapter is in; T2 the journal, the book or the website; PY the year, DA
// the full date and Y2 the date accessed (YYYY/MM/DD/); SP and EP the first and last page; ID the entry's key.

// CSL types -> RIS types; any other type is GEN (generic)
const TYPES = {
  'article-journal': 'JOUR', 'article-magazine': 'MGZN', 'article-newspaper': 'NEWS', article: 'JOUR', book: 'BOOK',
  chapter: 'CHAP', 'entry-encyclopedia': 'ENCYC', 'entry-dictionary': 'DICT', graphic: 'ART', webpage: 'ELEC', post: 'ELEC',
  'post-weblog': 'BLOG', report: 'RPRT', thesis: 'THES', 'paper-conference': 'CPAPER', motion_picture: 'VIDEO', song: 'SOUND',
  interview: 'PCOMM', personal_communication: 'PCOMM', manuscript: 'MANSCPT', map: 'MAP', dataset: 'DATA', speech: 'SLIDE',
};

// a name as RIS writes it: "Family, Given" (with a particle such as "de la" before the family name), or as given
const name = (n) => {
  if (n.literal) return n.literal;
  const family = [n['non-dropping-particle'], n.family].filter(Boolean).join(' ');
  const given = [n.given, n['dropping-particle']].filter(Boolean).join(' ');
  return [family, given].filter(Boolean).join(', ') + (n.suffix ? `, ${n.suffix}` : '');
};
// a CSL date ({ 'date-parts': [[2018, 4, 18]] }) as RIS writes it, YYYY/MM/DD/ (2007///, 2018/04/18/), and its year
const pad = (n) => String(n).padStart(2, '0');
const date = (d) => {
  const [year, month, day] = d?.['date-parts']?.[0] || [];
  if (!year) return d?.literal ? { full: d.literal } : null;
  return { year: String(year), full: `${year}/${month ? pad(month) : ''}/${day ? pad(day) : ''}/` };
};
// one line of a value: RIS has a tag and its value on each line
const flat = (s) => String(s).replace(/\s+/g, ' ').trim();

export function toRis(item) {
  const type = TYPES[item.type] || 'GEN';
  const lines = [];
  const add = (tag, value) => { if (value !== undefined && value !== null && flat(value)) lines.push(`${tag}  - ${flat(value)}`); };
  add('TY', type);
  add('ID', item.id);
  add('TI', item.title);
  for (const n of item.author || []) add('AU', name(n));
  add('T2', item['container-title']);
  for (const n of item.editor || []) add(type === 'BOOK' ? 'A3' : 'A2', name(n));
  for (const n of item['collection-editor'] || []) add(type === 'BOOK' ? 'A2' : 'A3', name(n));
  for (const n of item.translator || []) add('A4', name(n));
  for (const n of item['container-author'] || []) add('C2', name(n));
  add('T3', item['collection-title']);
  add('CY', item['publisher-place']);
  const issued = date(item.issued);
  if (issued?.year) add('PY', issued.year);
  if (issued && (!issued.year || issued.full !== `${issued.year}///`)) add('DA', issued.full);
  add('ET', item.edition);
  add('VL', item.volume);
  add('IS', item.issue);
  const pages = /^\s*([^-–\s]+)\s*[-–]+\s*([^-–\s]+)\s*$/.exec(item.page || '');
  if (pages) { add('SP', pages[1]); add('EP', pages[2]); } else add('SP', item.page);
  add('PB', item.publisher);
  add('SN', item.ISBN || item.ISSN);
  add('DO', item.DOI);
  add('UR', item.URL);
  const accessed = date(item.accessed);
  if (accessed) add('Y2', accessed.full);
  add('LA', item.language);
  lines.push('ER  - ');
  return lines.join('\n');
}
