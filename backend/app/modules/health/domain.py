from dataclasses import dataclass


@dataclass(frozen=True)
class HealthStatus:
    db: bool
    jwks: bool

    @property
    def ok(self) -> bool:
        return self.db and self.jwks
