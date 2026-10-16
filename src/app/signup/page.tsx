import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export default function SignupPage() {
  return (
    <main className="auth-page">
      <div className="auth-image" role="img" aria-label="Không gian làm việc truyền cảm hứng" />
      <section className="auth-panel">
        <div className="auth-content">
          <span className="eyebrow">Bắt đầu miễn phí</span>
          <h1>Tạo tài khoản</h1>
          <p className="page-intro">Một hồ sơ tốt mở ra cơ hội nghề nghiệp mới.</p>
          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
