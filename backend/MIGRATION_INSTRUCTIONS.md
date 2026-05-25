# Alembic Migration Instructions

## Pending Migration: Enhanced AuditLog Model

After the model changes in `app/models/audit.py`, a database migration is required.

### New Fields Added to `audit_logs` Table

| Column          | Type         | Nullable | Description                                    |
|-----------------|--------------|----------|------------------------------------------------|
| `user_agent`    | VARCHAR(512) | Yes      | Browser/client user agent                      |
| `session_id`    | VARCHAR(255) | Yes      | Session identifier                             |
| `resource_name` | VARCHAR(255) | Yes      | Human-readable resource name                   |
| `old_value`     | TEXT         | Yes      | Previous value for modifications (JSON string) |
| `new_value`     | TEXT         | Yes      | New value for modifications (JSON string)      |

### How to Generate and Apply the Migration

```bash
# Step 1: Generate the migration script
cd /home/z/my-project/backend
alembic revision --autogenerate -m "add_enhanced_audit_fields"

# Step 2: Review the generated migration in alembic/versions/
# Ensure it contains the expected ALTER TABLE statements for audit_logs

# Step 3: Apply the migration
alembic upgrade head

# Step 4: Verify the migration
alembic current
```

### Notes

- All new columns are nullable, so this is a non-destructive migration.
- Existing rows will have `NULL` values for the new columns.
- No data backfill is required.
- The `action` column type (String(100)) remains unchanged; the new action type
  constants (LOGIN, LOGOUT, CREATE, READ, UPDATE, DELETE, EXPORT, SIGN, APPROVE,
  REJECT, ESCALATE, DOWNLOAD, UPLOAD, WORKFLOW_STEP, PASSWORD_CHANGE) are
  documented in the model but not enforced at the database level.
