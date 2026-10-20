from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_pool
from app.errors import install_error_handlers
from app.modules.admin.router import router as admin_router
from app.modules.applications.router import router as applications_router
from app.modules.articles.router import router as articles_router
from app.modules.candidates.router import router as candidates_router
from app.modules.companies.router import router as companies_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.health.router import router as health_router
from app.modules.notifications.router import router as notifications_router
from app.modules.postings.router import router as postings_router
from app.modules.profiles.router import router as profiles_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    close_pool()


app = FastAPI(title="Job Portal API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
install_error_handlers(app)
app.include_router(health_router)
app.include_router(postings_router)
app.include_router(applications_router)
app.include_router(companies_router)
app.include_router(candidates_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)
app.include_router(profiles_router)
app.include_router(admin_router)
app.include_router(articles_router)
