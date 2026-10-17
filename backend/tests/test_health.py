from fastapi.testclient import TestClient

from app.main import app
from app.modules.health.memory import InMemoryHealthRepository
from app.modules.health.router import get_health_repo


def call(repo):
    app.dependency_overrides[get_health_repo] = lambda: repo
    try:
        return TestClient(app).get("/health")
    finally:
        app.dependency_overrides.clear()


def test_healthy():
    res = call(InMemoryHealthRepository())
    assert res.status_code == 200 and res.json() == {"status": "ok", "db": True, "jwks": True}


def test_db_down_is_503():
    res = call(InMemoryHealthRepository(db=False))
    assert res.status_code == 503 and res.json() == {"status": "degraded", "db": False, "jwks": True}


def test_swagger_served():
    assert TestClient(app).get("/docs").status_code == 200
