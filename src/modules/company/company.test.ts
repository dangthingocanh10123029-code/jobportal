import { describe, expect, it } from 'vitest';
import { InMemoryCompanyRepository } from './adapters/in-memory';
import { CompanyService, type CompanyId, type CompanySummary } from './index';

const company = (id: string, name: string, openPostings = 0): CompanySummary => ({
  id, name, openPostings, logoUrl: null, about: null, size: null, address: null, website: null,
});

describe('CompanyService.list', () => {
  it('tìm không dấu, không phân biệt hoa thường; nhiều tin đang mở trước, rồi theo tên', async () => {
    const service = new CompanyService(
      new InMemoryCompanyRepository([
        company('1', 'Công ty Đông Á'),
        company('2', 'Dong A Logistics', 3),
        company('3', 'Globex'),
        company('4', 'An Đông', 0),
      ]),
    );
    const page = await service.list({ q: '  ĐÔNG ' });
    expect(page.items.map((c) => c.name)).toEqual(['Dong A Logistics', 'An Đông', 'Công ty Đông Á']);
    expect(page).toMatchObject({ total: 3, page: 1, pageSize: 20 });
  });

  it('phân trang 20/trang, total đếm mọi kết quả', async () => {
    const rows = Array.from({ length: 45 }, (_, i) => company(`${i}`, `Công ty ${String(i).padStart(2, '0')}`));
    const service = new CompanyService(new InMemoryCompanyRepository(rows));
    expect((await service.list({ page: 3 })).items.map((c) => c.name)).toEqual(
      ['Công ty 40', 'Công ty 41', 'Công ty 42', 'Công ty 43', 'Công ty 44'],
    );
    expect(await service.list({ page: 9 })).toMatchObject({ items: [], total: 45, page: 9 });
  });
});

describe('CompanyService.update', () => {
  it('chỉ đổi trường được truyền, null xóa trường; công ty không tồn tại → null', async () => {
    const service = new CompanyService(
      new InMemoryCompanyRepository([{ ...company('1', 'ACME'), about: 'Cũ', website: 'https://acme.vn' }]),
    );
    const { openPostings: _, ...expected } = { ...company('1', 'ACME Corp'), website: 'https://acme.vn' };
    expect(await service.update('1' as CompanyId, { name: 'ACME Corp', about: null })).toStrictEqual(expected);
    expect(await service.update('2' as CompanyId, { name: 'X' })).toBeNull();
  });
});
