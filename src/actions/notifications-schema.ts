import { z } from 'zod';

const notificationIdSchema = z
  .string({ invalid_type_error: 'Mã thông báo không hợp lệ' })
  .uuid('Mã thông báo không hợp lệ');

export const markNotificationsReadSchema = z.object({
  ids: z.array(notificationIdSchema, { invalid_type_error: 'Danh sách thông báo không hợp lệ' })
    .max(100, 'Tối đa 100 thông báo mỗi lần')
    .optional(),
});
