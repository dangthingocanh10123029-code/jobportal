from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.errors import DomainError
from app.main import app
from app.modules.dashboard.domain import APPLICATION_STATUSES, PostingStats
from app.modules.dashboard.memory import InMemoryDashboardRepository
from app.modules.dashboard.router import get_dashboard_repo
from app.modules.dashboard.service import DashboardService
from app.modules.notifications.domain import AppNotification
from app.modules.notifications.memory import InMemoryNotificationRepository
from app.modules.notifications.router import get_notification_repo
from app.modules.notifications.service import NotificationService
from app.modules.profiles.domain import Profile
from app.modules.profiles.memory import InMemoryProfileRepository
from app.modules.profiles.router import get_profile_repo
from app.modules.profiles.service import ProfileService

USER = "00000000-0000-0000-0000-000000000001"
OTHER = "00000000-0000-0000-0000-000000000002"
FIXED_NOW = datetime(2026, 10, 17, tzinfo=UTC)


def notification(identifier: str, created: str, read_at=None):
    return AppNotification(
        identifier,
        "APPLICATION_RECEIVED",
        "Có đơn ứng tuyển mới",
        "Ứng viên vừa nộp đơn.",
        "/employer/postings/1/applications",
        read_at,
        created,
    )


def test_notifications_list_limit_count_and_mark_scoped_rows():
    rows = [
        (USER, notification(f"00000000-0000-0000-0000-{i:012d}", f"2026-10-{i + 1:02d}T00:00:00+00:00"))
        for i in range(35)
    ]
    rows.append((OTHER, notification("10000000-0000-0000-0000-000000000001", "2026-10-17T00:00:00+00:00")))
    repo = InMemoryNotificationRepository(rows, now=FIXED_NOW)
    service = NotificationService(repo)
    assert len(service.list(USER)) == 30
    assert service.unread_count(USER) == 35
    service.mark_read(USER, [rows[0][1].id])
    assert service.unread_count(USER) == 34
    assert service.unread_count(OTHER) == 1
    service.mark_read(USER, [])
    assert service.unread_count(USER) == 0


def test_mark_notifications_read_rejects_more_than_one_hundred_ids():
    with pytest.raises(DomainError, match="Tối đa 100"):
        NotificationService(InMemoryNotificationRepository()).mark_read(USER, [USER] * 101)


def test_dashboard_counts_all_statuses_and_marks_expired_postings():
    counts = {status: 2 for status in APPLICATION_STATUSES}
    repo = InMemoryDashboardRepository(
        {
            USER: [
                PostingStats("1", "Tin hết hạn", "PUBLISHED", "2026-10-16T00:00:00+00:00", 8, counts),
                PostingStats("2", "Tin đang mở", "PUBLISHED", "2026-10-18T00:00:00+00:00", 3, {"SUBMITTED": 1}),
                PostingStats("3", "Tin nháp", "DRAFT", "2026-10-18T00:00:00+00:00", 0, {}),
            ]
        }
    )
    dashboard = DashboardService(repo, now=lambda: FIXED_NOW).for_employer(USER)
    result = dashboard.json()
    assert result["totals"] == {"postings": 3, "open": 1, "applications": 15, "views": 11}
    assert result["byStatus"] == {**counts, "SUBMITTED": 3}
    assert [p["displayStatus"] for p in result["postings"]] == ["EXPIRED", "PUBLISHED", "DRAFT"]


def test_profile_update_matches_auth_schema_and_candidate_cannot_change_company():
    candidate = Profile(USER, "CANDIDATE", "An", "+84912345678", None)
    repo = InMemoryProfileRepository({USER: candidate})
    service = ProfileService(repo)
    updated = service.update(USER, {"fullName": "  An Nguyen ", "phone": ""})
    assert updated.full_name == "An Nguyen"
    assert updated.phone is None
    service.update(USER, {"companyName": "Không được ghi"})
    assert repo.get(USER).company_name is None
    for payload, error in [
        ({"fullName": " "}, "Vui lòng nhập họ tên"),
        ({"fullName": "x" * 101}, "Họ tên tối đa 100 ký tự"),
        ({"phone": "123"}, "Số điện thoại không hợp lệ"),
    ]:
        with pytest.raises(DomainError, match=error):
            service.update(USER, payload)


def test_employer_profile_company_name_is_validated_and_updated():
    repo = InMemoryProfileRepository({USER: Profile(USER, "EMPLOYER", None, None, "Công ty")})
    result = ProfileService(repo).update(USER, {"companyName": "  Công ty mới "})
    assert result.company_name == "Công ty mới"


def test_module_routes_use_in_memory_repositories_and_enforce_roles():
    actor = Actor(USER, "EMPLOYER", {"sub": USER}, "test-token")
    notifications = InMemoryNotificationRepository(
        [(USER, notification("00000000-0000-0000-0000-000000000001", "2026-10-17T00:00:00+00:00"))]
    )
    dashboard = InMemoryDashboardRepository({USER: []})
    profiles = InMemoryProfileRepository({USER: Profile(USER, "EMPLOYER", None, None, "Công ty")})
    app.dependency_overrides[optional_user] = lambda: actor
    app.dependency_overrides[get_notification_repo] = lambda: notifications
    app.dependency_overrides[get_dashboard_repo] = lambda: dashboard
    app.dependency_overrides[get_profile_repo] = lambda: profiles
    try:
        client = TestClient(app)
        assert client.get("/me/notifications").json()[0]["id"] == "00000000-0000-0000-0000-000000000001"
        assert client.get("/me/notifications/unread-count").json() == 1
        assert client.post("/me/notifications/read", json={"ids": []}).json() == {"success": True, "data": None}
        assert client.get("/me/dashboard").json()["byStatus"] == {status: 0 for status in APPLICATION_STATUSES}
        assert client.get("/me/profile").json()["companyName"] == "Công ty"
        assert client.patch("/me/profile", json={"companyName": "Công ty 2"}).json()["companyName"] == "Công ty 2"

        app.dependency_overrides[optional_user] = lambda: Actor(USER, "CANDIDATE", {"sub": USER}, "test-token")
        assert client.get("/me/dashboard").status_code == 403
    finally:
        app.dependency_overrides.clear()
