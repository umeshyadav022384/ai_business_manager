from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.assistant_service import answer_question
from app.ai.llm_provider import GeminiProvider, LLMProvider
from app.ai.rag_service import reindex_business_products
from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.ai_assistant import AskRequest, AskResponse, ReindexResponse

router = APIRouter(prefix="/api/v1/ai-assistant", tags=["ai-assistant"])


def get_llm_provider() -> LLMProvider:
    """The one place the concrete LLM implementation is chosen —
    swap this to a different provider later without touching the
    router or assistant_service.py. Tests override this dependency
    with a fake provider (see tests/test_ai_assistant.py)."""
    return GeminiProvider()


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
    llm_provider: LLMProvider = Depends(get_llm_provider),
):
    history = [m.model_dump() for m in payload.history]
    answer, tools_used = answer_question(
        db,
        business_id=business.id,
        question=payload.question,
        history=history,
        llm_provider=llm_provider,
    )
    return AskResponse(answer=answer, tools_used=tools_used)


@router.post("/reindex", response_model=ReindexResponse)
def reindex(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    count = reindex_business_products(db, business_id=business.id)
    return ReindexResponse(products_indexed=count)