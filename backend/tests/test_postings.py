from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.modules.postings.domain import PostingError, fold_accents
from app.modules.postings.memory import InMemoryPostingRepository
from app.modules.postings.postgres import _where
from app.modules.postings.schemas import PostingInput, SearchFilter
from app.modules.postings.service import PostingService

A, B = uuid4(), uuid4()
NOW = datetime(2026, 10, 16, tzinfo=UTC)


def at(text: str) -> datetime:
    return datetime.fromisoformat(text)


def data(**overrides) -> PostingInput:
    fields = {
        "title": "Lập trình viên TypeScript",
        "description": "Phát triển cổng tuyển dụng bằng Next.js và Supabase.",
        "location": "Hà Nội",
        "employment_type": "FULL_TIME",
        "salary_min": 15_000_000,
        "salary_max": 25_000_000,
        "application_deadline": at("2026-11-01T00:00:00Z"),
        "industry": "IT_SOFTWARE",
        "level": "JUNIOR",
        "experience_years": 1,
        "headcount": 2,
        "skills": ["TypeScript", "React"],
        "requirements": "Biết TypeScript cơ bản.",
        "benefits": "Lương tháng 13, bảo hiểm đầy đủ.",
    }
    # model_construct: the service is tested apart from input validation (see test_postings_api).
    return PostingInput.model_construct(**{**fields, **overrides})


class Clock:
    def __init__(self):
        self.now = NOW

    def __call__(self) -> datetime:
        return self.now


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def service(clock):
    return PostingService(InMemoryPostingRepository({A: "ACME", B: "Globex"}, clock), clock)


def code(fn) -> str:
    with pytest.raises(PostingError) as exc:
        fn()
    return exc.value.code


def published(service, **overrides):
    return service.publish(A, service.create_draft(A, data(**overrides)).id)


def titles(service, **criteria) -> list[str]:
    return [p.title for p in service.list_open(SearchFilter(**criteria)).items]


# createDraft
def test_create_draft_with_company_name(service):
    posting = service.create_draft(A, data())
    assert posting.employer_id == A and posting.company_name == "ACME" and posting.company_logo_url is None
    assert (posting.status, posting.display_status) == ("DRAFT", "DRAFT")
    assert posting.title == data().title


def test_negotiable_or_one_sided_salary(service):
    service.create_draft(A, data(salary_min=None, salary_max=None))
    service.create_draft(A, data(salary_min=10_000_000, salary_max=None))


def test_create_rejects_min_above_max(service):
    assert code(lambda: service.create_draft(A, data(salary_min=30_000_000, salary_max=20_000_000))) == "INVALID_SALARY"


def test_draft_may_have_past_deadline(service):
    service.create_draft(A, data(application_deadline=at("2026-01-01T00:00:00Z")))


# publish
def test_publish_draft(service):
    posting = published(service)
    assert (posting.status, posting.display_status) == ("PUBLISHED", "PUBLISHED")


def test_publish_rejects_past_or_now_deadline(service):
    past = service.create_draft(A, data(application_deadline=at("2026-10-15T23:59:59Z")))
    assert code(lambda: service.publish(A, past.id)) == "DEADLINE_NOT_IN_FUTURE"
    exact = service.create_draft(A, data(application_deadline=NOW))
    assert code(lambda: service.publish(A, exact.id)) == "DEADLINE_NOT_IN_FUTURE"
    assert service.get_mine(A, past.id).status == "DRAFT"


@pytest.mark.parametrize("closed", [False, True])
def test_no_republish(service, closed):
    posting = published(service)
    if closed:
        service.close(A, posting.id)
    assert code(lambda: service.publish(A, posting.id)) == "INVALID_TRANSITION"


# close
def test_close_published(service):
    posting = published(service)
    assert service.close(A, posting.id).display_status == "CLOSED"


def test_cannot_close_draft(service):
    draft = service.create_draft(A, data())
    assert code(lambda: service.close(A, draft.id)) == "INVALID_TRANSITION"


def test_close_expired(service, clock):
    posting = published(service)
    clock.now = at("2026-12-01T00:00:00Z")
    assert service.close(A, posting.id).status == "CLOSED"


