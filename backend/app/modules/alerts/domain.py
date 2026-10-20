from app.errors import DomainError

ALERT_LIMIT = 5  # alerts per Candidate, = job_alerts_limit trigger
RECOMMENDATION_LIMIT = 10  # = recommended_postings()

_ERRORS = {
    "ALERT_NOT_FOUND": (404, "Không tìm thấy thông báo việc làm"),
    "ALERT_LIMIT": (409, "Bạn chỉ tạo được tối đa 5 thông báo việc làm"),
}


class AlertError(DomainError):
    """Business-rule refusal; the job_alerts_limit trigger (*_job_alerts.sql) raises the same code as message."""

    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(text: str) -> bool:
        return text in _ERRORS
