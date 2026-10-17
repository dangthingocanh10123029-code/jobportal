import psycopg
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import field_validator

from app.errors import DomainError, install_error_handlers
from app.schemas import CamelModel


class Body(CamelModel):
    full_name: str

    @field_validator("full_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Họ tên không được để trống")
        return v


app = FastAPI()
install_error_handlers(app)


@app.post("/echo")
def echo(body: Body):
    return body.model_dump(by_alias=True)


@app.get("/boom")
def boom():
    raise DomainError(409, "Bạn đã ứng tuyển tin này")


@app.get("/db-lost")
def db_lost():
    raise psycopg.OperationalError("the connection is lost")


client = TestClient(app)


def test_lost_db_connection_is_503():
    res = client.get("/db-lost")
    assert res.status_code == 503 and res.json() == {"error": "Hệ thống đang bận, vui lòng thử lại"}


def test_domain_error_body():
    res = client.get("/boom")
    assert res.status_code == 409 and res.json() == {"error": "Bạn đã ứng tuyển tin này"}


def test_camel_case_in_and_out():
    assert client.post("/echo", json={"fullName": "An"}).json() == {"fullName": "An"}


def test_missing_field_is_vietnamese_422():
    res = client.post("/echo", json={})
    assert res.status_code == 422 and res.json() == {"error": "Thiếu trường fullName"}


def test_custom_validator_message_passes_through():
    assert client.post("/echo", json={"fullName": " "}).json() == {"error": "Họ tên không được để trống"}
