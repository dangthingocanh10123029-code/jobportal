import { z } from 'zod';
import { applicationIdSchema } from './applications-schema';

// Same rule and message as backend/app/modules/messages/schemas.py and the messages table CHECK.
const BODY_ERROR = 'Tin nhắn từ 1 đến 2000 ký tự';

export const sendMessageSchema = z.object({
  applicationId: applicationIdSchema,
  body: z.string({ required_error: BODY_ERROR, invalid_type_error: BODY_ERROR }).trim().min(1, BODY_ERROR).max(2000, BODY_ERROR),
});

export const markConversationReadSchema = z.object({ applicationId: applicationIdSchema });

/** `before` cursor: createdAt of the oldest message already shown. */
export const beforeSchema = z.string().datetime({ offset: true }).optional();
