from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(rel: str, old: str, new: str) -> None:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"anchor missing in {rel}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Keep the historical sync scope resolver fail-closed. Child-service assignment
# is handled later, only after database-backed hierarchy validation.
replace_once(
    "backend/app/api/users.py",
    '''    requested_institution = (data.institution_id or actor_institution).strip()
    if requested_institution != actor_institution:
        if actor.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN) or data.role not in (
            RoleEnum.AGENT,
            RoleEnum.CHEF_SERVICE,
        ):
            raise HTTPException(status_code=403, detail="Création hors institution interdite.")
    return actor_tenant, requested_institution
''',
    '''    if data.institution_id and data.institution_id.strip() != actor_institution:
        raise HTTPException(status_code=403, detail="Création hors institution interdite.")
    return actor_tenant, actor_institution
''',
)

replace_once(
    "backend/app/api/users.py",
    '''    tenant_id, institution_id = _target_scope_for_create(current_user, user_data)
    canonical_institution, _ = await _validate_target_assignment(
''',
    '''    requested_institution = (user_data.institution_id or "").strip()
    governed_child_assignment = (
        current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN)
        and user_data.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE)
        and bool(requested_institution)
        and requested_institution != (current_user.institution_id or "").strip()
    )
    if governed_child_assignment:
        tenant_id = (current_user.tenant_id or settings.TENANT_DEFAULT_ID).strip()
        institution_id = requested_institution
    else:
        tenant_id, institution_id = _target_scope_for_create(current_user, user_data)

    canonical_institution, _ = await _validate_target_assignment(
''',
)

replace_once(
    "backend/app/api/users.py",
    '''    if current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE) and not await _institution_in_actor_scope(
        db, current_user, institution_id
    ):
        raise HTTPException(status_code=403, detail="Service cible hors de votre mairie.")

    user = User(
''',
    '''    if current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE) and not await _institution_in_actor_scope(
        db, current_user, institution_id
    ):
        raise HTTPException(status_code=403, detail="Service cible hors de votre mairie.")
    if governed_child_assignment:
        # Server-only slot consumed by the trusted before_flush guard. A browser
        # cannot populate this value and cross-mairie descendants are rejected above.
        db.sync_session.info["trusted_user_institution_id"] = institution_id

    user = User(
''',
)

# Preserve the validated child-service id when creating a staff account. The
# generic stamping rule remains fail-closed for every untrusted payload.
replace_once(
    "backend/app/database.py",
    '''    trusted_target = session.info.get("trusted_target_institution_id")
    trusted_target = str(trusted_target).strip() if trusted_target else None

    for obj in session.new:
''',
    '''    trusted_target = session.info.get("trusted_target_institution_id")
    trusted_target = str(trusted_target).strip() if trusted_target else None
    trusted_user_target = session.info.get("trusted_user_institution_id")
    trusted_user_target = str(trusted_user_target).strip() if trusted_user_target else None

    for obj in session.new:
''',
)
replace_once(
    "backend/app/database.py",
    '''            if is_citizen_request:
                setattr(obj, "institution_id", trusted_target)
            elif is_super_admin:
                if getattr(obj, "institution_id", None) in (None, ""):
                    setattr(obj, "institution_id", institution_id)
            else:
                setattr(obj, "institution_id", institution_id)
''',
    '''            is_governed_user_assignment = (
                obj.__class__.__name__ == "User"
                and role in {"MAIRIE", "ADMIN"}
                and trusted_user_target is not None
            )
            if is_citizen_request:
                setattr(obj, "institution_id", trusted_target)
            elif is_governed_user_assignment:
                setattr(obj, "institution_id", trusted_user_target)
            elif is_super_admin:
                if getattr(obj, "institution_id", None) in (None, ""):
                    setattr(obj, "institution_id", institution_id)
            else:
                setattr(obj, "institution_id", institution_id)
''',
)
replace_once(
    "backend/app/database.py",
    '''            session.sync_session.info.pop("trusted_target_institution_id", None)
            await session.close()
''',
    '''            session.sync_session.info.pop("trusted_target_institution_id", None)
            session.sync_session.info.pop("trusted_user_institution_id", None)
            await session.close()
''',
)

