export type ApplicationErrorCode = 'ALREADY_APPLIED' | 'POSTING_NOT_OPEN' | 'INVALID_RESUME';

const MESSAGES: Record<ApplicationErrorCode, string> = {
  ALREADY_APPLIED: 'Bạn đã nộp hồ sơ cho tin này rồi',
  POSTING_NOT_OPEN: 'Tin tuyển dụng không còn nhận hồ sơ',
  INVALID_RESUME: 'CV phải là file PDF, tối đa 5 MB',
};

/** Business-rule violation; `message` is Vietnamese and safe to show to the user. */
export class ApplicationError extends Error {
  constructor(readonly code: ApplicationErrorCode) {
    super(MESSAGES[code]);
    this.name = 'ApplicationError';
  }
}

export function isApplicationErrorCode(text: string): text is ApplicationErrorCode {
  return text in MESSAGES;
}
