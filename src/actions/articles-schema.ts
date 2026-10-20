import { z } from 'zod';
import { pageSchema } from './postings-schema';
import type { ArticleCategory, ArticleStatus } from './types';

export const ARTICLE_CATEGORIES = ['CV', 'INTERVIEW', 'SALARY', 'CAREER', 'WORKPLACE'] as const satisfies readonly ArticleCategory[];
const STATUSES = ['DRAFT', 'PUBLISHED'] as const satisfies readonly ArticleStatus[];

export const articleIdSchema = z.string().uuid();
export const articleSlugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(200);

// URL filters: anything malformed is dropped, never an error page.
const loose = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);
const text = loose(z.string().trim().transform((s) => s.slice(0, 100) || undefined));
export const articleFilterSchema = z
  .object({ category: loose(z.enum(ARTICLE_CATEGORIES)), q: text, page: pageSchema })
  .catch({ category: undefined, q: undefined, page: 1 });
export const adminArticleFilterSchema = z
  .object({ status: loose(z.enum(STATUSES)), page: pageSchema })
  .catch({ status: undefined, page: 1 });

export const saveArticleSchema = z.object({
  id: articleIdSchema.optional(),
  title: z.string().trim().min(5, 'Tiêu đề cần từ 5 đến 200 ký tự').max(200, 'Tiêu đề cần từ 5 đến 200 ký tự'),
  slug: z.string().trim().max(200, 'Đường dẫn tối đa 200 ký tự').transform((s) => s || undefined).optional(),
  excerpt: z.string().trim().min(20, 'Tóm tắt cần từ 20 đến 300 ký tự').max(300, 'Tóm tắt cần từ 20 đến 300 ký tự'),
  category: z.enum(ARTICLE_CATEGORIES, { errorMap: () => ({ message: 'Chủ đề bài viết không hợp lệ' }) }),
  content: z.string().trim().min(100, 'Nội dung cần từ 100 đến 50.000 ký tự').max(50000, 'Nội dung cần từ 100 đến 50.000 ký tự'),
});

export const setArticlePublishedSchema = z.object({ id: articleIdSchema, published: z.boolean() });
