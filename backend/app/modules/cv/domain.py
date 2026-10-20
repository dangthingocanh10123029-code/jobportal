from app.errors import DomainError

# Sizes = the candidate_cvs CHECKs (*_online_cv.sql) and cvSchema (Zod).
MAX_ITEMS = 15
MAX_SKILLS = 30
MAX_LANGUAGES = 10

_ERRORS = {
    "APPLICATION_NOT_FOUND": (404, "Không tìm thấy hồ sơ"),
}


class CvError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code
