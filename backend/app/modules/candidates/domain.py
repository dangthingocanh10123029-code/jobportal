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
    open_to_work: bool = False
    location: str | None = None
    experience_years: int | None = None

    def json(self):
        return {
            "userId": self.user_id,
            "fullName": self.full_name,
            "phone": self.phone,
            "headline": self.headline,
            "skills": self.skills or [],
            "experience": self.experience,
            "education": self.education,
            "openToWork": self.open_to_work,
            "location": self.location,
            "experienceYears": self.experience_years,
        }
