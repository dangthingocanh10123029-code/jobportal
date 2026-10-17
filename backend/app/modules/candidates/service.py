from app.errors import DomainError
from app.modules.candidates.repository import CandidateRepository


class CandidateService:
    def __init__(self, repo: CandidateRepository):
        self.repo = repo

    def get(self, user_id):
        return self.repo.profile(user_id)

    def update(self, user_id, values):
        changes = {}
        for key, label, maximum in (
            ("headline", "Tiêu đề hồ sơ", 150),
            ("experience", "Kinh nghiệm", 5000),
            ("education", "Học vấn", 5000),
        ):
            if key in values:
                value = values[key]
                if not isinstance(value, str):
                    raise DomainError(422, f"{label} không hợp lệ")
                value = value.strip()
                if len(value) > maximum:
                    raise DomainError(422, f"{label} tối đa {maximum} ký tự")
                changes[key] = value or None
        if "skills" in values:
            skills = values["skills"]
            if not isinstance(skills, list):
                raise DomainError(422, "Kỹ năng không hợp lệ")
            if len(skills) > 20:
                raise DomainError(422, "Tối đa 20 kỹ năng")
            if any(not isinstance(skill, str) for skill in skills):
                raise DomainError(422, "Kỹ năng không hợp lệ")
            normalized = [skill.strip() for skill in skills]
            if any(not skill for skill in normalized):
                raise DomainError(422, "Kỹ năng không được để trống")
            if any(len(skill) > 30 for skill in normalized):
                raise DomainError(422, "Mỗi kỹ năng tối đa 30 ký tự")
            if len({skill.lower() for skill in normalized}) != len(normalized):
                raise DomainError(422, "Kỹ năng bị trùng")
            changes["skills"] = normalized
        profile = self.repo.update_profile(user_id, changes)
        if profile is None:
            raise DomainError(404, "Không tìm thấy hồ sơ ứng viên")
        return profile

    def applicant(self, application_id):
        return self.repo.applicant_profile(application_id)

    def toggle(self, user_id, posting_id):
        saved = self.repo.toggle_saved(user_id, posting_id)
        if saved is None:
            raise DomainError(404, "Không tìm thấy tin tuyển dụng")
        return {"saved": saved}

    def saved(self, user_id):
        return self.repo.saved(user_id)

    def saved_ids(self, user_id):
        return self.repo.saved_ids(user_id)
