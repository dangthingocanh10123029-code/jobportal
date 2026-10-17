import re

from app.errors import DomainError
from app.modules.profiles.repository import ProfileRepository

PHONE = re.compile(r"^\+?[0-9 .-]{8,20}$")


class ProfileService:
    def __init__(self, repo: ProfileRepository):
        self.repo = repo

    def get(self, user_id: str):
        return self.repo.get(user_id)

    def update(self, user_id: str, values: dict):
        current = self.repo.get(user_id)
        if current is None:
            raise DomainError(404, "Không tìm thấy hồ sơ tài khoản")

        changes = {}
        if "fullName" in values:
            name = values["fullName"]
            if not isinstance(name, str) or not name.strip():
                raise DomainError(422, "Vui lòng nhập họ tên")
            name = name.strip()
            if len(name) > 100:
                raise DomainError(422, "Họ tên tối đa 100 ký tự")
            changes["full_name"] = name
        if "phone" in values:
            phone = values["phone"]
            if not isinstance(phone, str):
                raise DomainError(422, "Số điện thoại không hợp lệ")
            phone = phone.strip()
            if phone and not PHONE.fullmatch(phone):
                raise DomainError(422, "Số điện thoại không hợp lệ")
            changes["phone"] = phone or None
        if "companyName" in values:
            company_name = values["companyName"]
            if not isinstance(company_name, str) or not company_name.strip():
                raise DomainError(422, "Vui lòng nhập tên công ty")
            company_name = company_name.strip()
            if len(company_name) > 150:
                raise DomainError(422, "Tên công ty tối đa 150 ký tự")
            if current.role == "EMPLOYER":
                changes["company_name"] = company_name

        if not changes:
            return current
        profile = self.repo.update(user_id, changes)
        if profile is None:
            raise DomainError(404, "Không tìm thấy hồ sơ tài khoản")
        return profile
