import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getConversation, listConversations } from '@/actions/messages';
import { AutoRefresh } from '@/components/messages/auto-refresh';
import { ChatThread } from '@/components/messages/chat-thread';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'Tin nhắn — Job Portal' };

export default async function ConversationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const [profile, conversations, thread] = await Promise.all([getCurrentProfile(), listConversations(), getConversation(applicationId)]);
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/messages/${applicationId}`)}`);
  if (!thread) notFound();

  return (
    <main className="page-shell messages-page">
      <AutoRefresh />
      <div className="messages-layout has-active">
        <nav aria-label="Cuộc trò chuyện" className="messages-sidebar">
          <h2>Tin nhắn</h2>
          <ConversationList activeId={applicationId} conversations={conversations} />
        </nav>
        <ChatThread conversation={thread.conversation} hasMore={thread.hasMore} key={applicationId} messages={thread.messages} />
      </div>
    </main>
  );
}
