// End-to-end run against the local dev server + real Supabase. Usage: node e2e.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const DIR = new URL('.', import.meta.url).pathname;
const PASSWORD = 'E2eTest!2026';
const EMPLOYER = 'e2e.employer@jobportal.test';
const CANDIDATE = 'e2e.candidate@jobportal.test';
const TITLE = `Kế toán tổng hợp E2E ${Date.now() % 100000}`;

// Minimal valid PDF (starts with %PDF-, passes the magic-byte check).
const pdf = `${DIR}cv-e2e.pdf`;
writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const notPdf = `${DIR}cv-e2e.txt`;
const logoPng = `${DIR}logo-e2e.png`;
writeFileSync(logoPng, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const noOverflow = async (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
writeFileSync(notPdf, 'not a pdf');

const results = [];
let step = 0;
async function check(name, page, fn) {
  step += 1;
  try {
    await fn();
    results.push(['PASS', name]);
    console.log(`PASS ${step}. ${name}`);
  } catch (error) {
    results.push(['FAIL', name]);
    const shot = `${DIR}fail-${step}.png`;
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.log(`FAIL ${step}. ${name}\n     ${String(error.message).split('\n')[0]}\n     screenshot: ${shot}`);
  }
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const employerCtx = await browser.newContext();
const candidateCtx = await browser.newContext();
const guestCtx = await browser.newContext();
const emp = await employerCtx.newPage();
const cand = await candidateCtx.newPage();
const guest = await guestCtx.newPage();
for (const p of [emp, cand, guest]) {
  p.setDefaultTimeout(45000);
  p.setDefaultNavigationTimeout(60000);
  p.on('dialog', (d) => d.accept());
}

// ---------- Guards ----------
await check('Khách vào /employer/postings bị chuyển về /login?next=…', guest, async () => {
  await guest.goto(`${BASE}/employer/postings`);
  await guest.waitForURL(/\/login\?next=%2Femployer%2Fpostings/);
});
await check('Đăng nhập sai mật khẩu báo lỗi', guest, async () => {
  await guest.goto(`${BASE}/login`);
  await guest.fill('input[name=email]', EMPLOYER);
  await guest.fill('input[name=password]', 'sai-mat-khau');
  await guest.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await guest.getByText('Email hoặc mật khẩu không đúng').waitFor();
});

// ---------- Employer creates + publishes ----------
await check('Nhà tuyển dụng đăng nhập', emp, () => login(emp, EMPLOYER));
await check('Header hiện "Tin tuyển dụng" cho Nhà tuyển dụng', emp, async () => {
  await emp.getByRole('link', { name: 'Tin tuyển dụng' }).first().waitFor();
});
await check('Hồ sơ công ty: website javascript: bị chặn', emp, async () => {
  await emp.goto(`${BASE}/employer/company`);
  await emp.fill('#company-about', 'Công ty E2E chuyên dịch vụ kế toán cho doanh nghiệp vừa và nhỏ.');
  await emp.selectOption('#company-size', { index: 2 });
  await emp.fill('#company-address', '12 Bạch Đằng, Hải Châu, Đà Nẵng');
  await emp.fill('#company-website', 'javascript:alert(1)');
  await emp.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await emp.getByText('Website phải bắt đầu bằng http:// hoặc https://').waitFor();
  if (await emp.getByText('Đã lưu hồ sơ công ty.').count()) throw new Error('lưu được website javascript:');
});
await check('Hồ sơ công ty: lưu hợp lệ', emp, async () => {
  await emp.fill('#company-website', 'https://e2e.example');
  await emp.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await emp.getByText('Đã lưu hồ sơ công ty.').waitFor();
});
await check('Logo: file không phải ảnh bị chặn ở form', emp, async () => {
  await emp.setInputFiles('#company-logo', notPdf);
  await emp.getByText('Logo phải là ảnh PNG, JPEG hoặc WebP.').waitFor();
});
await check('Logo: upload PNG → trang công ty công khai hiện logo + giới thiệu', emp, async () => {
  await emp.setInputFiles('#company-logo', logoPng);
  await emp.getByRole('button', { name: 'Tải logo lên' }).click();
  await emp.getByText('Đã cập nhật logo công ty.').waitFor();
  await guest.goto(`${BASE}/companies/e2e00000-0000-4000-8000-0000000000e1`);
  await guest.getByText('Công ty E2E chuyên dịch vụ kế toán').waitFor();
  const src = await guest.locator('img[src*="company-logos"]').first().getAttribute('src');
  if (!src) throw new Error('không thấy logo từ bucket company-logos');
  const res = await guest.request.get(src.startsWith('http') ? src : `${BASE}${src}`);
  if (res.status() !== 200) throw new Error(`logo HTTP ${res.status()}`);
});
await check('Tạo tin: lương min > max bị chặn ở form', emp, async () => {
  await emp.goto(`${BASE}/employer/postings/new`);
  await emp.fill('input[name=title]', TITLE);
  await emp.fill('textarea[name=description]', 'Phụ trách sổ sách kế toán, báo cáo thuế hàng tháng cho công ty.');
  await emp.fill('input[name=location]', 'Đà Nẵng');
  await emp.selectOption('select[name=employmentType]', 'FULL_TIME');
  await emp.selectOption('select[name=industry]', 'ACCOUNTING_FINANCE');
  await emp.selectOption('select[name=level]', 'MIDDLE');
  await emp.fill('input[name=experienceYears]', '2');
  await emp.fill('input[name=headcount]', '3');
  await emp.getByPlaceholder('Nhập kỹ năng rồi nhấn Enter').fill('Excel');
  await emp.getByPlaceholder('Nhập kỹ năng rồi nhấn Enter').press('Enter');
  await emp.getByPlaceholder('Nhập kỹ năng rồi nhấn Enter').fill('MISA');
  await emp.getByPlaceholder('Nhập kỹ năng rồi nhấn Enter').press('Enter');
  await emp.fill('textarea[name=requirements]', 'Tốt nghiệp chuyên ngành kế toán, thành thạo Excel và MISA.');
  await emp.fill('textarea[name=benefits]', 'Lương tháng 13, bảo hiểm đầy đủ, du lịch hằng năm.');
  await emp.fill('input[name=salaryMin]', '20000000');
  await emp.fill('input[name=salaryMax]', '10000000');
  const d = new Date(Date.now() + 7 * 864e5);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  await emp.fill('input[name=applicationDeadline]', local);
  await emp.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await emp.getByText('Mức lương tối thiểu không thể cao hơn mức lương tối đa').waitFor();
});
await check('Lưu bản nháp thành công, tin hiện badge "Bản nháp"', emp, async () => {
  await emp.fill('input[name=salaryMin]', '10000000');
  await emp.fill('input[name=salaryMax]', '20000000');
  await emp.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await emp.waitForURL(`${BASE}/employer/postings`);
  const card = emp.locator('article', { hasText: TITLE });
  await card.getByText('Bản nháp').waitFor();
});
await check('Tin nháp KHÔNG hiện ở trang chủ', guest, async () => {
  await guest.goto(`${BASE}/?q=${encodeURIComponent(TITLE)}`);
  await guest.getByText('Không tìm thấy tin phù hợp').waitFor();
});
await check('Đăng tin → badge "Đang đăng"', emp, async () => {
  const card = emp.locator('article', { hasText: TITLE });
  await card.getByRole('button', { name: 'Đăng tin' }).click();
  await card.getByText('Đang đăng').waitFor();
});

// ---------- Search ----------
await check('Tìm "ke toan tong hop e2e" (không dấu) ra tin', guest, async () => {
  await guest.goto(`${BASE}/?q=${encodeURIComponent('ke toan tong hop e2e')}`);
  await guest.getByRole('link', { name: TITLE }).first().waitFor();
});
await check('Lọc địa điểm "nang" + lương tối thiểu 15tr ra tin', guest, async () => {
  await guest.goto(`${BASE}/?q=e2e&location=nang&minSalary=15000000`);
  await guest.getByRole('link', { name: TITLE }).first().waitFor();
});
await check('Lọc lương tối thiểu 25tr KHÔNG ra tin', guest, async () => {
  await guest.goto(`${BASE}/?q=${encodeURIComponent(TITLE)}&minSalary=25000000`);
  await guest.getByText('Không tìm thấy tin phù hợp').waitFor();
});
await check('Lọc ngành Kế toán + kỹ năng "misa" + sắp xếp lương cao ra tin', guest, async () => {
  await guest.goto(`${BASE}/?industry=ACCOUNTING_FINANCE&skill=misa&sort=salary_desc&q=e2e`);
  await guest.getByRole('link', { name: TITLE }).first().waitFor();
});
await check('Lọc kinh nghiệm tối đa 1 năm KHÔNG ra tin (tin yêu cầu 2 năm)', guest, async () => {
  await guest.goto(`${BASE}/?exp=1&q=${encodeURIComponent(TITLE)}`);
  await guest.getByText('Không tìm thấy tin phù hợp').waitFor();
});
await check('Khách xem chi tiết tin thấy nút "Đăng nhập để ứng tuyển"', guest, async () => {
  await guest.getByRole('link', { name: 'Xóa bộ lọc' }).click().catch(() => {});
  await guest.goto(`${BASE}/?q=${encodeURIComponent(TITLE)}`);
  await guest.getByRole('link', { name: TITLE }).first().click();
  await guest.getByRole('link', { name: 'Đăng nhập để ứng tuyển' }).waitFor();
  await guest.getByText('Lương tháng 13, bảo hiểm đầy đủ').waitFor();
  await guest.getByText('MISA').first().waitFor();
});
await check('Tên công ty trên tin dẫn tới trang công ty', guest, async () => {
  const back = guest.url();
  try {
    await guest.getByRole('link', { name: 'Công ty E2E' }).first().click();
    await guest.waitForURL(/\/companies\//);
    await guest.getByText(TITLE).first().waitFor();
  } catch (error) {
    await guest.screenshot({ path: `${DIR}fail-company.png`, fullPage: true });
    throw error;
  } finally {
    await guest.goto(back);
  }
});
const jobUrl = guest.url();

// ---------- Candidate applies ----------
await check('Ứng viên đăng nhập', cand, () => login(cand, CANDIDATE));
await check('Ứng viên vào /employer/postings bị chuyển về /', cand, async () => {
  await cand.goto(`${BASE}/employer/postings`);
  await cand.waitForURL(`${BASE}/`);
});
await check('/account: SĐT sai bị chặn, SĐT đúng lưu được và còn sau khi tải lại', cand, async () => {
  await cand.goto(`${BASE}/account`);
  await cand.fill('input[name=phone]', 'abc');
  await cand.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await cand.getByRole('alert').first().waitFor();
  await cand.fill('input[name=phone]', '0901 234 567');
  await cand.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await cand.getByRole('status').first().waitFor();
  await cand.reload();
  if ((await cand.inputValue('input[name=phone]')) !== '0901 234 567') throw new Error('SĐT chưa lưu');
});
await check('Ứng viên cập nhật hồ sơ (headline)', cand, async () => {
  await cand.goto(`${BASE}/candidate/profile`);
  await cand.fill('input[name=headline]', 'Kế toán viên E2E 3 năm kinh nghiệm');
  await cand.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await cand.getByRole('button', { name: 'Lưu hồ sơ' }).waitFor();
  await cand.waitForTimeout(1500);
  await cand.reload();
  if ((await cand.inputValue('input[name=headline]')) !== 'Kế toán viên E2E 3 năm kinh nghiệm') throw new Error('headline chưa lưu');
});
await check('Ứng viên lưu tin (♥) → có trong "Việc đã lưu"', cand, async () => {
  await cand.goto(jobUrl);
  await cand.getByRole('button', { name: 'Lưu việc làm' }).first().click();
  // Optimistic toggle: wait until the server action settles (button re-enabled) before leaving the page.
  await cand.locator('button[aria-pressed=true]:not([disabled])').first().waitFor();
  await cand.goto(`${BASE}/candidate/saved`);
  await cand.getByRole('link', { name: TITLE }).first().waitFor();
});
await check('File không phải PDF bị chặn ở form', cand, async () => {
  await cand.goto(jobUrl);
  await cand.setInputFiles('#resume-file', notPdf);
  await cand.getByText('CV phải là file PDF').waitFor();
});
await check('Nộp CV PDF thành công → "Đã nộp hồ sơ"', cand, async () => {
  await cand.setInputFiles('#resume-file', pdf);
  await cand.getByRole('button', { name: 'Nộp hồ sơ' }).click();
  await cand.getByText('Đã nộp hồ sơ').first().waitFor();
});
await check('Tải lại trang vẫn hiện "Đã nộp hồ sơ", không còn form', cand, async () => {
  await cand.reload();
  await cand.getByText('Đã nộp hồ sơ').first().waitFor();
  if (await cand.locator('#resume-file').count()) throw new Error('form vẫn còn');
});
await check('"Đơn ứng tuyển" có đơn trạng thái "Đã nộp"', cand, async () => {
  await cand.goto(`${BASE}/candidate/applications`);
  await cand.getByRole('link', { name: TITLE }).first().waitFor();
  await cand.getByText('Đã nộp').first().waitFor();
});

// ---------- Employer reviews ----------
await check('Nhà tuyển dụng thấy đơn: tên + trạng thái', emp, async () => {
  await emp.goto(`${BASE}/employer/postings`);
  await emp.locator('article', { hasText: TITLE }).getByRole('link', { name: 'Xem hồ sơ' }).click();
  await emp.getByRole('heading', { name: 'Ứng viên E2E' }).waitFor();
  await emp.getByText('Kế toán viên E2E 3 năm kinh nghiệm').first().waitFor();
});
await check('Tải CV: mở signed URL trả về PDF', emp, async () => {
  const [popup] = await Promise.all([emp.waitForEvent('popup'), emp.getByRole('button', { name: 'Tải CV' }).click()]);
  await popup.waitForURL(/supabase\.co\/storage\/v1\/object\/sign\/resumes\//, { timeout: 20000 });
  const res = await emp.request.get(popup.url());
  if (res.status() !== 200) throw new Error(`HTTP ${res.status()}`);
  const body = await res.body();
  if (!body.subarray(0, 5).toString().startsWith('%PDF-')) throw new Error('không phải PDF');
  await popup.close();
});
await check('Chỉ hiện nút hợp lệ ở SUBMITTED (không có "Gửi đề nghị")', emp, async () => {
  await emp.getByRole('button', { name: 'Bắt đầu xem xét' }).waitFor();
  if (await emp.getByRole('button', { name: 'Gửi đề nghị' }).count()) throw new Error('hiện nút nhảy cóc');
});
await check('Chuyển SUBMITTED → REVIEWING', emp, async () => {
  await emp.getByRole('button', { name: 'Bắt đầu xem xét' }).click();
  await emp.getByText('Đang xem xét').first().waitFor();
  await emp.getByRole('button', { name: 'Mời phỏng vấn' }).waitFor();
});

await check('Employer: chuông có thông báo đơn mới, dashboard đếm đơn', emp, async () => {
  await emp.goto(`${BASE}/notifications`);
  await emp.getByText(TITLE).first().waitFor();
  await emp.goto(`${BASE}/employer/dashboard`);
  await emp.getByRole('link', { name: TITLE }).first().waitFor();
});
await check('Thông báo: chuông có số chưa đọc → "Đánh dấu tất cả đã đọc" → 0', emp, async () => {
  const bell = emp.getByRole('link', { name: /^Thông báo, \d+ chưa đọc$/ });
  const before = Number((await bell.getAttribute('aria-label')).match(/(\d+)/)[1]);
  if (before < 1) throw new Error('chuông không có thông báo chưa đọc');
  await emp.goto(`${BASE}/notifications`);
  await emp.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await emp.getByRole('link', { name: 'Thông báo, 0 chưa đọc' }).waitFor();
  if (await emp.locator('.notification-unread').count()) throw new Error('vẫn còn thông báo chưa đọc');
});
// ---------- Candidate sees history + withdraws ----------
await check('Ứng viên có thông báo đổi trạng thái', cand, async () => {
  await cand.goto(`${BASE}/notifications`);
  await cand.getByText(TITLE).first().waitFor();
});
await check('Ứng viên thấy lịch sử SUBMITTED → REVIEWING', cand, async () => {
  await cand.goto(`${BASE}/candidate/applications`);
  await cand.getByRole('link', { name: TITLE }).first().click();
  await cand.getByText('Đã nộp → Đang xem xét').waitFor();
});
await check('Rút hồ sơ có bước xác nhận → "Đã rút hồ sơ"', cand, async () => {
  await cand.getByRole('button', { name: 'Rút hồ sơ' }).click();
  await cand.getByRole('button', { name: 'Xác nhận rút' }).click();
  await cand.getByText('Đã rút hồ sơ').first().waitFor();
  await cand.waitForTimeout(500);
  if (await cand.getByRole('button', { name: 'Rút hồ sơ' }).count()) throw new Error('nút rút vẫn còn');
});
await check('Nhà tuyển dụng thấy "Đã rút hồ sơ", không còn nút chuyển trạng thái', emp, async () => {
  await emp.reload();
  await emp.getByText('Đã rút hồ sơ').first().waitFor();
  if (await emp.getByRole('button', { name: 'Mời phỏng vấn' }).count()) throw new Error('vẫn còn nút');
});

// ---------- Close posting ----------
await check('Đóng tin → trang chi tiết báo "không còn nhận hồ sơ"', emp, async () => {
  await emp.goto(`${BASE}/employer/postings`);
  const card = emp.locator('article', { hasText: TITLE });
  await card.getByRole('button', { name: 'Đóng tin' }).click();
  await card.getByText('Đã đóng').waitFor();
  await guest.goto(jobUrl);
  await guest.getByText('Tin tuyển dụng này không còn nhận hồ sơ').waitFor();
});

// ---------- Pagination (dữ liệu demo > 20 tin / công ty) ----------
await check('Phân trang trang chủ: Trang sau → page=2, giữ bộ lọc ngành', guest, async () => {
  await guest.goto(`${BASE}/?industry=IT_SOFTWARE`);
  const first = await guest.locator('[aria-label="Danh sách việc làm đang mở"] h3').first().innerText();
  await guest.getByRole('link', { name: 'Trang sau →' }).click();
  await guest.waitForURL(/page=2/);
  if (!guest.url().includes('industry=IT_SOFTWARE')) throw new Error('mất bộ lọc khi chuyển trang');
  const second = await guest.locator('[aria-label="Danh sách việc làm đang mở"] h3').first().innerText();
  if (first === second) throw new Error('trang 2 trùng trang 1');
  await guest.getByRole('link', { name: '← Trang trước' }).waitFor();
});
await check('Phân trang /companies: Trang sau → page=2', guest, async () => {
  await guest.goto(`${BASE}/companies`);
  await guest.getByRole('link', { name: 'Trang sau →' }).click();
  await guest.waitForURL(/page=2/);
  await guest.locator('[aria-label="Danh sách công ty"] a').first().waitFor();
});

// ---------- Mobile 360px ----------
await check('Điện thoại 360px: trang chủ, tin, công ty, đăng nhập không tràn ngang', guest, async () => {
  const mobile = await browser.newPage({ viewport: { width: 360, height: 740 } });
  mobile.setDefaultTimeout(45000); mobile.setDefaultNavigationTimeout(60000);
  try {
    for (const path of ['/', jobUrl.replace(BASE, ''), '/companies', '/login', '/signup']) {
      await mobile.goto(`${BASE}${path}`);
      if (!(await noOverflow(mobile))) throw new Error(`tràn ngang ở ${path}`);
    }
    await mobile.getByRole('link', { name: 'Job Portal, trang chủ' }).waitFor();
  } finally {
    await mobile.close();
  }
});
await check('Điện thoại 360px: trang Ứng viên đã đăng nhập không tràn ngang', cand, async () => {
  await cand.setViewportSize({ width: 360, height: 740 });
  try {
    for (const path of ['/candidate/applications', '/candidate/saved', '/candidate/profile', '/notifications']) {
      await cand.goto(`${BASE}${path}`);
      if (!(await noOverflow(cand))) throw new Error(`tràn ngang ở ${path}`);
    }
  } finally {
    await cand.setViewportSize({ width: 1280, height: 720 });
  }
});

// ---------- Sign out ----------
await check('Đăng xuất → về /login, header có "Đăng nhập"', cand, async () => {
  await cand.goto(`${BASE}/`);
  await cand.getByRole('button', { name: 'Đăng xuất' }).click();
  await cand.waitForURL(/\/login/);
  await cand.goto(`${BASE}/candidate/applications`);
  await cand.waitForURL(/\/login\?next=/);
});

await browser.close();
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
