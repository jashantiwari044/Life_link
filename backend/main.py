import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect

from backend.core.config import settings
from backend.core.db import Base, engine
from backend.api.v1.router import api_router

logger = logging.getLogger("lifelink")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for LifeLink Healthcare Platform",
)


@app.middleware("http")
async def json_error_middleware(request: Request, call_next):
    """Turn unhandled exceptions into a JSON 500 from *inside* the CORS layer.

    Starlette's own ServerErrorMiddleware sits outside every user middleware, so
    the 500 it produces never gets CORS headers. The browser then reports a
    missing Access-Control-Allow-Origin and the real error — a missing table, a
    bad query — is invisible to the frontend. Catching here keeps the response
    inside CORSMiddleware, so the actual reason reaches the client.
    """
    try:
        return await call_next(request)
    except Exception:
        logger.error("Unhandled error on %s %s\n%s", request.method, request.url.path, traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check the backend logs for details."},
        )


# Added last, so it wraps the error middleware above and every error response
# still carries the CORS headers the browser requires.
app.add_middleware(
    CORSMiddleware,
    # Any local dev port. Vite moves to 5174+ when 5173 is taken, and a
    # hardcoded list turns that into an opaque CORS failure at login.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


def missing_tables() -> list[str]:
    """Model tables that do not exist in the connected database."""
    try:
        present = set(inspect(engine).get_table_names())
    except Exception:
        return []
    return sorted(set(Base.metadata.tables) - present)


@app.on_event("startup")
def ensure_schema() -> None:
    """Build the schema on a brand-new database, and flag drift on an old one.

    Nothing else in the app creates tables, and SQLite happily opens a path that
    does not exist yet — so deleting the database left an empty file, every
    query failed with "no such table", and even seeding an admin was impossible.
    An empty database is unambiguous, so provision it; a partially populated one
    is not, so report it rather than silently half-migrating real data.
    """
    from sqlalchemy import inspect as _inspect

    try:
        present = set(_inspect(engine).get_table_names())
    except Exception:
        logger.exception("Could not inspect the database at %s", settings.DATABASE_URL)
        return

    if not present:
        logger.warning("Empty database at %s — creating the schema.", settings.DATABASE_URL)
        try:
            from backend.check_db import run_alembic

            run_alembic("upgrade", "head")
            logger.warning("Schema created.")
        except Exception:
            logger.exception("Automatic schema creation failed. Run: python -m backend.check_db --repair")
            return
    else:
        missing = missing_tables()
        if missing:
            logger.error(
                "DATABASE SCHEMA IS OUT OF DATE — missing table(s): %s. "
                "Run: python -m backend.check_db --repair",
                ", ".join(missing),
            )
            return

    # There must always be something to log in as, however the database got here.
    from backend.bootstrap import ensure_admin_on_startup

    ensure_admin_on_startup()


@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} operational"}


@app.get("/health")
def health_check():
    """Reports schema drift too, so a stale database is visible immediately.

    Stays byte-identical to the original response when nothing is wrong, so
    existing consumers of this endpoint keep working.
    """
    missing = missing_tables()
    if not missing:
        return {"status": "healthy"}
    return {"status": "degraded", "missing_tables": missing}
