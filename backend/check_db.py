"""Report — and optionally repair — drift between the database and the models.

A database created before a model existed keeps serving every other route, so
the gap only ever surfaces as one broken screen and an unhelpful browser error.
This makes the gap visible in one command.

    python -m backend.check_db            # report only
    python -m backend.check_db --repair   # stamp alembic and upgrade to head
"""
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import inspect

from backend.core.config import settings
from backend.core.db import Base, engine
import backend.core.models  # noqa: F401  (registers every table on Base)

BACKEND_DIR = Path(__file__).resolve().parent
# The revision that created the schema this project shipped before alembic was
# first used here; anything older predates the lifecycle overhaul.
PRE_LIFECYCLE_REVISION = "0cbc8e1f2486"


def alembic_env() -> dict:
    """Environment for the alembic subprocess.

    DATABASE_URL is CWD-relative by default ("sqlite:///./backend/healthcare.db"),
    but alembic has to run from backend/, where that path resolves to
    backend/backend/... and fails. Hand it an absolute URL instead.
    """
    env = dict(os.environ)
    url = settings.DATABASE_URL
    if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
        relative = url[len("sqlite:///"):]
        url = f"sqlite:///{Path(relative).resolve()}"
    env["DATABASE_URL"] = url
    return env


def run_alembic(*args: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR, env=alembic_env(), check=True,
    )


def report() -> tuple[list[str], list[tuple[str, list[str]]], bool]:
    insp = inspect(engine)
    present = set(insp.get_table_names())
    if not present:
        return sorted(Base.metadata.tables), [], False

    missing_tables = sorted(set(Base.metadata.tables) - present)
    missing_columns = []
    for name in sorted(set(Base.metadata.tables) & present):
        live = {c["name"] for c in insp.get_columns(name)}
        gap = sorted(set(Base.metadata.tables[name].columns.keys()) - live)
        if gap:
            missing_columns.append((name, gap))

    return missing_tables, missing_columns, "alembic_version" in present


def main() -> int:
    print(f"Database: {settings.DATABASE_URL}")
    missing_tables, missing_columns, stamped = report()

    print(f"Alembic stamped: {stamped}")
    if missing_tables:
        print(f"MISSING TABLES : {', '.join(missing_tables)}")
    if missing_columns:
        for table, cols in missing_columns:
            print(f"MISSING COLUMNS: {table}.{{{', '.join(cols)}}}")

    if not missing_tables and not missing_columns:
        print("Schema matches the models.")
        return 0

    if "--repair" not in sys.argv:
        print("\nRun with --repair to bring the database up to head.")
        return 1

    # An empty database must be built from base. Stamping it would tell alembic
    # the early migrations had already run and the core tables would never be
    # created — the exact failure that leaves you unable to log in.
    legacy_schema = bool(set(inspect(engine).get_table_names()) - {"alembic_version"})

    if not stamped and legacy_schema:
        print(f"\nStamping alembic at {PRE_LIFECYCLE_REVISION} (schema predates alembic tracking)…")
        run_alembic("stamp", PRE_LIFECYCLE_REVISION)
    elif not stamped:
        print("\nEmpty database — creating the full schema from base…")

    print("Upgrading to head…")
    run_alembic("upgrade", "head")

    missing_tables, missing_columns, _ = report()
    if missing_tables or missing_columns:
        print("\nStill out of date after upgrade — a migration may be missing.")
        return 1
    print("\nRepaired: schema now matches the models.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
