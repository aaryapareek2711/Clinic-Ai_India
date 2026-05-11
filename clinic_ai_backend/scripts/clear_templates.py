"""Delete all template documents (local/dev utility)."""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure imports like `from src...` work when running as a script.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.adapters.db.mongo.client import get_database


def main() -> None:
    db = get_database()
    result = db.templates.delete_many({})
    print(f"Deleted {result.deleted_count} templates.")


if __name__ == "__main__":
    main()

