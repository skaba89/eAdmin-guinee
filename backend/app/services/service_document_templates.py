"""Safe, server-authoritative rendering for administrative service documents.

Templates are deliberately plain text with a small allow-list of placeholders.
They are never arbitrary HTML. The backend owns the final HTML layout and
escapes every rendered value before persistence.
"""

from __future__ import annotations

import hashlib
import html
import re
from datetime import datetime, timezone
from string import Template

from fastapi import HTTPException

from app.models.administrative_service import AdministrativeService
from app.models.service_request import ServiceRequest

ALLOWED_DOCUMENT_PLACEHOLDERS = frozenset(
    {
        "reference",
        "citizen_full_name",
        "citizen_nin",
        "citizen_phone",
        "citizen_email",
        "citizen_address",
        "service_name",
        "institution_name",
        "motif",
        "issue_date",
        "delivery_mode",
        "mairie",
    }
)

_PLACEHOLDER_RE = re.compile(r"\$\{([a-z_][a-z0-9_]*)\}")
_SAFE_FILE_RE = re.compile(r"[^a-z0-9-]+")


def validate_document_template(title: str, body: str) -> None:
    """Validate template syntax and reject undeclared placeholders."""
    for value, field in ((title, "title"), (body, "body")):
        template = Template(value)
        if not template.is_valid():
            raise ValueError(f"Syntaxe de modèle invalide dans {field}.")
        identifiers = set(template.get_identifiers())
        unknown = sorted(identifiers - ALLOWED_DOCUMENT_PLACEHOLDERS)
        if unknown:
            raise ValueError(
                "Variables de modèle non autorisées : " + ", ".join(unknown)
            )


def document_template_fingerprint(title: str, body: str) -> str:
    """Stable fingerprint for one approved plain-text template revision."""
    validate_document_template(title, body)
    canonical = f"{title.strip()}\n---\n{body.strip()}".encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _delivery_label(value: str) -> str:
    return {
        "en_ligne": "En ligne",
        "guichet": "Au guichet",
        "courrier": "Par courrier",
    }.get(value, value)


def _render_plain_text(template_value: str, context: dict[str, str]) -> str:
    try:
        rendered = Template(template_value).substitute(context)
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=409,
            detail="Le modèle administratif approuvé est invalide ou incomplet.",
        ) from exc
    return rendered


def _paragraph_html(value: str) -> str:
    paragraphs = [part.strip() for part in value.replace("\r\n", "\n").split("\n\n")]
    return "".join(
        f"<p>{html.escape(part).replace(chr(10), '<br>')}</p>"
        for part in paragraphs
        if part
    )


