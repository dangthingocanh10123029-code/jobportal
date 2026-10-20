'use client';

export default function GuideError({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <section className="surface-card companies-empty-state" role="alert">
        <h2>Không tải được cẩm nang</h2>
        <p>Hệ thống đang bận. Vui lòng thử lại sau ít phút.</p>
        <button className="button button-primary" onClick={reset} type="button">Thử lại</button>
      </section>
    </main>
  );
}
