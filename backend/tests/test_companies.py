from fastapi.testclient import TestClient

from app.auth import optional_user
from app.main import app
from app.modules.companies.domain import Company
from app.modules.companies.memory import InMemoryCompanyRepository
from app.modules.companies.router import get_company_repo
from app.modules.companies.service import CompanyService


def test_list_searches_without_accents_and_paginates():
    repo = InMemoryCompanyRepository(
        {"1": Company("1", "Công ty Kế toán"), "2": Company("2", "Khác")}
    )
    page = CompanyService(repo).list("ke toan")
    assert page.total == 1 and page.items[0].company.id == "1"


def test_company_update_validates_and_clears_optional_values():
    repo = InMemoryCompanyRepository({"1": Company("1", "Công ty", about="Mô tả")})
    assert CompanyService(repo).update("1", {"about": " "}).about is None


def test_company_routes_use_overrides():
    repo = InMemoryCompanyRepository(
        {
            "00000000-0000-0000-0000-000000000001": Company(
                "00000000-0000-0000-0000-000000000001", "Công ty"
            )
        }
    )
    app.dependency_overrides[optional_user] = lambda: None
    app.dependency_overrides[get_company_repo] = lambda: repo
    try:
        response = TestClient(app).get("/companies")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["items"][0]["name"] == "Công ty"
