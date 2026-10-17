import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppNotification, INotificationRepository, NotificationType, RecipientId } from '../domain/types';

type Row = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

const COLUMNS = 'id,type,title,body,link,read_at,created_at';

function toNotification(row: Row): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at && new Date(row.read_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Runs as the signed-in user: RLS on notifications limits every query to their own rows. */
export class SupabaseNotificationRepository implements INotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listRecent(recipientId: RecipientId, limit: number) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select(COLUMNS)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<Row[]>();
    if (error) throw new Error(`Không đọc được thông báo: ${error.message}`);
    return data.map(toNotification);
  }

  async countUnread(recipientId: RecipientId) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .is('read_at', null);
    if (error) throw new Error(`Không đếm được thông báo: ${error.message}`);
    return count ?? 0;
  }

  async markRead(recipientId: RecipientId, ids: string[] | undefined) {
    let query = this.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', recipientId)
      .is('read_at', null);
    if (ids !== undefined) query = query.in('id', ids);
    const { error } = await query;
    if (error) throw new Error(`Không cập nhật được thông báo: ${error.message}`);
  }
}
