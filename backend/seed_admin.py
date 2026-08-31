"""Kept for backwards compatibility — the server now does this on startup.

    python -m backend.seed_admin
"""
from backend.bootstrap import main

if __name__ == "__main__":
    raise SystemExit(main())
