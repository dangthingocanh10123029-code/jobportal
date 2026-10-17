from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.auth import CurrentUser, OptionalUser
from app.errors import DomainError
from app.modules.profiles.postgres import PostgresProfileRepository
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.service import ProfileService

router = APIRouter(tags=["profiles"])


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = Field(default=None, alias="fullName")
    phone: str | None = None
    company_name: str | None = Field(default=None, alias="companyName")


def get_profile_repo(actor: OptionalUser) -> ProfileRepository:
    return PostgresProfileRepository(actor.claims if actor else None)


@router.get("/me/profile")
def get_profile(
    actor: CurrentUser,
    repo: Annotated[ProfileRepository, Depends(get_profile_repo)],
):
    profile = ProfileService(repo).get(actor.user_id)
    if profile is None:
        raise DomainError(404, "Không tìm thấy hồ sơ tài khoản")
    return profile.json()


@router.patch("/me/profile")
def update_profile(
    body: ProfilePatch,
    actor: CurrentUser,
    repo: Annotated[ProfileRepository, Depends(get_profile_repo)],
):
    return ProfileService(repo).update(
        actor.user_id, body.model_dump(exclude_unset=True, by_alias=True)
    ).json()