# update
@pytest.mark.parametrize("publish", [False, True])
def test_update_keeps_status(service, publish):
    posting = published(service) if publish else service.create_draft(A, data())
    updated = service.update(A, posting.id, data(title="Senior TypeScript", salary_max=None))
    assert (updated.title, updated.salary_max, updated.status) == ("Senior TypeScript", None, posting.status)


def test_cannot_update_closed(service):
    posting = published(service)
    service.close(A, posting.id)
    assert code(lambda: service.update(A, posting.id, data(title="Đổi tên"))) == "NOT_EDITABLE"
    assert service.get_mine(A, posting.id).title == data().title


def test_update_rejects_min_above_max(service):
    draft = service.create_draft(A, data())
    assert code(lambda: service.update(A, draft.id, data(salary_min=2, salary_max=1))) == "INVALID_SALARY"


def test_extending_expired_posting_reopens_it(service, clock):
    posting = published(service)
    clock.now = at("2026-12-01T00:00:00Z")
    assert service.get_mine(A, posting.id).display_status == "EXPIRED"
    extended = service.update(A, posting.id, data(application_deadline=at("2027-01-01T00:00:00Z")))
    assert extended.display_status == "PUBLISHED"


# ownership
def test_other_employer_sees_nothing(service):
    draft = service.create_draft(A, data())
    assert service.get_mine(B, draft.id) is None
    for act in (lambda: service.update(B, draft.id, data()), lambda: service.publish(B, draft.id),
                lambda: service.close(B, draft.id)):
        assert code(act) == "NOT_FOUND"


def test_unknown_id(service):
    missing = uuid4()
    assert service.get_mine(A, missing) is None
    assert code(lambda: service.publish(A, missing)) == "NOT_FOUND"


def test_list_mine_newest_first_with_expired(service, clock):
    old = published(service, title="Tin cũ đã hết hạn", application_deadline=at("2026-10-20T00:00:00Z"))
    fresh = service.create_draft(A, data(title="Tin mới nháp"))
    service.create_draft(B, data(title="Tin của Globex"))
    clock.now = at("2026-10-21T00:00:00Z")
    assert [(p.id, p.display_status) for p in service.list_mine(A)] == [(fresh.id, "DRAFT"), (old.id, "EXPIRED")]


# listOpen
def test_list_open_only_open_newest_first(service, clock):
    service.create_draft(A, data(title="Tin nháp"))
    service.close(A, published(service, title="Tin đã đóng").id)
    published(service, title="Tin sắp hết hạn", application_deadline=at("2026-10-17T00:00:00Z"))
    older = published(service, title="Tin cũ hơn")
    newer = published(service, title="Tin mới hơn")
    clock.now = at("2026-10-18T00:00:00Z")
    page = service.list_open(SearchFilter())
    assert (page.total, page.page, page.page_size) == (2, 1, 20)
    assert [p.id for p in page.items] == [newer.id, older.id]
    assert page.items[0].model_dump() == {
        "id": newer.id, "employer_id": A, "title": "Tin mới hơn", "company_name": "ACME", "company_logo_url": None,
        "location": "Hà Nội", "employment_type": "FULL_TIME", "salary_min": 15_000_000, "salary_max": 25_000_000,
        "application_deadline": at("2026-11-01T00:00:00Z"), "created_at": newer.created_at, "industry": "IT_SOFTWARE",
        "level": "JUNIOR", "experience_years": 1, "skills": ["TypeScript", "React"], "company_verified": False,
        "featured": False,
    }


def test_open_until_exact_deadline(service, clock):
    published(service, application_deadline=at("2026-10-17T00:00:00Z"))
    clock.now = at("2026-10-17T00:00:00Z")
    assert service.list_open(SearchFilter()).total == 1
    clock.now = at("2026-10-17T00:00:00.001Z")
    assert service.list_open(SearchFilter()).total == 0


def test_pages_of_twenty(service):
    ids = [published(service, title=f"Tin số {i}").id for i in range(45)][::-1]
    pages = [service.list_open(SearchFilter(page=n)) for n in (1, 2, 3, 4)]
    assert [len(p.items) for p in pages] == [20, 20, 5, 0]
    assert [i.id for p in pages for i in p.items] == ids
    assert all(p.total == 45 for p in pages) and pages[2].page == 3


