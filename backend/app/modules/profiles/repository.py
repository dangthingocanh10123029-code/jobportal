from typing import Protocol

from app.modules.profiles.domain import Profile


class ProfileRepository(Protocol):
    def get(self, user_id: str) -> Profile | None: ...
    def update(self, user_id: str, changes: dict) -> Profile | None: ...
