"""
ChromaDB-backed RAG for semantic business knowledge (product
descriptions, categories) — deliberately NOT used for financial
numbers, which always come from ai/tools.py querying PostgreSQL
directly (see module docstring in tools.py).

Isolation: every document is inserted with business_id in its
metadata, and every query filters with where={"business_id": ...}.
There is exactly one shared collection across all businesses — the
metadata filter is what prevents cross-business retrieval, checked in
tests/test_ai_assistant.py::test_chromadb_metadata_isolation.
"""

import uuid

import chromadb

from app.core.config import settings

_client: chromadb.ClientAPI | None = None

COLLECTION_NAME = "business_knowledge"


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
    return _client


def _get_collection():
    return _get_client().get_or_create_collection(COLLECTION_NAME)


def index_document(
    *, business_id: uuid.UUID, document_type: str, source: str, doc_id: str, text: str
) -> None:
    collection = _get_collection()
    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[
            {
                "business_id": str(business_id),
                "document_type": document_type,
                "source": source,
            }
        ],
    )


def query_business_knowledge(
    *, business_id: uuid.UUID, query_text: str, n_results: int = 5
) -> list[str]:
    """Returns matching document texts, filtered to this business
    only. Never called with an unrestricted `where` — the business_id
    filter is mandatory, not optional, by this function's signature."""
    collection = _get_collection()
    if collection.count() == 0:
        return []
    results = collection.query(
        query_texts=[query_text],
        n_results=min(n_results, collection.count()),
        where={"business_id": str(business_id)},
    )
    documents = results.get("documents") or [[]]
    return documents[0] if documents else []


def reindex_business_products(db, *, business_id: uuid.UUID) -> int:
    """Rebuilds this business's product knowledge in ChromaDB. Called
    on-demand via POST /api/v1/ai-assistant/reindex rather than wired
    into Product CRUD, so Phase 3's product code stays untouched."""
    from app.models.product import Product

    products = db.query(Product).filter(Product.business_id == business_id).all()
    count = 0
    for product in products:
        text = f"Product: {product.name}."
        if product.category:
            text += f" Category: {product.category}."
        if product.brand:
            text += f" Brand: {product.brand}."
        index_document(
            business_id=business_id,
            document_type="product",
            source="products",
            doc_id=f"product-{product.id}",
            text=text,
        )
        count += 1
    return count