from pathlib import Path
import sys
import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("KEEP_TEST_DB", "true")
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.core.db import get_db, Base
from backend.core.security import get_current_user
from backend.main import app


TEST_DB_FILENAME = Path(REPO_ROOT) / "backend" / "test_healthcare.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_FILENAME.as_posix()}"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ensure test DB schema exists before tests
Base.metadata.create_all(bind=test_engine)


def override_get_db_for_tests():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def pytest_sessionfinish(session, exitstatus):

    keep = os.getenv("KEEP_TEST_DB", "false").lower() == "true"
    if not keep:
        try:
            Base.metadata.drop_all(bind=test_engine)
        except Exception:
            pass
        try:
            if TEST_DB_FILENAME.exists():
                TEST_DB_FILENAME.unlink()
        except Exception:
            pass


@pytest.fixture
def api_app():
    app.dependency_overrides[get_db] = override_get_db_for_tests
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, role="admin")
    try:
        yield app
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def api_client(api_app):
    return TestClient(api_app)


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    tr = terminalreporter
    passed = tr.stats.get('passed', [])
    failed = tr.stats.get('failed', [])
    skipped = tr.stats.get('skipped', [])
    xfailed = tr.stats.get('xfailed', [])
    xpassed = tr.stats.get('xpassed', [])

    tr.section("Test Results Summary", sep="=")

    def short_id_from_nodeid(nodeid: str) -> str:
        # derive a compact code from the test function name
        parts = nodeid.split("::")
        func = parts[-1]
        # remove leading test_ if present
        if func.startswith("test_"):
            func = func[len("test_"):]
        # replace non alnum with - and uppercase
        import re

        code = re.sub(r"[^0-9a-zA-Z]+", "-", func).strip("-")
        return code.upper()

    def short_path_from_nodeid(nodeid: str) -> str:
        path = nodeid.split("::")[0]
        from pathlib import Path

        return Path(path).name

    if passed:
        tr.write_line(f"Passed ({len(passed)}):")
        for r in passed:
            code = short_id_from_nodeid(r.nodeid)
            p = short_path_from_nodeid(r.nodeid)
            tr.write_line(f"  [PASS] {code}  {p} :: {r.nodeid.split('::')[-1]}")
    else:
        tr.write_line("Passed (0)")

    if failed:
        tr.write_line(f"Failed ({len(failed)}):")
        for r in failed:
            code = short_id_from_nodeid(r.nodeid)
            p = short_path_from_nodeid(r.nodeid)
            tr.write_line(f"  [FAIL] {code}  {p} :: {r.nodeid.split('::')[-1]}")
    else:
        tr.write_line("Failed (0)")

    if skipped:
        tr.write_line(f"Skipped ({len(skipped)}):")
        for r in skipped:
            tr.write_line(f"  - {r.nodeid}")

    if xfailed:
        tr.write_line(f"XFailed ({len(xfailed)}):")
        for r in xfailed:
            tr.write_line(f"  - {r.nodeid}")

    if xpassed:
        tr.write_line(f"XPassed ({len(xpassed)}):")
        for r in xpassed:
            tr.write_line(f"  - {r.nodeid}")

    # One-line compact summary
    tr.section("Compact Summary", sep="-")
    tr.write_line(
        f"Passed: {len(passed)} | Failed: {len(failed)} | Skipped: {len(skipped)} | XFailed: {len(xfailed)} | XPassed: {len(xpassed)}"
    )