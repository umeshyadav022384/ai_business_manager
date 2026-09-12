"""
Importing every model here ensures they're all registered on
app.core.database.Base.metadata before Alembic's autogenerate runs.
"""

from app.models.user import User  # noqa: F401
from app.models.business import Business  # noqa: F401
from app.models.business_member import BusinessMember, BusinessRole  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_variant import ProductVariant  # noqa: F401
from app.models.supplier import Supplier  # noqa: F401
from app.models.purchase import Purchase  # noqa: F401
from app.models.purchase_item import PurchaseItem  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.sale import Sale  # noqa: F401
from app.models.sale_item import SaleItem  # noqa: F401
from app.models.expense import Expense, ExpenseCategory  # noqa: F401
from app.models.customer_payment import CustomerPayment  # noqa: F401
from app.models.supplier_payment import SupplierPayment  # noqa: F401