# Existing requests created before service_institution_id existed must become
# visible as soon as the mairie configures the logical service -> child-service
# mapping. This avoids a destructive data rewrite while preserving isolation.
replace_once(
    "backend/app/api/service_requests.py",
    "from app.models.institution import Institution\n",
    "from app.models.institution import Institution\nfrom app.models.institution_service_assignment import InstitutionServiceAssignment\n",
)
replace_once(
    "backend/app/api/service_requests.py",
    '''    if current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):
        return scoped.where(
            or_(
                ServiceRequest.service_institution_id == institution_id,
                and_(
                    ServiceRequest.service_institution_id.is_(None),
                    ServiceRequest.institution_id == institution_id,
                ),
            )
        )
''',
    '''    if current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):
        legacy_assignment = (
            select(InstitutionServiceAssignment.id)
            .where(
                InstitutionServiceAssignment.tenant_id == ServiceRequest.tenant_id,
                InstitutionServiceAssignment.institution_id == ServiceRequest.institution_id,
                InstitutionServiceAssignment.service_id == ServiceRequest.service_id,
                InstitutionServiceAssignment.service_institution_id == institution_id,
                InstitutionServiceAssignment.is_active.is_(True),
            )
            .exists()
        )
        return scoped.where(
            or_(
                ServiceRequest.service_institution_id == institution_id,
                and_(
                    ServiceRequest.service_institution_id.is_(None),
                    or_(
                        ServiceRequest.institution_id == institution_id,
                        legacy_assignment,
                    ),
                ),
            )
        )
''',
)

# PostgreSQL RLS mirrors the API rule and constrains assignment visibility by
# role. PUBLIC is tenant-scoped because the municipal catalog is public data.
migration = "backend/alembic/versions/municipality_service_request_routing.py"
replace_once(
    migration,
    '''                    OR (
                        service_institution_id IS NULL
                        AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
''',
    '''                    OR (
                        service_institution_id IS NULL
                        AND (
                            institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                            OR EXISTS (
                                SELECT 1
                                FROM institution_service_assignments isa
                                WHERE isa.tenant_id = service_requests.tenant_id
                                  AND isa.institution_id = service_requests.institution_id
                                  AND isa.service_id = service_requests.service_id
                                  AND isa.service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                                  AND isa.is_active = TRUE
                            )
                        )
                    )
''',
)
replace_once(
    migration,
    '''        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
        );
''',
    '''        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND (
                    current_setting('app.current_role', true) IN ('PUBLIC', 'CITOYEN', 'MINISTRE')
                    OR (
                        current_setting('app.current_role', true) = 'DIRECTEUR'
                        AND institution_id IN (
                            SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                        )
                    )
                    OR (
                        current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN', 'AGENCE')
                        AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
                    OR (
                        current_setting('app.current_role', true) IN ('AGENT', 'CHEF_SERVICE')
                        AND service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
                )
            )
        );
''',
)

# Extend the focused test with a historical request (no service_institution_id)
# so fixing new submissions cannot leave already-submitted citizen dossiers hidden.
test_path = ROOT / "backend/tests/test_municipality_service_request_routing.py"
test_text = test_path.read_text(encoding="utf-8")
test_text += '''\n\n@pytest.mark.asyncio\nasync def test_legacy_request_becomes_visible_through_mairie_service_mapping(db_session):\n    db_session.add_all([\n        Institution(id="legacy-mairie-a", tenant_id=TENANT, name="Legacy Mairie A", type="mairie", is_active=True),\n        Institution(id="legacy-service-a", tenant_id=TENANT, name="Legacy Service A", type="service", parent_id="legacy-mairie-a", is_active=True),\n        Institution(id="legacy-mairie-b", tenant_id=TENANT, name="Legacy Mairie B", type="mairie", is_active=True),\n        Institution(id="legacy-service-b", tenant_id=TENANT, name="Legacy Service B", type="service", parent_id="legacy-mairie-b", is_active=True),\n        InstitutionServiceAssignment(tenant_id=TENANT, institution_id="legacy-mairie-a", service_id="legacy-acte", service_institution_id="legacy-service-a", is_active=True),\n    ])\n    citizen = principal(RoleEnum.CITOYEN, None, "legacy-citizen@test.gn")\n    legacy = request_row("REQ-LEGACY-A", citizen, "legacy-mairie-a", "legacy-service-a", "legacy-acte")\n    legacy.service_institution_id = None\n    db_session.add(legacy)\n    await db_session.flush()\n\n    agent_a = principal(RoleEnum.AGENT, "legacy-service-a", "legacy-agent-a@test.gn")\n    agent_b = principal(RoleEnum.AGENT, "legacy-service-b", "legacy-agent-b@test.gn")\n    visible_a = (await db_session.execute(_apply_request_scope(select(ServiceRequest), agent_a))).scalars().all()\n    visible_b = (await db_session.execute(_apply_request_scope(select(ServiceRequest), agent_b))).scalars().all()\n    assert {row.reference for row in visible_a} == {"REQ-LEGACY-A"}\n    assert {row.reference for row in visible_b} == set()\n'''
test_path.write_text(test_text, encoding="utf-8")

print("municipality routing hardening applied")
