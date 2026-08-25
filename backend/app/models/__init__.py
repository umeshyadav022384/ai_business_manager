"""
Importing every model here ensures they're all registered on
app.core.database.Base.metadata before Alembic's autogenerate (or
Base.metadata.create_all, if ever used) runs. Without this, a model
file that's never imported anywhere is invisible to SQLAlchemy's
metadata and Alembic would silently skip its table.
"""

from app.models.user import User  # noqa: F401
from app.models.business import Business  # noqa: F401
from app.models.business_member import BusinessMember, BusinessRole  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_variant import ProductVariant  # noqa: F401