import re
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import AfterValidator, BeforeValidator

from app.modules.cv.domain import MAX_ITEMS, MAX_LANGUAGES, MAX_SKILLS
from app.schemas import CamelModel

# Rules and messages = cvSchema (src/actions/cv-schema.ts); sizes also = the candidate_cvs CHECKs.


def _text(label: str, max_len: int, *, optional: bool = False, min_len: int = 1) -> BeforeValidator:
    """Trimmed string of min_len–max_len; with `optional`, None or blank becomes None."""

    def check(v: Any) -> Any:
        if optional and (v is None or (isinstance(v, str) and not v.strip())):
            return None
        if not isinstance(v, str) or not min_len <= len(v.strip()) <= max_len:
            raise ValueError(f"{label} tối đa {max_len} ký tự" if min_len == 0 else f"{label} từ 1 đến {max_len} ký tự")
        return v.strip()

    return BeforeValidator(check)


def _pattern(label: str, regex: str, *, optional: bool = False) -> BeforeValidator:
    def check(v: Any) -> Any:
        if optional and (v is None or (isinstance(v, str) and not v.strip())):
            return None
        if not isinstance(v, str) or not re.fullmatch(regex, v.strip()):
            raise ValueError(f"{label} không hợp lệ")
        return v.strip()

    return BeforeValidator(check)


def _max_items(label: str, n: int) -> AfterValidator:
    def check(v: list) -> list:
        if len(v) > n:
            raise ValueError(f"Tối đa {n} {label}")
        return v

    return AfterValidator(check)


def _year(v: Any) -> Any:
    if v is not None and (not isinstance(v, int) or isinstance(v, bool) or not 1950 <= v <= 2100):
        raise ValueError("Năm cấp không hợp lệ")
    return v


MONTH = r"\d{4}-(0[1-9]|1[0-2])"


class CvItem(CamelModel):
    title: Annotated[str, _text("Tên vị trí / ngành học", 150)]
    organization: Annotated[str, _text("Tên công ty / trường", 150)]
    start_date: Annotated[str, _pattern("Tháng bắt đầu", MONTH)]
    end_date: Annotated[str | None, _pattern("Tháng kết thúc", MONTH, optional=True)] = None  # None = hiện tại
    description: Annotated[str, _text("Mô tả", 2000, min_len=0)] = ""


class Certification(CamelModel):
    name: Annotated[str, _text("Tên chứng chỉ", 150)]
    issuer: Annotated[str | None, _text("Nơi cấp", 150, optional=True)] = None
    year: Annotated[int | None, BeforeValidator(_year)] = None


class CvInput(CamelModel):
    """Body of PUT /me/cv: OnlineCv without candidateId/updatedAt."""

    template: Literal["CLASSIC", "MODERN"]
    full_name: Annotated[str, _text("Họ tên", 100)]
    headline: Annotated[str | None, _text("Chức danh", 150, optional=True)] = None
    email: Annotated[str, _pattern("Email", r"(?=.{3,254}$)[^@\s]+@[^@\s]+\.[^@\s]+")]
    phone: Annotated[str | None, _pattern("Số điện thoại", r"\+?[0-9 .-]{8,20}", optional=True)] = None
    location: Annotated[str | None, _text("Địa chỉ", 150, optional=True)] = None
    summary: Annotated[str | None, _text("Giới thiệu", 2000, optional=True)] = None
    experiences: Annotated[list[CvItem], _max_items("kinh nghiệm", MAX_ITEMS)]
    educations: Annotated[list[CvItem], _max_items("học vấn", MAX_ITEMS)]
    skills: Annotated[list[Annotated[str, _text("Kỹ năng", 30)]], _max_items("kỹ năng", MAX_SKILLS)]
    languages: Annotated[list[Annotated[str, _text("Ngoại ngữ", 30)]], _max_items("ngoại ngữ", MAX_LANGUAGES)]
    certifications: Annotated[list[Certification], _max_items("chứng chỉ", MAX_ITEMS)]


class OnlineCv(CvInput):
    candidate_id: UUID
    updated_at: datetime
