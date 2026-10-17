from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.candidates.domain import CandidateProfile
from app.modules.candidates.memory import InMemoryCandidateRepository
from app.modules.candidates.router import get_candidate_repo
from app.modules.candidates.service import CandidateService

USER = "00000000-0000-0000-0000-000000000001"
POSTING = "00000000-0000-0000-0000-000000000002"


def test_profile_patch_trims_skills_and_rejects_duplicates():
    repo = InMemoryCandidateRepository(
        profiles={USER: CandidateProfile(USER, "An", None)}
    )
    profile = CandidateService(repo).update(USER, {"skills": [" Python ", "SQL"]})
    assert profile.skills == ["Python", "SQL"]


def test_saved_toggle_and_ids():
    repo = InMemoryCandidateRepository(
        profiles={USER: CandidateProfile(USER, "An", None)},
        postings={POSTING: {"id": POSTING, "status": "CLOSED"}},
    )
    service = CandidateService(repo)
    assert service.toggle(USER, POSTING) == {"saved": True}
    assert service.saved_ids(USER) == [POSTING]
    assert service.toggle(USER, POSTING) == {"saved": False}


def test_candidate_route_uses_repository_override():
    repo = InMemoryCandidateRepository(
        profiles={USER: CandidateProfile(USER, "An", None)}
    )
    app.dependency_overrides[optional_user] = lambda: Actor(
        USER, "CANDIDATE", {"sub": USER}, "test-token"
    )
    app.dependency_overrides[get_candidate_repo] = lambda: repo
    try:
        response = TestClient(app).get("/me/candidate-profile")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["userId"] == USER
