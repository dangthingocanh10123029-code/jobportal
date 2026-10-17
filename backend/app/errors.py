from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Business error → HTTP `status` with body `{ "error": message }` (message in Vietnamese)."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


_MESSAGES = {
    "missing": "Thiếu trường {field}",
    "string_too_short": "Trường {field} quá ngắn",
    "string_too_long": "Trường {field} quá dài",
    "enum": "Giá trị của {field} không hợp lệ",
    "literal_error": "Giá trị của {field} không hợp lệ",
}


def validation_message(errors: list[dict]) -> str:
    """First validation error as a Vietnamese sentence; custom validators already raise Vietnamese ValueErrors."""
    if not errors:
        return "Dữ liệu không hợp lệ"
    err = errors[0]
    if err.get("type") == "value_error":
        return str(err.get("ctx", {}).get("error") or err["msg"])
    loc = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path")]
    field = ".".join(loc) or "dữ liệu"
    return _MESSAGES.get(err.get("type", ""), "Trường {field} không hợp lệ").format(field=field)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse({"error": exc.message}, status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse({"error": validation_message(list(exc.errors()))}, status_code=422)
