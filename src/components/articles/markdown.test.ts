import { describe, expect, it } from 'vitest';
import { parseArticleMarkdown, tableOfContents } from './markdown';

const t = (text: string, bold = false) => ({ text, bold });

describe('article Markdown subset', () => {
  it('parses headings, lists, bold and joined paragraphs', () => {
    expect(parseArticleMarkdown('## Lương Gross\n\nDòng một\ndòng **hai**.\n\n- a\n- **b**\n\n1. một\n2. hai\n\n### Chi tiết')).toEqual([
      { kind: 'h2', id: 'luong-gross', text: [t('Lương Gross')] },
      { kind: 'p', text: [t('Dòng một dòng '), t('hai', true), t('.')] },
      { kind: 'ul', items: [[t('a')], [t('b', true)]] },
      { kind: 'ol', items: [[t('một')], [t('hai')]] },
      { kind: 'h3', id: 'chi-tiet', text: [t('Chi tiết')] },
    ]);
  });

  // ArticleMarkdown renders these strings as React text nodes, which React escapes.
  it('keeps HTML and unsupported syntax as plain text', () => {
    expect(parseArticleMarkdown('<script>alert(1)</script>\n\n# H1 [x](javascript:y)')).toEqual([
      { kind: 'p', text: [t('<script>alert(1)</script>')] },
      { kind: 'p', text: [t('# H1 [x](javascript:y)')] },
    ]);
  });

  it('builds a table of contents from ## headings with unique anchors', () => {
    expect(tableOfContents(parseArticleMarkdown('## Đàm phán\n### Phụ\n## Đàm phán\n## !!!'))).toEqual([
      { id: 'dam-phan', title: 'Đàm phán' }, { id: 'dam-phan-2', title: 'Đàm phán' }, { id: 'muc', title: '!!!' },
    ]);
  });
});
