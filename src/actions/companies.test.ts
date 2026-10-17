import { describe, expect, it } from 'vitest';
import { getCompany, updateMyCompanyAction, uploadCompanyLogoAction } from './companies';
import { companyFilterSchema, companyInputSchema, companyLogoSchema, MAX_LOGO_BYTES } from './companies-schema';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([1, 2, 3, 4], [...'WEBP'].map((c) => c.charCodeAt(0)));

const file = (bytes: number[], type: string, size = bytes.length) =>
  new File([new Uint8Array(bytes), new Uint8Array(Math.max(0, size - bytes.length))], 'logo', { type });

const form = (logo?: File) => {
  const data = new FormData();
  if (logo) data.set('logo', logo);
  return data;
};

// Invalid input is rejected before any API call, so no env/session is needed here.
describe('updateMyCompanyAction — input sai', () => {
  it.each([
    ['tên rỗng', { name: '   ' }, 'Vui lòng nhập tên công ty'],
    ['tên > 150 ký tự', { name: 'x'.repeat(151) }, 'Tên công ty tối đa 150 ký tự'],
    ['giới thiệu > 5000 ký tự', { about: 'x'.repeat(5001) }, 'Giới thiệu tối đa 5000 ký tự'],
    ['địa chỉ > 300 ký tự', { address: 'x'.repeat(301) }, 'Địa chỉ tối đa 300 ký tự'],
    ['quy mô lạ', { size: 'HUGE' }, 'Quy mô công ty không hợp lệ'],
    ['website không có giao thức', { website: 'acme.vn' }, 'Website phải bắt đầu bằng http:// hoặc https://'],
    ['website javascript:', { website: 'javascript:alert(1)' }, 'Website phải bắt đầu bằng http:// hoặc https://'],
    ['website ftp', { website: 'ftp://acme.vn' }, 'Website phải bắt đầu bằng http:// hoặc https://'],
    ['website > 300 ký tự', { website: `https://acme.vn/${'x'.repeat(290)}` }, 'Website tối đa 300 ký tự'],
  ])('%s', async (_, input, error) => {
    expect(await updateMyCompanyAction(input as never)).toEqual({ success: false, error });
  });
});

describe('companyInputSchema', () => {
  it('chuỗi rỗng (= xóa) giữ nguyên, trường bỏ trống giữ nguyên, cắt khoảng trắng', () => {
    expect(companyInputSchema.parse({ name: ' ACME ', about: '', address: '  ', website: ' https://acme.vn ', size: null })).toEqual({
      name: 'ACME',
      about: '',
      address: '',
      website: 'https://acme.vn',
      size: null,
    });
    expect(companyInputSchema.parse({})).toEqual({});
  });
});

describe('uploadCompanyLogoAction — file sai', () => {
  it.each([
    ['không có file', form(), 'Vui lòng chọn file logo'],
    ['file rỗng', form(file([], 'image/png')), 'Vui lòng chọn file logo'],
    ['SVG', form(file([...'<svg'].map((c) => c.charCodeAt(0)), 'image/svg+xml')), 'Logo phải là ảnh PNG, JPEG hoặc WebP'],
    ['> 1 MB', form(file(PNG, 'image/png', MAX_LOGO_BYTES + 1)), 'Logo tối đa 1 MB'],
    ['khai PNG nhưng nội dung JPEG', form(file(JPEG, 'image/png')), 'Logo phải là ảnh PNG, JPEG hoặc WebP'],
    ['khai WebP nhưng nội dung rác', form(file([1, 2, 3], 'image/webp')), 'Logo phải là ảnh PNG, JPEG hoặc WebP'],
  ])('%s', async (_, data, error) => {
    expect(await uploadCompanyLogoAction(data)).toEqual({ success: false, error });
  });

  it('không phải FormData', async () => {
    expect(await uploadCompanyLogoAction({} as never)).toEqual({ success: false, error: 'Dữ liệu không hợp lệ' });
  });
});

describe('companyLogoSchema', () => {
  it.each([
    [PNG, 'image/png', 'png'],
    [JPEG, 'image/jpeg', 'jpg'],
    [WEBP, 'image/webp', 'webp'],
  ])('nhận %#, đúng 1 MB', async (bytes, type, ext) => {
    const result = await companyLogoSchema.safeParseAsync(file(bytes, type, MAX_LOGO_BYTES));
    expect(result.success && result.data.ext).toBe(ext);
  });
});

describe('đọc công khai — input sai', () => {
  it('getCompany id không phải uuid → null', async () => {
    expect(await getCompany('abc')).toBeNull();
  });

  it('bộ lọc từ URL: rác → mặc định, q cắt khoảng trắng', () => {
    expect(companyFilterSchema.parse({ q: '  ', page: -3 })).toEqual({ q: undefined, page: 1 });
    expect(companyFilterSchema.parse({ q: ' FPT ', page: '2' })).toEqual({ q: 'FPT', page: 2 });
    expect(companyFilterSchema.parse('rác')).toEqual({ page: 1 });
  });
});
