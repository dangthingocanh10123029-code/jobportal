from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateProfile:
    user_id: str
    full_name: str
    phone: str | None
    headline: str | None = None
    skills: list[str] | None = None
    experience: str | None = None
    education: str | None = None

    def json(self):
        return {
            "userId": self.user_id,
            "fullName": self.full_name,
            "phone": self.phone,
            "headline": self.headline,
            "skills": self.skills or [],
            "experience": self.experience,
            "education": self.education,
        }
