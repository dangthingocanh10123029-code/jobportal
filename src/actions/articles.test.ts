import { describe, expect, it } from 'vitest';
import { adminArticleFilterSchema, articleFilterSchema, articleSlugSchema, saveArticleSchema, setArticlePublishedSchema } from './articles-schema';

const valid = { title: 'Viết CV ấn tượng', excerpt: 'Tóm tắt đủ hai mươi ký tự', category: 'CV', content: 'n'.repeat(100) };
const firstError = (input: unknown) => {
  const parsed = saveArticleSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
};

describe('article filters', () => {
  it('drops malformed URL filters instead of failing', () => {
    expect(articleFilterSchema.parse({ category: 'UNKNOWN', q: '   ', page: '-2' })).toEqual({ category: undefined, q: undefined, page: 1 });
    expect(articleFilterSchema.parse({ category: 'CV', q: '  phỏng vấn  ', page: '2' })).toEqual({ category: 'CV', q: 'phỏng vấn', page: 2 });
    expect(articleFilterSchema.parse({ q: 'x'.repeat(101) }).q).toHaveLength(100);
    expect(adminArticleFilterSchema.parse({ status: 'HIDDEN', page: '3' })).toEqual({ status: undefined, page: 3 });
  });

  it('accepts only folded slugs', () => {
    expect(articleSlugSchema.safeParse('viet-cv-2').success).toBe(true);
    for (const bad of ['Viết-CV', '../admin', 'a--b', '-a', '']) expect(articleSlugSchema.safeParse(bad).success).toBe(false);
  });
});

describe('saveArticleSchema', () => {
  it('trims fields and turns a blank slug into "derive from title"', () => {
    expect(saveArticleSchema.parse({ ...valid, title: '  Viết CV ấn tượng ', slug: '   ' })).toEqual({ ...valid, slug: undefined });
  });

  it.each([
    [{ title: ' abcd ' }, 'Tiêu đề cần từ 5 đến 200 ký tự'],
    [{ title: 'x'.repeat(201) }, 'Tiêu đề cần từ 5 đến 200 ký tự'],
    [{ excerpt: 'ngắn' }, 'Tóm tắt cần từ 20 đến 300 ký tự'],
    [{ excerpt: 'x'.repeat(301) }, 'Tóm tắt cần từ 20 đến 300 ký tự'],
    [{ content: ` ${'n'.repeat(99)} ` }, 'Nội dung cần từ 100 đến 50.000 ký tự'],
    [{ content: 'n'.repeat(50001) }, 'Nội dung cần từ 100 đến 50.000 ký tự'],
    [{ category: 'OTHER' }, 'Chủ đề bài viết không hợp lệ'],
    [{ slug: 'x'.repeat(201) }, 'Đường dẫn tối đa 200 ký tự'],
  ])('rejects %o', (patch, message) => {
    expect(firstError({ ...valid, ...patch })).toBe(message);
  });

  it('needs a uuid id when editing', () => {
    expect(firstError({ ...valid, id: 'abc' })).not.toBeNull();
    expect(setArticlePublishedSchema.safeParse({ id: 'abc', published: true }).success).toBe(false);
  });
});
