import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.reviews import router as reviews_router
from app.modules.reviews.domain import ReviewError, rating_json
from app.modules.reviews.memory import InMemoryReviewRepository
from app.modules.reviews.service import ReviewService

CANDIDATE = "00000000-0000-0000-0000-0000000000c1"
ADMIN = "00000000-0000-0000-0000-00000000000a"
COMPANY = "00000000-0000-0000-0000-0000000000e1"
OTHER_COMPANY = "00000000-0000-0000-0000-0000000000e2"
BODY = {"rating": 4, "title": "Môi trường tốt", "pros": "Đồng nghiệp thân thiện", "cons": "Lương hơi thấp",
        "anonymous": False}


@pytest.fixture
def repo():
    return InMemoryReviewRepository(user_id=CANDIDATE, applied={(CANDIDATE, COMPANY)},
                                    names={CANDIDATE: "Ứng Viên Một", COMPANY: "Cty Một"})


def submit(service, company=COMPANY, **kw):
    return service.submit(company, **{**BODY, **kw})


def test_rating_json():
    assert rating_json({}) == {"average": None, "count": 0,
                               "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}}
    assert rating_json({5: 2, 4: 1}) == {"average": 4.7, "count": 3,
                                         "distribution": {"1": 0, "2": 0, "3": 0, "4": 1, "5": 2}}


def test_submit_moderate_resubmit_and_public_listing(repo):
    service = ReviewService(repo)
    assert service.can_review(COMPANY) and not service.can_review(OTHER_COMPANY)
    mine = submit(service, title="  Môi trường tốt  ")
    assert (mine["status"], mine["title"], mine["authorName"], mine["rejectReason"]) == (
        "PENDING", "Môi trường tốt", "Ứng Viên Một", None)
    assert not service.can_review(COMPANY)
    assert service.list_company(COMPANY, 1)["rating"]["count"] == 0  # pending is not public

    with pytest.raises(ReviewError) as err:
        submit(service)
    assert err.value.code == "REVIEW_EXISTS"

    repo.is_admin = True
    service.moderate(mine["id"], False, "  Ngôn từ chưa phù hợp  ")
    assert service.get_mine(COMPANY)["rejectReason"] == "Ngôn từ chưa phù hợp"
    assert [a["action"] for a in repo.audit] == ["REVIEW_REJECTED"]
    assert repo.notifications == [{"recipientId": CANDIDATE, "type": "REVIEW_MODERATED"}]

    again = submit(service, rating=5, anonymous=True)
    assert (again["id"], again["status"], again["authorName"]) == (mine["id"], "PENDING", "Ứng viên ẩn danh")
    service.moderate(mine["id"], True, "bỏ qua")
    page = service.list_company(COMPANY, 1)
    assert page["rating"] == {"average": 5.0, "count": 1,
                              "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 1}}
    assert (page["total"], page["pageSize"]) == (1, 10)
    assert "candidateId" not in page["items"][0] and page["items"][0]["authorName"] == "Ứng viên ẩn danh"
    assert service.list_company(COMPANY, 2)["items"] == []
    assert service.list_admin("APPROVED", 1)["items"][0]["companyName"] == "Cty Một"
    assert service.list_admin("NOPE", 0)["total"] == 1


@pytest.mark.parametrize("kw, code", [
    ({"rating": 0}, "INVALID_REVIEW"),
    ({"rating": 6}, "INVALID_REVIEW"),
    ({"title": " abcd "}, "INVALID_REVIEW"),
    ({"title": "x" * 151}, "INVALID_REVIEW"),
    ({"pros": "ngắn"}, "INVALID_REVIEW"),
    ({"cons": "x" * 3001}, "INVALID_REVIEW"),
    ({"company": OTHER_COMPANY}, "NOT_ELIGIBLE"),
])
def test_submit_refusals(repo, kw, code):
    with pytest.raises(ReviewError) as err:
        submit(ReviewService(repo), **kw)
    assert err.value.code == code


@pytest.mark.parametrize("approve, reason, code", [
    (False, None, "INVALID_REASON"),
    (False, " abc ", "INVALID_REASON"),
    (False, "x" * 501, "INVALID_REASON"),
    (True, None, "NOT_ADMIN"),
])
def test_moderate_refusals(repo, approve, reason, code):
    service = ReviewService(repo)
    review_id = submit(service)["id"]
    with pytest.raises(ReviewError) as err:
        service.moderate(review_id, approve, reason)
    assert err.value.code == code
    assert service.list_admin(None, 1)["total"] == 0  # not admin: nothing listed


def test_moderate_missing_review(repo):
    repo.is_admin = True
    with pytest.raises(ReviewError) as err:
        ReviewService(repo).moderate("missing", True, None)
    assert err.value.code == "REVIEW_NOT_FOUND"


def _as(user_id, role):
    app.dependency_overrides[optional_user] = lambda: Actor(user_id, role, {"sub": user_id}, "t")


def test_routes(repo, monkeypatch):
    monkeypatch.setattr(reviews_router, "PostgresReviewRepository", lambda claims: repo)
    client = TestClient(app)
    try:
        assert client.get(f"/companies/{COMPANY}/my-review").json() is None  # guest
        assert client.get(f"/companies/{COMPANY}/can-review").json() is False
        assert client.post(f"/companies/{COMPANY}/my-review", json=BODY).status_code == 401
        assert client.get(f"/companies/{COMPANY}/reviews").json()["rating"]["average"] is None
        assert client.get("/companies/not-a-uuid/reviews").status_code == 422

        _as(CANDIDATE, "CANDIDATE")
        assert client.get(f"/companies/{COMPANY}/can-review").json() is True
        res = client.post(f"/companies/{COMPANY}/my-review", json=BODY)
        assert res.status_code == 200 and res.json()["status"] == "PENDING"
        review_id = res.json()["id"]
        assert client.get(f"/companies/{COMPANY}/my-review").json()["id"] == review_id
        assert client.post(f"/companies/{COMPANY}/my-review", json=BODY).status_code == 409
        assert client.post(f"/companies/{OTHER_COMPANY}/my-review", json=BODY).json() == {
            "error": "Bạn cần từng ứng tuyển vào công ty này để viết đánh giá"}
        assert client.post(f"/companies/{COMPANY}/my-review", json={**BODY, "extra": 1}).status_code == 422
        assert client.get("/admin/reviews").status_code == 403

        _as(ADMIN, "EMPLOYER")
        assert client.post(f"/companies/{COMPANY}/my-review", json=BODY).status_code == 403
        assert client.get(f"/companies/{COMPANY}/my-review").json() is None

        _as(ADMIN, "ADMIN")
        repo.is_admin = True
        assert client.get("/admin/reviews?status=NOPE").status_code == 422
        assert client.get("/admin/reviews?status=PENDING").json()["total"] == 1
        res = client.post(f"/admin/reviews/{review_id}/moderate", json={"approve": False, "reason": "x"})
        assert res.status_code == 422 and res.json() == {"error": "Lý do cần từ 5 đến 500 ký tự"}
        assert client.post(f"/admin/reviews/{review_id}/moderate", json={"approve": True}).json() is None
    finally:
        app.dependency_overrides.clear()
    assert client.get(f"/companies/{COMPANY}/reviews").json()["total"] == 1
