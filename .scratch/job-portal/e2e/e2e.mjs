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
  p.setDefaultTimeout(20000);
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
await check('Tạo tin: lương min > max bị chặn ở form', emp, async () => {
  await emp.goto(`${BASE}/employer/postings/new`);
  await emp.fill('input[name=title]', TITLE);
  await emp.fill('textarea[name=description]', 'Phụ trách sổ sách kế toán, báo cáo thuế hàng tháng cho công ty.');
  await emp.fill('input[name=location]', 'Đà Nẵng');
  await emp.selectOption('select[name=employmentType]', 'FULL_TIME');
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
await check('Khách xem chi tiết tin thấy nút "Đăng nhập để ứng tuyển"', guest, async () => {
  await guest.getByRole('link', { name: 'Xóa bộ lọc' }).click().catch(() => {});
  await guest.goto(`${BASE}/?q=${encodeURIComponent(TITLE)}`);
  await guest.getByRole('link', { name: TITLE }).first().click();
  await guest.getByRole('link', { name: 'Đăng nhập để ứng tuyển' }).waitFor();
});
const jobUrl = guest.url();

// ---------- Candidate applies ----------
await check('Ứng viên đăng nhập', cand, () => login(cand, CANDIDATE));
await check('Ứng viên vào /employer/postings bị chuyển về /', cand, async () => {
  await cand.goto(`${BASE}/employer/postings`);
  await cand.waitForURL(`${BASE}/`);
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

// ---------- Candidate sees history + withdraws ----------
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