# Search Filter
def test_keyword_ignores_accents_and_case(service):
    for t in ("Kế toán tổng hợp", "Điều dưỡng viên", "Lập trình viên"):
        published(service, title=t)
    assert titles(service, q="ke toan") == ["Kế toán tổng hợp"]
    assert titles(service, q="DIEU DUONG") == ["Điều dưỡng viên"]
    assert titles(service, q="Kế Toán") == ["Kế toán tổng hợp"]


def test_keyword_matches_description(service):
    published(service, title="Nhân viên văn phòng", description="Làm báo cáo thuế và sổ sách kế toán hằng tháng.")
    published(service, title="Lập trình viên")
    assert titles(service, q="so sach") == ["Nhân viên văn phòng"]


def test_location_contains(service):
    published(service, title="Ở Hà Nội", location="Quận Ba Đình, Hà Nội")
    published(service, title="Ở Hà Nam", location="Hà Nam")
    assert titles(service, location="ha noi") == ["Ở Hà Nội"]
    assert titles(service, location="Hà") == ["Ở Hà Nam", "Ở Hà Nội"]
    assert titles(service, location="%") == []


def test_min_salary_keeps_negotiable(service):
    published(service, title="Thấp", salary_min=5_000_000, salary_max=8_000_000)
    published(service, title="Đúng mức", salary_min=8_000_000, salary_max=10_000_000)
    published(service, title="Thỏa thuận", salary_min=None, salary_max=None)
    published(service, title="Từ 12 triệu", salary_min=12_000_000, salary_max=None)
    assert titles(service, min_salary=10_000_000) == ["Từ 12 triệu", "Thỏa thuận", "Đúng mức"]


def test_filters_combine(service):
    published(service, title="Kế toán trưởng", salary_max=30_000_000)
    published(service, title="Kế toán part-time", employment_type="PART_TIME", salary_max=30_000_000)
    published(service, title="Kế toán TP.HCM", location="TP. Hồ Chí Minh", salary_max=30_000_000)
    published(service, title="Kế toán lương thấp", salary_min=None, salary_max=9_000_000)
    service.create_draft(A, data(title="Kế toán nháp", salary_max=30_000_000))
    page = service.list_open(SearchFilter(q="ke toan", location="Hà Nội", employment_type="FULL_TIME",
                                          min_salary=10_000_000))
    assert [p.title for p in page.items] == ["Kế toán trưởng"] and page.total == 1


def test_industry_and_level(service):
    published(service, title="Dev junior", industry="IT_SOFTWARE", level="JUNIOR")
    published(service, title="Dev senior", industry="IT_SOFTWARE", level="SENIOR")
    published(service, title="Sales junior", industry="SALES", level="JUNIOR")
    assert titles(service, industry="IT_SOFTWARE") == ["Dev senior", "Dev junior"]
    assert titles(service, level="JUNIOR") == ["Sales junior", "Dev junior"]
    assert titles(service, industry="IT_SOFTWARE", level="SENIOR") == ["Dev senior"]


def test_max_experience(service):
    for years in (0, 2, 5):
        published(service, title=f"{years} năm", experience_years=years)
    assert titles(service, max_experience=2) == ["2 năm", "0 năm"]
    assert titles(service, max_experience=0) == ["0 năm"]


def test_posted_within_days(service):
    from datetime import timedelta

    repo = service._repo
    for title, age in (("Hôm qua", 1), ("Tuần trước", 8)):
        p = published(service, title=title)
        repo.rows[p.id] = repo.rows[p.id].model_copy(update={"created_at": NOW - timedelta(days=age)})
    assert titles(service, posted_within_days=7) == ["Hôm qua"]
    assert service.list_open(SearchFilter(posted_within_days=30)).total == 2


def test_skill_exact_without_accents(service):
    published(service, title="Kế toán", skills=["Kế toán thuế", "Excel"])
    published(service, title="Dev", skills=["TypeScript"])
    assert titles(service, skill="ke toan thue") == ["Kế toán"]
    assert titles(service, skill="EXCEL") == ["Kế toán"]
    assert titles(service, skill="Type") == []


def test_sort_salary_desc_negotiable_last(service):
    published(service, title="Thỏa thuận", salary_min=None, salary_max=None)
    published(service, title="20 triệu", salary_min=None, salary_max=20_000_000)
    published(service, title="40 triệu", salary_min=None, salary_max=40_000_000)
    published(service, title="Từ 30 triệu", salary_min=30_000_000, salary_max=None)
    assert titles(service, sort="salary_desc") == ["40 triệu", "20 triệu", "Từ 30 triệu", "Thỏa thuận"]


