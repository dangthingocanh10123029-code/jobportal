import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-image" role="img" aria-label="Không gian làm việc truyền cảm hứng" />
      <section className="auth-panel">
        <div className="auth-content">
          <span className="eyebrow">Chào mừng trở lại</span>
          <h1>Đăng nhập</h1>
          <p className="page-intro">Tiếp tục hành trình tìm kiếm cơ hội phù hợp với bạn.</p>
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
