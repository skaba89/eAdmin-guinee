from pathlib import Path

path = Path("backend/scripts/check_document_version_rls.py")
text = path.read_text(encoding="utf-8")
marker = '''            cur.execute(
                """
                INSERT INTO users
'''
seed = '''            cur.execute(
                """
                INSERT INTO tenants (id, name)
                VALUES
                    ('tenant-a', 'Tenant A'),
                    ('tenant-b', 'Tenant B')
                ON CONFLICT (id) DO NOTHING
                """
            )
            cur.execute(
                """
                INSERT INTO institutions (id, tenant_id, name, type, code, is_active)
                VALUES
                    ('mairie-a', 'tenant-a', 'Mairie A', 'mairie', 'RLS-MA-A', true),
                    ('mairie-b', 'tenant-b', 'Mairie B', 'mairie', 'RLS-MA-B', true)
                ON CONFLICT (id) DO NOTHING
                """
            )
            cur.execute(
                """
                INSERT INTO users
'''
if text.count(marker) != 1:
    raise SystemExit("document RLS probe user seed marker mismatch")
path.write_text(text.replace(marker, seed, 1), encoding="utf-8")
