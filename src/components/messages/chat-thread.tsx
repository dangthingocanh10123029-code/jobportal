'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getConversation, markConversationReadAction, sendMessageAction } from '@/actions/messages';
import type { Conversation, Message } from '@/actions/types';
import { formatMessageTime, mergeMessages } from './thread';

export function ChatThread({ conversation, messages: latest, hasMore: latestHasMore }: { conversation: Conversation; messages: Message[]; hasMore: boolean }) {
  const router = useRouter();
  const [older, setOlder] = useState<Message[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const hasMore = olderHasMore ?? latestHasMore;
  const messages = mergeMessages(older, latest);
  const lastId = messages.at(-1)?.id;
  const hasUnread = latest.some((message) => !message.mine && !message.readAt);
  const { applicationId } = conversation;

  // Keep the newest message in view when one arrives; loading older pages does not change lastId.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    if (!hasUnread) return;
    markConversationReadAction({ applicationId }).then((result) => {
      if (result.success) router.refresh();
    }, () => {});
  }, [applicationId, hasUnread, lastId, router]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    setError('');
    try {
      const page = await getConversation(applicationId, oldest.createdAt);
      if (!page) throw new Error();
      setOlder((current) => mergeMessages(page.messages, current));
      setOlderHasMore(page.hasMore);
    } catch {
      setError('Không tải được tin cũ hơn, vui lòng thử lại');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await sendMessageAction({ applicationId, body });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraft('');
      router.refresh();
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label={`Trò chuyện với ${conversation.otherPartyName}`} className="chat-thread">
      <header className="chat-header">
        <Link className="chat-back" href="/messages">← Tất cả tin nhắn</Link>
        <h1>{conversation.otherPartyName}</h1>
        <p>{conversation.postingTitle}</p>
      </header>

      <div className="chat-messages" ref={scroller}>
        {hasMore ? (
          <button className="button button-quiet button-small chat-older" disabled={loadingOlder} onClick={loadOlder} type="button">
            {loadingOlder ? 'Đang tải…' : 'Tải tin cũ hơn'}
          </button>
        ) : null}
        {messages.length === 0 ? <p className="chat-empty">Chưa có tin nhắn nào. Hãy gửi lời chào!</p> : null}
        <ol aria-label="Tin nhắn" className="chat-list">
          {messages.map((message) => (
            <li className={`chat-bubble${message.mine ? ' is-mine' : ''}`} key={message.id}>
              <span className="visually-hidden">{message.mine ? 'Bạn' : conversation.otherPartyName}: </span>
              <p>{message.body}</p>
              <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}{message.mine && message.readAt ? ' · Đã xem' : ''}</time>
            </li>
          ))}
        </ol>
      </div>

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="visually-hidden" htmlFor="chat-input">Nội dung tin nhắn</label>
        <textarea
          aria-describedby={conversation.canSend ? undefined : 'chat-locked'}
          className="text-input textarea-input chat-input"
          disabled={!conversation.canSend}
          id="chat-input"
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // isComposing: Vietnamese IME confirms a word with Enter.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={conversation.canSend ? 'Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)' : 'Không thể gửi tin nhắn'}
          readOnly={sending}
          rows={2}
          value={draft}
        />
        <button className="button button-primary" disabled={!conversation.canSend || sending || !draft.trim()} type="submit">{sending ? 'Đang gửi…' : 'Gửi'}</button>
      </form>
      {conversation.canSend ? null : <p className="chat-locked" id="chat-locked">Hồ sơ đã kết thúc, không thể gửi tin nhắn.</p>}
      <p aria-live="polite" className="form-error chat-error" role={error ? 'alert' : undefined}>{error}</p>
    </section>
  );
}
