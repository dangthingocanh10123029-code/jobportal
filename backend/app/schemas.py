from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base for request/response bodies: JSON is camelCase like the TS types in docs/api-contract.md."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HealthOut(CamelModel):
    status: str
    db: bool
    jwks: bool
