import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, ConfigDict

from app.auth import EmployerActor, OptionalUser
from app.config import get_settings
from app.errors import DomainError
from app.modules.companies.postgres import PostgresCompanyRepository
from app.modules.companies.repository import CompanyRepository
from app.modules.companies.service import CompanyService

router = APIRouter(tags=["companies"])


class CompanyPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    name: str | None = None
    about: str | None = None
    size: str | None = None
    address: str | None = None
    website: str | None = None


def get_company_repo(actor: OptionalUser) -> CompanyRepository:
    return PostgresCompanyRepository(actor.claims if actor else None)


def service(repo: CompanyRepository):
    return CompanyService(repo)


@router.get("/companies")
def list_companies(
    repo: Annotated[CompanyRepository, Depends(get_company_repo)],
    q: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
):
    return service(repo).list(q, page).json()


@router.get("/companies/{company_id}")
def get_company(
    company_id: uuid.UUID, repo: Annotated[CompanyRepository, Depends(get_company_repo)]
):
    svc = service(repo)
    item = svc.get(str(company_id))
    if item is None:
        raise DomainError(404, "Không tìm thấy công ty")
    return {**item.json(), "openPostings": svc.repo.open_postings(str(company_id))}


@router.get("/me/company")
def get_my_company(
    actor: EmployerActor, repo: Annotated[CompanyRepository, Depends(get_company_repo)]
):
    item = service(repo).get(actor.user_id)
    if item is None:
        raise DomainError(404, "Không tìm thấy hồ sơ công ty")
    return item.json()


@router.patch("/me/company")
def patch_my_company(
    body: CompanyPatch,
    actor: EmployerActor,
    repo: Annotated[CompanyRepository, Depends(get_company_repo)],
):
    return (
        service(repo).update(actor.user_id, body.model_dump(exclude_unset=True)).json()
    )


@router.post("/me/company/logo")
async def upload_logo(
    actor: EmployerActor,
    logo: Annotated[UploadFile, File()],
    repo: Annotated[CompanyRepository, Depends(get_company_repo)],
):
    mime = logo.content_type or ""
    signatures = {
        "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": ("jpg", b"\xff\xd8\xff"),
        "image/webp": ("webp", b"RIFF"),
    }
    if mime not in signatures:
        raise DomainError(422, "Logo phải là ảnh PNG, JPEG hoặc WebP")
    content = await logo.read(1024 * 1024 + 1)
    if not content:
        raise DomainError(422, "Vui lòng chọn file logo")
    if len(content) > 1024 * 1024:
        raise DomainError(422, "Logo tối đa 1 MB")
    ext, magic = signatures[mime]
    valid = content.startswith(magic) and (
        mime != "image/webp" or len(content) >= 12 and content[8:12] == b"WEBP"
    )
    if not valid:
        raise DomainError(422, "Logo phải là ảnh PNG, JPEG hoặc WebP")
    object_path = f"{actor.user_id}/{uuid.uuid4()}.{ext}"
    settings = get_settings()
    endpoint = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/company-logos/{object_path}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                endpoint,
                content=content,
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {actor.token}",
                    "Content-Type": mime,
                    "x-upsert": "false",
                },
            )
        response.raise_for_status()
    except (httpx.HTTPError, ValueError) as exc:
        raise DomainError(502, "Không tải được logo lên, vui lòng thử lại") from exc
    public_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/company-logos/{object_path}"
    item = service(repo).update(actor.user_id, {"logoUrl": public_url})
    return item.json()
