"""
LLM provider abstraction — this is the seam that keeps the AI
implementation modular. GeminiProvider is the only implementation
today; swapping to a different LLM later means writing a new class
that satisfies LLMProvider and changing get_llm_provider() in
routers/ai_assistant.py — nothing in assistant_service.py or tools.py
would need to change.
"""

import json
from dataclasses import dataclass, field
from typing import Protocol

from app.ai.tool_declarations import TOOL_DECLARATIONS
from app.core.config import settings

SYSTEM_PROMPT = """You are the AI Assistant inside a business management app \
for small retail shops (grocery/kirana and clothing) in Nepal and India.

You answer questions about the CURRENT LOGGED-IN BUSINESS ONLY, using:
1. Tool calls, for any question involving numbers — sales, purchases, \
profit, stock levels, customer Udhaar, supplier payables, expenses. \
ALWAYS call the appropriate tool rather than estimating or guessing a number.
2. Retrieved context (if provided), for general product/business knowledge.

Rules:
- NEVER invent or estimate a financial figure. If a tool doesn't return \
what's needed, say the information isn't available rather than guessing.
- If no tool or context gives you an answer, say so plainly — do not fabricate.
- Keep answers concise, concrete, and business-relevant. Use the actual \
numbers a tool returned.
- You have no knowledge of any business other than the one in this \
conversation, and no ability to access one."""


@dataclass
class ToolCall:
    name: str
    arguments: dict


@dataclass
class LLMResponse:
    """Either the model wants a tool called (tool_call set), or it has
    a final answer (text set) — never both."""

    text: str | None = None
    tool_call: ToolCall | None = None


class LLMProvider(Protocol):
    def generate(self, messages: list[dict], rag_context: list[str]) -> LLMResponse: ...

    def generate_after_tool_result(
        self, messages: list[dict], tool_call: ToolCall, tool_result: dict
    ) -> LLMResponse: ...


class NotConfiguredError(Exception):
    pass


class GeminiProvider:
    """Real Gemini-backed provider. Requires GEMINI_API_KEY."""

    def __init__(self):
        if not settings.gemini_api_key:
            raise NotConfiguredError(
                "AI Assistant is not configured. Set GEMINI_API_KEY in the backend .env file."
            )
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        self._genai = genai
        self._model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
            tools=[{"function_declarations": TOOL_DECLARATIONS}],
        )

    def _history_to_gemini(self, messages: list[dict]) -> list[dict]:
        return [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
            for m in messages
        ]

    def generate(self, messages: list[dict], rag_context: list[str]) -> LLMResponse:
        history = self._history_to_gemini(messages[:-1])
        chat = self._model.start_chat(history=history)

        question = messages[-1]["content"]
        if rag_context:
            context_block = "\n".join(f"- {c}" for c in rag_context)
            question = f"{question}\n\n[Relevant business knowledge]\n{context_block}"

        response = chat.send_message(question)
        return self._parse_response(response)

    def generate_after_tool_result(
        self, messages: list[dict], tool_call: ToolCall, tool_result: dict
    ) -> LLMResponse:
        history = self._history_to_gemini(messages)
        chat = self._model.start_chat(history=history)
        function_response = self._genai.protos.Content(
            parts=[
                self._genai.protos.Part(
                    function_response=self._genai.protos.FunctionResponse(
                        name=tool_call.name, response={"result": tool_result}
                    )
                )
            ]
        )
        response = chat.send_message(function_response)
        return self._parse_response(response)

    def _parse_response(self, response) -> LLMResponse:
        part = response.candidates[0].content.parts[0]
        if hasattr(part, "function_call") and part.function_call and part.function_call.name:
            return LLMResponse(
                tool_call=ToolCall(
                    name=part.function_call.name,
                    arguments=dict(part.function_call.args or {}),
                )
            )
        return LLMResponse(text=response.text)