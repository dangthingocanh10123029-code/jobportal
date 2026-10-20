import Link from 'next/link';
import type { Conversation } from '@/actions/types';
import { formatMessageTime } from './thread';

export function ConversationList({ conversations, activeId }: { conversations: Conversation[]; activeId?: string }) {
  if (conversations.length === 0) {
    return <p className="conversation-empty">Chưa có cuộc trò chuyện nào. Tin nhắn gắn với từng đơn ứng tuyển đang xử lý.</p>;
  }
  return (
    <ul className="conversation-list">
      {conversations.map((conversation) => (
        <li key={conversation.applicationId}>
          <Link
            aria-current={conversation.applicationId === activeId ? 'page' : undefined}
            className={`conversation-item${conversation.unread > 0 ? ' is-unread' : ''}`}
            href={`/messages/${conversation.applicationId}`}
          >
            {conversation.otherPartyLogoUrl ? (
              <img alt="" className="conversation-avatar" height="40" src={conversation.otherPartyLogoUrl} width="40" />
            ) : (
              <span aria-hidden="true" className="conversation-avatar">{conversation.otherPartyName.charAt(0).toUpperCase()}</span>
            )}
            <span className="conversation-copy">
              <span className="conversation-top">
                <strong>{conversation.otherPartyName}</strong>
                {conversation.lastMessageAt ? <time dateTime={conversation.lastMessageAt}>{formatMessageTime(conversation.lastMessageAt)}</time> : null}
              </span>
              <span className="conversation-posting">{conversation.postingTitle}</span>
              <span className="conversation-preview">{conversation.lastMessage ?? 'Chưa có tin nhắn'}</span>
            </span>
            {conversation.unread > 0 ? <span className="conversation-unread" aria-label={`${conversation.unread} tin chưa đọc`}>{conversation.unread > 99 ? '99+' : conversation.unread}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