def test_sort_deadline_asc_default_newest(service):
    published(service, title="Hạn xa", application_deadline=at("2026-12-01T00:00:00Z"))
    published(service, title="Hạn gần", application_deadline=at("2026-10-20T00:00:00Z"))
    published(service, title="Hạn giữa", application_deadline=at("2026-11-01T00:00:00Z"))
    assert titles(service, sort="deadline_asc") == ["Hạn gần", "Hạn giữa", "Hạn xa"]
    assert titles(service) == ["Hạn giữa", "Hạn gần", "Hạn xa"]


# getPublic
def test_public_detail_open(service):
    posting = published(service)
    assert service.get_public(posting.id).model_dump() == {**posting.model_dump(), "is_open": True}


def test_public_detail_closed_and_expired(service, clock):
    closed = published(service)
    service.close(A, closed.id)
    expired = published(service, application_deadline=at("2026-10-17T00:00:00Z"))
    clock.now = at("2026-10-18T00:00:00Z")
    assert (service.get_public(closed.id).display_status, service.get_public(closed.id).is_open) == ("CLOSED", False)
    assert (service.get_public(expired.id).display_status, service.get_public(expired.id).is_open) == ("EXPIRED", False)


def test_public_detail_hides_draft(service):
    assert service.get_public(service.create_draft(A, data()).id) is None
    assert service.get_public(uuid4()) is None


# listRelated
def test_related_at_most_six_same_industry(service):
    me = published(service, title="Chính nó", industry="SALES")
    for i in range(7):
        published(service, title=f"Sales {i}", industry="SALES")
    published(service, title="Dev", industry="IT_SOFTWARE")
    service.close(A, published(service, title="Sales đã đóng", industry="SALES").id)
    assert [p.title for p in service.list_related(me.id)] == [f"Sales {i}" for i in range(6, 0, -1)]


def test_related_of_draft_or_unknown_is_empty(service):
    published(service, industry="SALES")
    assert service.list_related(service.create_draft(A, data(industry="SALES")).id) == []
    assert service.list_related(uuid4()) == []


# recordView (InMemory stands in for record_posting_view)
def test_record_view_skips_draft_and_owner(clock):
    repo = InMemoryPostingRepository({A: "ACME"}, clock, viewer_id=A)
    service = PostingService(repo, clock)
    posting = published(service)
    draft = service.create_draft(A, data())
    service.record_view(posting.id)
    service.record_view(draft.id)
    assert repo.views == {}
    repo.viewer_id = B
    service.record_view(posting.id)
    service.record_view(draft.id)
    assert repo.views == {posting.id: 1}


# domain + SQL
def test_fold_accents():
    assert fold_accents("Kế Toán Đà Nẵng") == "ke toan da nang"


def test_where_escapes_like_and_folds():
    clause, params = _where(SearchFilter(q="50%_Kế", skill="Kế toán", min_salary=5))
    assert clause == (" where search_text ilike %s and (salary_max is null or salary_max >= %s)"
                      " and %s = any(search_skills)")
    assert params == ["%50\\%\\_ke%", 5, "ke toan"]
    assert _where(SearchFilter()) == ("", [])


def test_newest_puts_running_featured_first_and_flags_it(service, clock):
    from datetime import timedelta

    repo = service._repo
    old = published(service, title="Nổi bật cũ")
    published(service, title="Mới nhất")
    ended = published(service, title="Hết nổi bật")
    repo.rows[old.id] = repo.rows[old.id].model_copy(update={"featured_until": NOW + timedelta(days=7)})
    repo.rows[ended.id] = repo.rows[ended.id].model_copy(update={"featured_until": NOW - timedelta(seconds=1)})
    assert titles(service) == ["Nổi bật cũ", "Hết nổi bật", "Mới nhất"]
    assert [p.featured for p in service.list_open(SearchFilter()).items] == [True, False, False]
    assert titles(service, sort="deadline_asc")[0] == "Hết nổi bật"  # only 'newest' lifts featured
    assert service.get_public(old.id).featured and not service.get_public(ended.id).featured
