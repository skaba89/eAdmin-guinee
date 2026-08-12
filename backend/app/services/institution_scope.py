"""Tenant-bound hierarchical institution scope helpers."""

from sqlalchemy import Select, select
from sqlalchemy.sql.selectable import CTE

from app.models.institution import Institution


def institution_descendants_cte(
    *,
    tenant_id: str,
    root_institution_id: str,
    name: str = "institution_scope",
) -> CTE:
    """Return the active root institution and its active descendants.

    The tenant predicate is repeated in both the anchor and recursive member so
    malformed parent links can never expand a scope across tenants. ``UNION``
    deliberately deduplicates rows, which also makes the recursion terminate if
    legacy data contains an accidental cycle.
    """

    scope = (
        select(Institution.id.label("id"))
        .where(
            Institution.id == root_institution_id,
            Institution.tenant_id == tenant_id,
            Institution.is_active.is_(True),
        )
        .cte(name=name, recursive=True)
    )

    children = (
        select(Institution.id.label("id"))
        .join(scope, Institution.parent_id == scope.c.id)
        .where(
            Institution.tenant_id == tenant_id,
            Institution.is_active.is_(True),
        )
    )

    return scope.union(children)


def institution_descendant_ids_query(
    *,
    tenant_id: str,
    root_institution_id: str,
    name: str = "institution_scope",
) -> Select:
    """Return a SELECT suitable for ``column.in_(...)`` scope predicates."""

    scope = institution_descendants_cte(
        tenant_id=tenant_id,
        root_institution_id=root_institution_id,
        name=name,
    )
    return select(scope.c.id)
