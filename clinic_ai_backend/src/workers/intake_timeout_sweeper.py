"""Mark stale WhatsApp intake sessions completed after inactivity.

This worker makes the intake-session GET endpoint side-effect free by moving the
30-minute inactivity completion into a periodic background sweeper.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from src.adapters.db.mongo.client import get_database

logger = logging.getLogger(__name__)


async def sweep_intake_timeouts_forever(
    stop_event: asyncio.Event,
    *,
    poll_interval_sec: float = 60.0,
    inactivity_timeout_sec: int = 30 * 60,
    batch_size: int = 250,
) -> None:
    """Continuously mark stale in-progress intake sessions as completed."""
    db = get_database()
    statuses = ["in_progress", "awaiting_illness", "awaiting_conversation_start"]
    while not stop_event.is_set():
        now = datetime.now(timezone.utc)
        cutoff_iso = (now - timedelta(seconds=int(inactivity_timeout_sec))).isoformat()

        try:
            # Find visits where a question was asked but patient didn't reply in time.
            query = {
                "intake_session.status": {"$in": statuses},
                "intake_session.pending_question": {"$exists": True, "$ne": None, "$ne": ""},
                "intake_session.last_outbound_at": {"$exists": True, "$ne": None, "$ne": "", "$lte": cutoff_iso},
            }
            cursor = db.visits.find(
                query,
                {
                    "_id": 0,
                    "visit_id": 1,
                    "id": 1,
                    "patient_id": 1,
                    "status": 1,
                    "current_workflow_stage": 1,
                    "intake_session": 1,
                    "intake_session.patient_id": 1,
                },
            ).limit(int(batch_size))
            stale = list(cursor)
            if not stale:
                await asyncio.sleep(float(poll_interval_sec))
                continue

            updated = 0
            now_iso = now.isoformat()
            for visit in stale:
                resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "").strip()
                if not resolved_visit_id:
                    continue
                current_stage = str(visit.get("current_workflow_stage") or "").strip().lower()
                should_move_workflow = current_stage in {"intake", "patient_registered"} or not current_stage
                update_fields: dict[str, object] = {
                    "intake_session.status": "completed",
                    "intake_session.pending_question": None,
                    "intake_session.pending_topic": "inactivity_timeout",
                    "intake_session.updated_at": now_iso,
                    "updated_at": now,
                }
                if should_move_workflow:
                    update_fields.update(
                        {
                            "previous_workflow_stage": "intake",
                            "current_workflow_stage": "pre_visit",
                            "next_workflow_stage": "vitals",
                            "status": "in_queue",
                        }
                    )
                result = db.visits.update_one(
                    {"$or": [{"visit_id": resolved_visit_id}, {"id": resolved_visit_id}]},
                    {"$set": update_fields},
                )
                if getattr(result, "modified_count", 0) > 0:
                    updated += 1

                # Legacy write-through (best-effort).
                try:
                    patient_id = str(
                        ((visit.get("intake_session") or {}).get("patient_id"))
                        or visit.get("patient_id")
                        or ""
                    ).strip()
                    intake_sessions = getattr(db, "intake_sessions", None)
                    update_one = getattr(intake_sessions, "update_one", None) if intake_sessions is not None else None
                    if callable(update_one) and patient_id:
                        update_one(
                            {
                                "visit_id": resolved_visit_id,
                                "patient_id": patient_id,
                                "status": {"$in": statuses},
                            },
                            {
                                "$set": {
                                    "status": "completed",
                                    "pending_question": None,
                                    "pending_topic": "inactivity_timeout",
                                    "updated_at": now,
                                }
                            },
                        )
                except Exception:
                    pass

            logger.info("intake_timeout_sweeper updated=%s cutoff=%s", updated, cutoff_iso)
        except Exception:
            logger.exception("intake_timeout_sweeper_failed")

        await asyncio.sleep(float(poll_interval_sec))

