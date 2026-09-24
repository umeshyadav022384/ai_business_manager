"""
AI Assistant orchestrator — implements exactly the flow the spec
describes:

  authenticated request -> business_id (server-resolved)
    -> RAG retrieval (business-scoped)
    -> LLM call with tool declarations
    -> if tool_call: dispatch_tool() with SERVER business_id, never the
       LLM's -> feed result back to LLM -> final answer
    -> return text to the router

dispatch_tool() is the single choke point every tool call goes
through. It takes business_id as its own required argument (from the
caller, i.e. the router's get_current_business dependency) and always
passes that value into the tool function — any "business_id" key
the LLM might include in its function-call arguments is ignored
outright, never merged in. This is what test_business_id_never_
trusted_from_tool_args in tests/test_ai_assistant.py checks.
"""

import uuid

from sqlalchemy.orm import Session

from app.ai.llm_provider import LLMProvider, NotConfiguredError
from app.ai.rag_service import query_business_knowledge
from app.ai.tools import TOOL_REGISTRY

MAX_TOOL_HOPS = 3  # guards against a pathological tool-call loop


def dispatch_tool(db: Session, *, business_id: uuid.UUID, tool_name: str, arguments: dict) -> dict:
    tool_fn = TOOL_REGISTRY.get(tool_name)
    if tool_fn is None:
        return {"error": f"Unknown tool: {tool_name}"}

    # business_id is never taken from `arguments` — only ever this
    # function's own server-supplied parameter. Any "business_id" the
    # LLM happened to include here is silently dropped.
    safe_arguments = {k: v for k, v in arguments.items() if k != "business_id"}
    try:
        return tool_fn(db, business_id=business_id, **safe_arguments)
    except Exception as exc:  # noqa: BLE001 — tool errors must never leak internals
        return {"error": f"Could not retrieve that information: {exc.__class__.__name__}"}


def answer_question(
    db: Session,
    *,
    business_id: uuid.UUID,
    question: str,
    history: list[dict],
    llm_provider: LLMProvider,
) -> tuple[str, list[str]]:
    try:
        rag_context = query_business_knowledge(business_id=business_id, query_text=question, n_results=3)
    except Exception:  # noqa: BLE001 — RAG is supplementary; never fail the whole answer over it
        rag_context = []

    messages = [*history, {"role": "user", "content": question}]
    tools_used: list[str] = []

    try:
        response = llm_provider.generate(messages, rag_context)
    except NotConfiguredError as exc:
        return str(exc), tools_used

    hops = 0
    while response.tool_call is not None and hops < MAX_TOOL_HOPS:
        tools_used.append(response.tool_call.name)
        result = dispatch_tool(
            db,
            business_id=business_id,
            tool_name=response.tool_call.name,
            arguments=response.tool_call.arguments,
        )
        response = llm_provider.generate_after_tool_result(messages, response.tool_call, result)
        hops += 1

    if response.text is None:
        return "I wasn't able to find an answer to that. Please try rephrasing your question.", tools_used

    return response.text, tools_used