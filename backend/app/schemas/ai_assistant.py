from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class AskResponse(BaseModel):
    answer: str
    tools_used: list[str] = Field(default_factory=list)


class ReindexResponse(BaseModel):
    products_indexed: int