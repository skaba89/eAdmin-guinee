from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


def patch_service() -> None:
    path = "backend/app/services/grounded_ai_service.py"
    replace_once(
        path,
        "from app.models.document_ocr import DocumentOCRResult\n",
        "from app.models.document_ocr import DocumentOCRResult\nfrom app.services.service_catalog import list_active_services\n",
    )
    replace_once(
        path,
        '''    async def _latest_active_services(
        self,
        db: AsyncSession,
        tenant_id: str | None,
    ) -> list[AdministrativeService]:
        statement = select(AdministrativeService).where(AdministrativeService.is_active.is_(True))
        if tenant_id:
            statement = statement.where(AdministrativeService.tenant_id == tenant_id)
        statement = statement.order_by(
            AdministrativeService.service_id,
            desc(AdministrativeService.version),
        )
        rows = (await db.execute(statement)).scalars().all()

        latest: dict[str, AdministrativeService] = {}
        for service in rows:
            latest.setdefault(service.service_id, service)
        return list(latest.values())
''',
        '''    async def _latest_active_services(
        self,
        db: AsyncSession,
        tenant_id: str | None,
        *,
        institution_id: str | None = None,
        service_institution_id: str | None = None,
    ) -> list[AdministrativeService]:
        scoped = bool(institution_id or service_institution_id)
        if scoped:
            if not tenant_id:
                return []
            rows = await list_active_services(
                db,
                tenant_id,
                institution_id=institution_id,
                service_institution_id=service_institution_id,
            )
        else:
            statement = select(AdministrativeService).where(
                AdministrativeService.is_active.is_(True)
            )
            if tenant_id:
                statement = statement.where(AdministrativeService.tenant_id == tenant_id)
            statement = statement.order_by(
                AdministrativeService.service_id,
                desc(AdministrativeService.version),
            )
            rows = list((await db.execute(statement)).scalars().all())

        latest: dict[str, AdministrativeService] = {}
        for service in rows:
            latest.setdefault(service.service_id, service)
        return list(latest.values())
''',
    )
    replace_once(
        path,
        '''    async def find_services(
        self,
        db: AsyncSession,
        query: str,
        tenant_id: str | None,
        limit: int = 5,
    ) -> list[ServiceMatch]:
        services = await self._latest_active_services(db, tenant_id)
''',
        '''    async def find_services(
        self,
        db: AsyncSession,
        query: str,
        tenant_id: str | None,
        limit: int = 5,
        *,
        institution_id: str | None = None,
        service_institution_id: str | None = None,
    ) -> list[ServiceMatch]:
        services = await self._latest_active_services(
            db,
            tenant_id,
            institution_id=institution_id,
            service_institution_id=service_institution_id,
        )
''',
    )
    replace_once(
        path,
        '''    async def answer_question(
        self,
        db: AsyncSession,
        question: str,
        tenant_id: str | None,
        language: str = "fr",
    ) -> dict[str, Any]:
        question = " ".join((question or "").split())
        matches = await self.find_services(db, question, tenant_id, limit=5)
''',
        '''    async def answer_question(
        self,
        db: AsyncSession,
        question: str,
        tenant_id: str | None,
        language: str = "fr",
        *,
        institution_id: str | None = None,
        service_institution_id: str | None = None,
    ) -> dict[str, Any]:
        question = " ".join((question or "").split())
        matches = await self.find_services(
            db,
            question,
            tenant_id,
            limit=5,
            institution_id=institution_id,
            service_institution_id=service_institution_id,
        )
''',
    )
    replace_once(
        path,
        '''    async def suggest_procedures(
        self,
        db: AsyncSession,
        citizen_need: str,
        tenant_id: str | None,
    ) -> dict[str, Any]:
        matches = await self.find_services(db, citizen_need, tenant_id, limit=5)
''',
        '''    async def suggest_procedures(
        self,
        db: AsyncSession,
        citizen_need: str,
        tenant_id: str | None,
        *,
        institution_id: str | None = None,
        service_institution_id: str | None = None,
    ) -> dict[str, Any]:
        matches = await self.find_services(
            db,
            citizen_need,
            tenant_id,
            limit=5,
            institution_id=institution_id,
            service_institution_id=service_institution_id,
        )
''',
    )
    replace_once(
        path,
        '''    async def classify_text(
        self,
        db: AsyncSession,
        text_value: str,
        tenant_id: str | None,
        title: str | None = None,
    ) -> dict[str, Any]:
        combined = " ".join(part for part in [title or "", text_value or ""] if part).strip()
        matches = await self.find_services(db, combined, tenant_id, limit=3)
''',
        '''    async def classify_text(
        self,
        db: AsyncSession,
        text_value: str,
        tenant_id: str | None,
        title: str | None = None,
        *,
        institution_id: str | None = None,
        service_institution_id: str | None = None,
    ) -> dict[str, Any]:
        combined = " ".join(part for part in [title or "", text_value or ""] if part).strip()
        matches = await self.find_services(
            db,
            combined,
            tenant_id,
            limit=3,
            institution_id=institution_id,
            service_institution_id=service_institution_id,
        )
''',
    )


