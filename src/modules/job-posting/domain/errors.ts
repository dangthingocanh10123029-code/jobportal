export type JobPostingErrorCode =
  | 'NOT_FOUND'
  | 'NOT_EDITABLE'
  | 'INVALID_TRANSITION'
  | 'DEADLINE_NOT_IN_FUTURE'
  | 'INVALID_SALARY';

const MESSAGES: Record<JobPostingErrorCode, string> = {
  NOT_FOUND: 'Không tìm thấy tin tuyển dụng',
  NOT_EDITABLE: 'Tin đã đóng, không thể sửa',
  INVALID_TRANSITION: 'Không thể chuyển tin sang trạng thái này',
  DEADLINE_NOT_IN_FUTURE: 'Hạn nộp hồ sơ phải ở tương lai',
  INVALID_SALARY: 'Lương tối thiểu không được lớn hơn lương tối đa',
};

/** Business-rule violation; `message` is Vietnamese and safe to show to the user. */
export class JobPostingError extends Error {
  constructor(readonly code: JobPostingErrorCode) {
    super(MESSAGES[code]);
    this.name = 'JobPostingError';
  }
}
