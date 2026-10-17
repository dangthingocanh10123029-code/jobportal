from dataclasses import dataclass, field

from app.modules.candidates.domain import CandidateProfile


@dataclass
class InMemoryCandidateRepository:
    profiles: dict[str, CandidateProfile] = field(default_factory=dict)
    postings: dict[str, dict] = field(default_factory=dict)
    applications: dict[str, tuple[str, str]] = field(
        default_factory=dict
    )  # application -> candidate, employer
    saved_rows: dict[tuple[str, str], dict] = field(default_factory=dict)

    def profile(self, user_id):
        return self.profiles.get(user_id)

    def update_profile(self, user_id, values):
        p = self.profile(user_id)
        if p is None:
            return None
        updated = CandidateProfile(**{**p.__dict__, **values})
        self.profiles[user_id] = updated
        return updated

    def applicant_profile(self, application_id):
        app = self.applications.get(application_id)
        return self.profile(app[0]) if app else None

    def toggle_saved(self, user_id, posting_id):
        key = (user_id, posting_id)
        if key in self.saved_rows:
            del self.saved_rows[key]
            return False
        posting = self.postings.get(posting_id)
        if not posting or posting.get("status") not in ("PUBLISHED", "CLOSED"):
            return None
        self.saved_rows[key] = {
            **posting,
            "savedAt": posting.get("savedAt", "2026-01-01T00:00:00+00:00"),
            "isOpen": posting.get("status") == "PUBLISHED",
        }
        return True

    def saved(self, user_id):
        return sorted(
            (v for (uid, _), v in self.saved_rows.items() if uid == user_id),
            key=lambda x: x["savedAt"],
            reverse=True,
        )

    def saved_ids(self, user_id):
        return [pid for (uid, pid), _ in self.saved_rows.items() if uid == user_id]