def patch_api() -> None:
    path = "backend/app/api/ai_grounded.py"
    for class_name, anchor in (
        ("ClassifyRequest", "    title: str | None = Field(default=None, max_length=500)\n"),
        ("AssistantRequest", "    language: str = Field(default=\"fr\", max_length=10)\n"),
        ("RequestClassifyRequest", "    citizen_info: str | None = Field(default=None, max_length=2000)\n"),
        ("AssistantAskRequest", "    context: dict | None = None\n"),
        ("ProcedureSuggestRequest", "    citizen_need: str = Field(min_length=1, max_length=2000)\n"),
    ):
        file = Path(path)
        text = file.read_text(encoding="utf-8")
        class_start = text.index(f"class {class_name}(BaseModel):")
        class_end = text.find("\n\nclass ", class_start)
        if class_end == -1:
            class_end = text.find("\n\ndef ", class_start)
        segment = text[class_start:class_end]
        if anchor not in segment:
            raise SystemExit(f"{class_name}: anchor missing")
        segment = segment.replace(
            anchor,
            anchor + "    institution_id: str | None = Field(default=None, max_length=100)\n",
            1,
        )
        file.write_text(text[:class_start] + segment + text[class_end:], encoding="utf-8")

    replace_once(
        path,
        '''def _tenant_id(user: User) -> str | None:
    return user.tenant_id


def _as_http_error(exc: ValueError) -> HTTPException:
''',
        '''def _tenant_id(user: User) -> str | None:
    return user.tenant_id


def _catalog_scope(
    user: User,
    requested_institution_id: str | None,
) -> tuple[str | None, str | None]:
    """Return only server-trusted catalog scope for grounded AI retrieval."""
    if user.role in {RoleEnum.AGENT, RoleEnum.CHEF_SERVICE}:
        return None, user.institution_id
    if user.role in {RoleEnum.MAIRIE, RoleEnum.ADMIN, RoleEnum.AGENCE}:
        return user.institution_id, None
    return requested_institution_id, None


def _as_http_error(exc: ValueError) -> HTTPException:
''',
    )

    replacements = [
        (
            '''    return await grounded_government_ai.classify_text(
        db,
        request.text,
        _tenant_id(current_user),
        title=request.title,
    )
''',
            '''    institution_id, service_institution_id = _catalog_scope(
        current_user, request.institution_id
    )
    return await grounded_government_ai.classify_text(
        db,
        request.text,
        _tenant_id(current_user),
        title=request.title,
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
''',
        ),
        (
            '''    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
        language=request.language,
    )
''',
            '''    institution_id, service_institution_id = _catalog_scope(
        current_user, request.institution_id
    )
    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
        language=request.language,
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
''',
        ),
        (
            '''    return await grounded_government_ai.classify_text(
        db,
        combined,
        _tenant_id(current_user),
    )
''',
            '''    institution_id, service_institution_id = _catalog_scope(
        current_user, request.institution_id
    )
    return await grounded_government_ai.classify_text(
        db,
        combined,
        _tenant_id(current_user),
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
''',
        ),
        (
            '''    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
    )
''',
            '''    institution_id, service_institution_id = _catalog_scope(
        current_user, request.institution_id
    )
    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
''',
        ),
        (
            '''    return await grounded_government_ai.suggest_procedures(
        db,
        request.citizen_need,
        _tenant_id(current_user),
    )
''',
            '''    institution_id, service_institution_id = _catalog_scope(
        current_user, request.institution_id
    )
    return await grounded_government_ai.suggest_procedures(
        db,
        request.citizen_need,
        _tenant_id(current_user),
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
''',
        ),
    ]
    for old, new in replacements:
        replace_once(path, old, new)