def render_approved_document(
    *,
    request: ServiceRequest,
    service: AdministrativeService,
    generated_by_name: str,
    generated_at: datetime | None = None,
) -> tuple[str, str, str, str]:
    """Render approved service template into controlled HTML.

    Returns ``(title, html_content, file_name, template_hash)``.
    """
    if service.document_template_status != "approved":
        raise HTTPException(
            status_code=409,
            detail="Aucun modèle documentaire approuvé n'est disponible pour cette version de démarche.",
        )
    if not service.document_template_title or not service.document_template_body:
        raise HTTPException(
            status_code=409,
            detail="Le modèle documentaire approuvé est incomplet.",
        )
    if not service.document_template_source_reference:
        raise HTTPException(
            status_code=409,
            detail="Le modèle documentaire approuvé ne référence aucune source institutionnelle.",
        )

    expected_hash = document_template_fingerprint(
        service.document_template_title,
        service.document_template_body,
    )
    if not service.document_template_hash or service.document_template_hash != expected_hash:
        raise HTTPException(
            status_code=409,
            detail="L'intégrité du modèle documentaire approuvé ne peut pas être vérifiée.",
        )

    issued_at = generated_at or datetime.now(timezone.utc)
    context = {
        "reference": request.reference,
        "citizen_full_name": f"{request.citizen_first_name} {request.citizen_name}".strip(),
        "citizen_nin": request.citizen_nin,
        "citizen_phone": request.citizen_phone,
        "citizen_email": request.citizen_email,
        "citizen_address": request.citizen_address,
        "service_name": request.service_name,
        "institution_name": request.assigned_service,
        "motif": request.motif,
        "issue_date": issued_at.strftime("%d/%m/%Y"),
        "delivery_mode": _delivery_label(request.delivery_mode.value),
        "mairie": request.mairie or "",
    }

    title = _render_plain_text(service.document_template_title, context).strip()
    body = _render_plain_text(service.document_template_body, context).strip()
    if not title or not body:
        raise HTTPException(status_code=409, detail="Le rendu du modèle administratif est vide.")

    safe_title = html.escape(title)
    safe_institution = html.escape(request.assigned_service)
    safe_reference = html.escape(request.reference)
    safe_source = html.escape(service.document_template_source_reference)
    safe_generated_by = html.escape(generated_by_name)
    safe_template_hash = html.escape(expected_hash)
    rendered_body = _paragraph_html(body)

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_title}</title>
  <style>
    @page {{ size: A4; margin: 18mm; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: Georgia, 'Times New Roman', serif; color: #172033; line-height: 1.55; margin: 0 auto; max-width: 210mm; padding: 18mm; background: #fff; }}
    .flag {{ display: grid; grid-template-columns: repeat(3, 1fr); height: 6px; margin-bottom: 18px; }}
    .flag span:nth-child(1) {{ background: #CE1126; }}
    .flag span:nth-child(2) {{ background: #FCD116; }}
    .flag span:nth-child(3) {{ background: #009460; }}
    header {{ text-align: center; border-bottom: 2px solid #0B2E58; padding-bottom: 16px; }}
    header h1 {{ margin: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 2px; color: #0B2E58; }}
    header .institution {{ margin-top: 8px; font-weight: 700; font-size: 14px; }}
    main h2 {{ text-align: center; text-transform: uppercase; color: #0B2E58; margin: 28px 0 6px; font-size: 19px; }}
    .reference {{ text-align: center; color: #536078; font-size: 13px; margin-bottom: 28px; }}
    .body {{ font-size: 15px; text-align: justify; }}
    .body p {{ margin: 0 0 14px; }}
    .audit {{ margin-top: 44px; border-top: 1px solid #d8dee8; padding-top: 12px; color: #5e687b; font: 11px/1.45 system-ui, sans-serif; }}
    .audit div {{ margin: 3px 0; }}
    .hash {{ overflow-wrap: anywhere; }}
    @media print {{ body {{ padding: 0; }} }}
  </style>
</head>
<body>
  <div class="flag"><span></span><span></span><span></span></div>
  <header>
    <h1>République de Guinée</h1>
    <div class="institution">{safe_institution}</div>
  </header>
  <main>
    <h2>{safe_title}</h2>
    <div class="reference">Référence de demande : {safe_reference}</div>
    <section class="body">{rendered_body}</section>
    <section class="audit">
      <div>Généré côté serveur le {issued_at.strftime('%d/%m/%Y à %H:%M UTC')} par {safe_generated_by}.</div>
      <div>Version de démarche : {service.version} — Source du modèle : {safe_source}</div>
      <div class="hash">Empreinte du modèle : {safe_template_hash}</div>
      <div>La signature, le cachet ou la qualification électronique éventuels relèvent du circuit de confiance institutionnel séparé.</div>
    </section>
  </main>
</body>
</html>"""

    slug = request.service_name.lower().replace("_", "-").replace(" ", "-")
    slug = _SAFE_FILE_RE.sub("-", slug).strip("-") or "document-administratif"
    file_name = f"{request.reference}-{slug}.html"
    return title, html_content, file_name, expected_hash
