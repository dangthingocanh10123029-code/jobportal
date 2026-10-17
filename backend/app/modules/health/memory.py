from dataclasses import dataclass


@dataclass
class InMemoryHealthRepository:
    db: bool = True
    jwks: bool = True

    def ping_db(self) -> bool:
        return self.db

    def ping_jwks(self) -> bool:
        return self.jwks
