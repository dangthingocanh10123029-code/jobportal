from dataclasses import dataclass, field

from app.modules.profiles.domain import Profile


@dataclass
class InMemoryProfileRepository:
    profiles: dict[str, Profile] = field(default_factory=dict)

    def get(self, user_id: str):
        return self.profiles.get(user_id)

    def update(self, user_id: str, changes: dict):
        current = self.get(user_id)
        if current is None:
            return None
        if current.role == "CANDIDATE":
            changes = {key: value for key, value in changes.items() if key != "company_name"}
        updated = Profile(**{**current.__dict__, **changes})
        self.profiles[user_id] = updated
        return updated