def write_tests() -> None:
    Path("backend/tests/test_grounded_ai_municipality_scope.py").write_text(
        '''from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.api.ai_grounded import _catalog_scope
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.user import RoleEnum
from app.services.grounded_ai_service import GroundedGovernmentAssistant


def _user(role: RoleEnum, institution_id: str | None):
    return SimpleNamespace(role=role, institution_id=institution_id)


def test_catalog_scope_ignores_client_escape_for_municipal_staff():
    assert _catalog_scope(_user(RoleEnum.MAIRIE, "mairie-a"), "mairie-b") == (
        "mairie-a",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.ADMIN, "mairie-a"), "mairie-b") == (
        "mairie-a",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.AGENT, "service-a"), "mairie-b") == (
        None,
        "service-a",
    )
    assert _catalog_scope(_user(RoleEnum.CHEF_SERVICE, "service-a"), "mairie-b") == (
        None,
        "service-a",
    )


def test_catalog_scope_allows_explicit_target_for_citizen_and_supervision():
    assert _catalog_scope(_user(RoleEnum.CITOYEN, None), "mairie-b") == (
        "mairie-b",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.SUPER_ADMIN, None), "mairie-b") == (
        "mairie-b",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.MINISTRE, None), "mairie-b") == (
        "mairie-b",
        None,
    )


def _catalog_service(tenant_id: str, service_id: str, name: str) -> AdministrativeService:
    now = datetime.now(timezone.utc)
    return AdministrativeService(
        tenant_id=tenant_id,
        service_id=service_id,
        version=1,
        category_id="etat-civil",
        category_name="État civil",
        name=name,
        description=f"Démarche municipale {name}",
        sla_business_days=5,
        required_documents=[],
        routing_terms=["naissance", "certificat"],
        policy_status="operational_default",
        source_reference="TEST-AI-SCOPE",
        effective_from=now - timedelta(minutes=1),
        effective_to=None,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_find_services_is_scoped_by_municipality_assignment(db_session, test_tenant):
    mairie_a = Institution(
        id="ai-mairie-a",
        tenant_id=test_tenant.id,
        name="Mairie IA A",
        type="mairie",
        code="AI-MA-A",
        is_active=True,
    )
    mairie_b = Institution(
        id="ai-mairie-b",
        tenant_id=test_tenant.id,
        name="Mairie IA B",
        type="mairie",
        code="AI-MA-B",
        is_active=True,
    )
    service_a = Institution(
        id="ai-service-a",
        tenant_id=test_tenant.id,
        name="Service IA A",
        type="service",
        code="AI-SVC-A",
        parent_id=mairie_a.id,
        is_active=True,
    )
    service_b = Institution(
        id="ai-service-b",
        tenant_id=test_tenant.id,
        name="Service IA B",
        type="service",
        code="AI-SVC-B",
        parent_id=mairie_b.id,
        is_active=True,
    )
    catalog_a = _catalog_service(test_tenant.id, "ai-svc-a", "Naissance Alpha")
    catalog_b = _catalog_service(test_tenant.id, "ai-svc-b", "Naissance Beta")
    db_session.add_all([mairie_a, mairie_b, service_a, service_b, catalog_a, catalog_b])
    await db_session.flush()
    db_session.add_all(
        [
            InstitutionServiceAssignment(
                tenant_id=test_tenant.id,
                institution_id=mairie_a.id,
                service_id=catalog_a.service_id,
                service_institution_id=service_a.id,
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=test_tenant.id,
                institution_id=mairie_b.id,
                service_id=catalog_b.service_id,
                service_institution_id=service_b.id,
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    assistant = GroundedGovernmentAssistant()
    matches_a = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        institution_id=mairie_a.id,
    )
    matches_b = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        institution_id=mairie_b.id,
    )
    matches_service_a = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        service_institution_id=service_a.id,
    )

    assert [match.service.service_id for match in matches_a] == ["ai-svc-a"]
    assert [match.service.service_id for match in matches_b] == ["ai-svc-b"]
    assert [match.service.service_id for match in matches_service_a] == ["ai-svc-a"]


@pytest.mark.asyncio
async def test_scoped_grounded_ai_fails_closed_without_tenant(db_session):
    assistant = GroundedGovernmentAssistant()

    matches = await assistant.find_services(
        db_session,
        "naissance",
        None,
        institution_id="ai-mairie-a",
    )

    assert matches == []
''',
        encoding="utf-8",
    )


def main() -> None:
    patch_service()
    patch_api()
    write_tests()


if __name__ == "__main__":
    main()
