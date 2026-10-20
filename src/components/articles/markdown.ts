// Contract v5 §46 Markdown subset: '## ', '### ', '- ', '1. ', **bold**, paragraphs. Everything else is plain text —
// the renderer only emits text nodes, so React escapes any HTML in an article.
export type Inline = { text: string; bold: boolean }[];
export type Block =
  | { kind: 'h2' | 'h3'; id: string; text: Inline }
  | { kind: 'ul' | 'ol'; items: Inline[] }
  | { kind: 'p'; text: Inline };

const HEADING = /^(#{2,3})\s+(.+)$/;
const BULLET = /^-\s+/;
const NUMBERED = /^\d+\.\s+/;

export function parseInline(text: string): Inline {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter((part) => part.text);
}

const plain = (inline: Inline) => inline.map((part) => part.text).join('');

/** "Lương Gross & Net" → "luong-gross-net"; repeats get -2, -3 so every heading has its own anchor. */
function anchor(text: string, used: Map<string, number>): string {
  const base = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'muc';
  const n = (used.get(base) ?? 0) + 1;
  used.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

export function parseArticleMarkdown(content: string): Block[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const heading = HEADING.exec(line);
    if (!line) {
      i++;
    } else if (heading) {
      const text = parseInline(heading[2]);
      blocks.push({ kind: heading[1] === '##' ? 'h2' : 'h3', id: anchor(plain(text), used), text });
      i++;
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      const marker = BULLET.test(line) ? BULLET : NUMBERED;
      const items: Inline[] = [];
      for (; i < lines.length && marker.test(lines[i]); i++) items.push(parseInline(lines[i].replace(marker, '')));
      blocks.push({ kind: marker === BULLET ? 'ul' : 'ol', items });
    } else {
      const paragraph: string[] = [];
      for (; i < lines.length && lines[i] && !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i]); i++) {
        paragraph.push(lines[i]);
      }
      blocks.push({ kind: 'p', text: parseInline(paragraph.join(' ')) });
    }
  }
  return blocks;
}

/** Table of contents: the '## ' headings, in order. */
export function tableOfContents(blocks: Block[]): { id: string; title: string }[] {
  return blocks.flatMap((block) => (block.kind === 'h2' ? [{ id: block.id, title: plain(block.text) }] : []));
}
