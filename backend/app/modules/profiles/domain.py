from dataclasses import dataclass
from typing import Literal

ProfileRole = Literal["CANDIDATE", "EMPLOYER"]


@dataclass(frozen=True)
class Profile:
    user_id: str
    role: ProfileRole
    full_name: str | None
    phone: str | None
    company_name: str | None

    def json(self) -> dict:
        return {
            "userId": self.user_id,
            "role": self.role,
            "fullName": self.full_name,
            "phone": self.phone,
            "companyName": self.company_name,
        }
