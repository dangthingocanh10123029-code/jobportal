// Visit every page per role on production: HTTP status, error UI, console errors, broken images, mobile overflow.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE ?? 'https://jobportal-sigma-five.vercel.app';
const DIR = new URL('./shots/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const PW = 'DemoJob!2026';

const ROLES = {
  guest: { email: null, routes: ['/', '/?page=2', '/companies', '/guide', '/login', '/signup', '/notfound-xyz'],
    follow: [['/', /^\/jobs\/[0-9a-f-]{36}$/], ['/companies', /^\/companies\/[0-9a-f-]{36}$/], ['/guide', /^\/guide\/[^/?]+$/]] },
  candidate: { email: 'ta.minh.chau@demo.jobportal.test',
    routes: ['/account', '/candidate/profile', '/candidate/applications', '/candidate/saved', '/candidate/alerts', '/candidate/cv',
      '/candidate/cv/print', '/interviews', '/messages', '/notifications', '/'],
    follow: [['/candidate/applications', /^\/candidate\/applications\/[0-9a-f-]{36}$/], ['/messages', /^\/messages\/[0-9a-f-]{36}$/]] },
  employer: { email: 'doithong-erp@demo.jobportal.test',
    routes: ['/account', '/employer/dashboard', '/employer/company', '/employer/postings', '/employer/postings/new', '/employer/talent',
      '/employer/talent/saved', '/employer/billing', '/interviews', '/messages', '/notifications'],
    follow: [['/employer/postings', /^\/employer\/postings\/[0-9a-f-]{36}\/applications$/], ['/employer/postings', /^\/employer\/postings\/[0-9a-f-]{36}\/edit$/],
      ['/employer/talent', /^\/employer\/talent\/[0-9a-f-]{36}$/], ['/messages', /^\/messages\/[0-9a-f-]{36}$/]] },
  admin: { email: 'admin@demo.jobportal.test',
    routes: ['/admin', '/admin/users', '/admin/companies', '/admin/postings', '/admin/reviews', '/admin/articles', '/admin/articles/new',
      '/admin/packages', '/admin/orders', '/admin/audit', '/account'],
    follow: [['/admin/users', /^\/admin\/users\/[0-9a-f-]{36}$/], ['/admin/articles', /^\/admin\/articles\/[0-9a-f-]{36}$/]] },
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let pages = 0;

async function visit(page, role, path, errors) {
  errors.length = 0;
  const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 }).then(async (r) => { await page.waitForTimeout(1500); return r; }).catch((e) => ({ status: () => `ERR ${e.message.split('\n')[0]}` }));
  const status = res?.status?.();
  const finalPath = new URL(page.url()).pathname;
  const info = await page.evaluate(() => ({
    errorUi: /Application error|Đã xảy ra lỗi|Something went wrong|Internal Server Error/i.test(document.body.innerText),
    is404: /Không tìm thấy trang|404/.test(document.title + document.body.innerText.slice(0, 600)),
    broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src).slice(0, 3),
    h1: document.querySelector('h1')?.innerText ?? '',
  }));
  const overflowDesk = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.setViewportSize({ width: 1440, height: 900 });
  const overflowWide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.setViewportSize({ width: 375, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `${DIR}${role}${path.replace(/[/?=]/g, '_') || '_home'}-m.png` }).catch(() => {});
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${DIR}${role}${path.replace(/[/?=]/g, '_') || '_home'}.png`, fullPage: true }).catch(() => {});
  pages += 1;
  const issues = [];
  const notFoundExpected = path === '/notfound-xyz';
  if (typeof status !== 'number' || (status >= 400 && !notFoundExpected)) issues.push(`HTTP ${status}`);
  if (info.errorUi) issues.push('error UI');
  if (info.is404 && !notFoundExpected) issues.push('404 page');
  if (role !== 'guest' && finalPath.startsWith('/login')) issues.push('bị đẩy về /login');
  if (info.broken.length) issues.push(`ảnh hỏng ${info.broken.join(', ')}`);
  if (overflow) issues.push('tràn ngang 375px');
  if (overflowDesk) issues.push('tràn ngang 1280px');
  if (overflowWide) issues.push('tràn ngang 1440px');
  const errs = errors.filter((e) => !(notFoundExpected && e.includes('404')));
  if (errs.length) issues.push(`console: ${errs.slice(0, 2).join(' | ')}`);
  console.log(`${issues.length ? 'FAIL' : 'OK  '} ${role.padEnd(9)} ${path} → ${finalPath} [${status}] "${info.h1.slice(0, 50)}"${issues.length ? '\n       ' + issues.join('; ') : ''}`);
  if (issues.length) problems.push([role, path, issues]);
}

for (const [role, cfg] of Object.entries(ROLES)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(`pageerror ${e.message.slice(0, 160)}`));
  if (cfg.email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name=email]', cfg.email);
    await page.fill('input[name=password]', PW);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  }
  for (const path of cfg.routes) await visit(page, role, path, errors);
  for (const [from, re] of cfg.follow) {
    await page.goto(BASE + from, { waitUntil: 'load' });
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => new URL(a.href).pathname));
    const target = hrefs.find((h) => re.test(h));
    if (!target) { console.log(`SKIP ${role.padEnd(9)} không có link khớp ${re} trên ${from}`); problems.push([role, from, [`không tìm thấy link ${re}`]]); continue; }
    await visit(page, role, target, errors);
  }
  // Role guard: candidate/employer must not reach /admin; guest must not reach private pages.
  const guard = role === 'admin' ? null : role === 'guest' ? '/candidate/applications' : '/admin';
  if (guard) {
    await page.goto(BASE + guard, { waitUntil: 'load' });
    const p = new URL(page.url()).pathname;
    const ok = !p.startsWith(guard);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${role.padEnd(9)} chặn ${guard} → ${p}`);
    if (!ok) problems.push([role, guard, ['vào được trang không có quyền']]);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pages} trang, ${problems.length} vấn đề`);
for (const p of problems) console.log(' -', p[0], p[1], p[2].join('; '));
