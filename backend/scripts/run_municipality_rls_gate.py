"""Run the municipality RLS proof with correct psycopg2 literal-SQL handling.

`verify_municipality_rls` contains both parameterized statements and a few
constant SQL statements whose text legitimately contains a literal percent
sign (for example a LIKE pattern). psycopg2 performs percent interpolation only
when a parameter sequence is supplied, so this runner deliberately calls
`cursor.execute(sql)` for statements with no parameters and preserves normal
parameter binding for every parameterized statement.
"""

from __future__ import annotations

import verify_municipality_rls as matrix
from psycopg2.extensions import connection as PgConnection


def scalar(conn: PgConnection, sql: str, params: tuple = ()) -> str | None:
    with conn.cursor() as cur:
        if params:
            cur.execute(sql, params)
        else:
            cur.execute(sql)
        row = cur.fetchone()
        if row is None or row[0] is None:
            return None
        return str(row[0])


def execute(conn: PgConnection, sql: str, params: tuple = ()) -> None:
    with conn.cursor() as cur:
        if params:
            cur.execute(sql, params)
        else:
            cur.execute(sql)


def main() -> None:
    matrix.scalar = scalar
    matrix.execute = execute
    matrix.main()


if __name__ == "__main__":
    main()
