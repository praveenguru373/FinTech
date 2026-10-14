from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(connection: object, _: object) -> None:
        cursor = connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_optional_registration_phone() -> None:
    """Make the old required phone column nullable while preserving SQLite accounts."""
    if engine.dialect.name != "sqlite":
        return

    with engine.connect() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        phone_column = next((column for column in columns if column[1] == "phone"), None)
        if phone_column is None or not phone_column[3]:
            return

        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
        with connection.begin():
            connection.exec_driver_sql(
                """
                CREATE TABLE users__new (
                    id VARCHAR(36) PRIMARY KEY NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    email VARCHAR(254) NOT NULL,
                    phone VARCHAR(13),
                    password_hash VARCHAR(255) NOT NULL,
                    email_verified BOOLEAN NOT NULL,
                    created_at DATETIME NOT NULL
                )
                """
            )
            connection.exec_driver_sql(
                """
                INSERT INTO users__new (id, full_name, email, phone, password_hash, email_verified, created_at)
                SELECT id, full_name, email, phone, password_hash, email_verified, created_at FROM users
                """
            )
            connection.exec_driver_sql("DROP TABLE users")
            connection.exec_driver_sql("ALTER TABLE users__new RENAME TO users")
            connection.exec_driver_sql("CREATE UNIQUE INDEX ix_users_email ON users (email)")
            connection.exec_driver_sql("CREATE UNIQUE INDEX ix_users_phone ON users (phone)")
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
