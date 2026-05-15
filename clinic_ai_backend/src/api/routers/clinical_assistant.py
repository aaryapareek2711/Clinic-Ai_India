"""Provider clinical assistant chat (visit-scoped context + MedGemma or OpenAI)."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.adapters.external.ai.medgemma_clinical_assistant import MedGemmaClinicalAssistant
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.api.deps import get_current_user
from src.api.routers.visits import _ensure_visit_indexes, _find_visit
from src.api.tenant_scope import ensure_visit_owned_by_doctor, normalize_doctor_id
from src.application.use_cases.store_vitals import StoreVitalsUseCase
from src.core.ai_factory import get_active_prompt
from src.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/visits", tags=["Visits"])


def _truncate_assistant_context(text: str, max_len: int) -> str:
    s = str(text or "").strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 28] + "\n… [truncated for assistant context] …"


def _intake_excerpt_for_assistant(visit: dict, *, max_pairs: int = 18) -> str:
    intake = visit.get("intake_session") or {}
    items = intake.get("answers") or intake.get("question_answers") or []
    lines: list[str] = []
    ill = str(intake.get("illness") or "").strip()
    if ill:
        lines.append(f"Illness / chief line (intake): {ill}")
    for item in items[:max_pairs]:
        if not isinstance(item, dict):
            continue
        q = str(item.get("question") or "").strip()
        a = str(item.get("answer") or "").strip()
        if q or a:
            lines.append(f"Q: {q}\nA: {_truncate_assistant_context(a, 900)}")
    if len(items) > max_pairs:
        lines.append(f"... ({len(items) - max_pairs} more intake Q&A pairs omitted)")
    return "\n".join(lines) if lines else "(No intake Q&A in visit record)"


def _previsit_excerpt_for_assistant(visit: dict, db, patient_id_raw: str, resolved_visit_id: str) -> str:
    embedded = dict(visit.get("pre_visit_summary") or {})
    doc = embedded
    if not embedded:
        doc = (
            db.pre_visit_summaries.find_one(
                {"patient_id": patient_id_raw, "visit_id": resolved_visit_id},
                sort=[("updated_at", -1)],
            )
            or {}
        )
    if not doc:
        return "(No pre-visit summary on file)"
    sections = doc.get("sections")
    if isinstance(sections, dict):
        try:
            blob = json.dumps(sections, ensure_ascii=False)
        except Exception:  # noqa: BLE001
            blob = str(sections)
    else:
        blob = str(doc.get("summary") or doc)[:4000]
    return _truncate_assistant_context(blob, 6000)


def _clinical_note_excerpt_for_assistant(visit: dict, patient_id_raw: str, resolved_visit_id: str) -> str:
    note = None
    try:
        default_note_type = get_settings().default_note_type
        note = ClinicalNoteRepository().find_latest(
            patient_id=patient_id_raw,
            visit_id=resolved_visit_id,
            note_type=default_note_type,
        )
    except Exception:  # noqa: BLE001
        note = None
    if note:
        payload = note.get("payload")
        if isinstance(payload, dict):
            try:
                blob = json.dumps(payload, ensure_ascii=False)
            except Exception:  # noqa: BLE001
                blob = str(payload)
        else:
            blob = json.dumps(note, ensure_ascii=False, default=str)
        return _truncate_assistant_context(blob, 8000)
    emb = visit.get("clinical_note")
    if isinstance(emb, dict) and emb:
        try:
            blob = json.dumps(emb, ensure_ascii=False)
        except Exception:  # noqa: BLE001
            blob = str(emb)
        return _truncate_assistant_context(blob, 8000)
    return "(No clinical note found for default note type)"


def _build_clinical_assistant_visit_context(
    db,
    *,
    visit: dict,
    patient: dict,
    resolved_visit_id: str,
    patient_id_raw: str,
) -> str:
    vitals_use_case = StoreVitalsUseCase()
    latest_vitals = vitals_use_case.get_latest_vitals(patient_id_raw, resolved_visit_id)
    vitals_blob = ""
    if isinstance(latest_vitals, dict):
        vals = latest_vitals.get("values")
        if isinstance(vals, dict) and vals:
            try:
                vitals_blob = json.dumps(vals, ensure_ascii=False)
            except Exception:  # noqa: BLE001
                vitals_blob = str(vals)
        else:
            vitals_blob = str(latest_vitals)[:2000]
    else:
        vitals_blob = "(No vitals submitted for this visit)"

    session = dict(visit.get("transcription_session") or {})
    transcript = str(session.get("transcript") or "").strip()
    dialogue = session.get("structured_dialogue")
    dialogue_txt = ""
    if isinstance(dialogue, list) and dialogue:
        try:
            dialogue_txt = json.dumps(dialogue[:80], ensure_ascii=False)
        except Exception:  # noqa: BLE001
            dialogue_txt = str(dialogue)[:4000]

    name = str(patient.get("name") or "Unknown").strip()
    age = patient.get("age")
    gender = str(patient.get("gender") or "")
    pref_lang = str(patient.get("preferred_language") or "")

    parts = [
        "### Demographics",
        f"Name: {name}; reported age={age}; gender={gender}; preferred_language={pref_lang}",
        "### Visit",
        f"visit_id={resolved_visit_id}; status={visit.get('status')}; chief_complaint={visit.get('chief_complaint')}; "
        f"visit_type={visit.get('visit_type')}; scheduled_start={visit.get('scheduled_start')}",
        "### Intake (visit-embedded)",
        _intake_excerpt_for_assistant(visit),
        "### Pre-visit summary (sections)",
        _previsit_excerpt_for_assistant(visit, db, patient_id_raw, resolved_visit_id),
        "### Latest vitals (values)",
        _truncate_assistant_context(vitals_blob, 3500),
        "### Consultation transcript (raw, excerpt)",
        _truncate_assistant_context(transcript, 7000) if transcript else "(No transcript text yet)",
        "### Structured dialogue (excerpt)",
        _truncate_assistant_context(dialogue_txt, 5000) if dialogue_txt else "(No structured dialogue yet)",
        "### Clinical note (latest default type, JSON excerpt)",
        _clinical_note_excerpt_for_assistant(visit, patient_id_raw, resolved_visit_id),
    ]
    return "\n\n".join(parts)


class ClinicalAssistantMessageIn(BaseModel):
    role: str = Field(min_length=4, max_length=12)
    content: str = Field(min_length=1, max_length=12000)


class ClinicalAssistantChatRequest(BaseModel):
    messages: list[ClinicalAssistantMessageIn] = Field(min_length=1, max_length=36)


def _render_clinical_assistant_system_prompt(visit_context: str) -> str:
    """Load system prompt from prompt_templates (DB-backed active version via prompt registry)."""
    active = get_active_prompt("clinical_assistant")
    template = str(active.get("template_content") or "").strip()
    if not template:
        raise HTTPException(status_code=503, detail="Clinical assistant prompt template is not configured")
    if "{{visit_context}}" not in template:
        raise HTTPException(
            status_code=503,
            detail="Clinical assistant prompt template must contain {{visit_context}} placeholder",
        )
    return template.replace("{{visit_context}}", visit_context.strip())


@router.post("/{visit_id}/clinical-assistant/chat")
def clinical_assistant_chat(
    visit_id: str,
    body: ClinicalAssistantChatRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Context-aware assistant for the open visit (vitals, intake, pre-visit, transcript, clinical note)."""
    db = get_database()
    doctor_id = normalize_doctor_id(current_user)
    _ensure_visit_indexes(db)
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    ensure_visit_owned_by_doctor(db, doctor_id, visit)

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    patient_id_raw = str(visit.get("patient_id") or "").strip()
    if not patient_id_raw:
        raise HTTPException(status_code=400, detail="Visit has no patient_id")

    patient = db.patients.find_one({"patient_id": patient_id_raw}, {"_id": 0}) or {}
    context_pack = _build_clinical_assistant_visit_context(
        db,
        visit=visit,
        patient=patient,
        resolved_visit_id=resolved_visit_id,
        patient_id_raw=patient_id_raw,
    )

    system_prompt = _render_clinical_assistant_system_prompt(context_pack)

    api_conv: list[dict[str, str]] = []
    for m in body.messages:
        role = str(m.role or "").strip().lower()
        if role not in {"user", "assistant"}:
            raise HTTPException(status_code=400, detail="Invalid message role")
        api_conv.append({"role": role, "content": m.content.strip()})
    if api_conv[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="Last message must be from the user")

    settings = get_settings()
    provider = (settings.clinical_assistant_provider or "medgemma").strip().lower()
    try:
        if provider == "openai":
            reply = OpenAIQuestionClient.clinical_assistant_multiturn(
                system_prompt=system_prompt,
                conversation=api_conv,
            )
        else:
            reply = MedGemmaClinicalAssistant.clinical_assistant_multiturn(
                system_prompt=system_prompt,
                conversation=api_conv,
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("clinical_assistant_failed provider=%s", provider)
        raise HTTPException(
            status_code=503,
            detail=(
                "AI assistant is temporarily unavailable. Please continue with clinical judgment "
                "and try again later."
            ),
        ) from exc

    if not reply:
        raise HTTPException(status_code=502, detail="Assistant returned an empty reply")

    return {"reply": reply}
