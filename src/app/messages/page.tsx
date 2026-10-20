import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { listConversations } from '@/actions/messages';
import { AutoRefresh } from '@/components/messages/auto-refresh';
import { ConversationList } from '@/components/messages/conversation-list';
import { MessagesSquare } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export const metadata = { title: 'Tin nhắn — Job Portal' };

export default async function MessagesPage() {
  const [profile, conversations] = await Promise.all([getCurrentProfile(), listConversations()]);
  if (!profile) redirect(`/login?next=${encodeURIComponent('/messages')}`);
  if (profile.role === 'ADMIN') redirect('/');

  return (
    <main className="page-shell messages-page">
      <AutoRefresh />
      <div className="messages-layout">
        <nav aria-label="Cuộc trò chuyện" className="messages-sidebar">
          <h1>Tin nhắn</h1>
          <ConversationList conversations={conversations} />
        </nav>
        <section className="messages-placeholder">
          <MessagesSquare {...icon} size={36} />
          <p>Chọn một cuộc trò chuyện để xem tin nhắn.</p>
        </section>
      </div>
    </main>
  );
}
