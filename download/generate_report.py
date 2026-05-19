# -*- coding: utf-8 -*-
"""
eAdministration Suite Guinea — Analyse et Propositions d'Amelioration
Comprehensive PDF report with international best practices
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image, KeepTogether, CondPageBreak, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))

registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans')
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ── Palette ──────────────────────────────────────────────────────────
ACCENT       = colors.HexColor('#0B2E58')
ACCENT_LIGHT = colors.HexColor('#3B7DD8')
GOLD         = colors.HexColor('#C8A45C')
GUINEA_RED   = colors.HexColor('#CE1126')
GUINEA_GREEN = colors.HexColor('#009460')
TEXT_PRIMARY  = colors.HexColor('#1a1c1d')
TEXT_MUTED    = colors.HexColor('#7e838a')
BG_SURFACE   = colors.HexColor('#e8ecf0')
BG_PAGE      = colors.HexColor('#f5f7fa')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── Page Setup ───────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOT_M = 0.8 * inch
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

# ── Styles ───────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

cover_title = ParagraphStyle('CoverTitle', fontName='LiberationSerif', fontSize=32,
    leading=40, alignment=TA_CENTER, textColor=ACCENT, spaceAfter=12)

cover_sub = ParagraphStyle('CoverSub', fontName='LiberationSerif', fontSize=16,
    leading=22, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=8)

h1_style = ParagraphStyle('H1', fontName='LiberationSerif', fontSize=20,
    leading=28, textColor=ACCENT, spaceBefore=18, spaceAfter=10)

h2_style = ParagraphStyle('H2', fontName='LiberationSerif', fontSize=15,
    leading=22, textColor=ACCENT_LIGHT, spaceBefore=14, spaceAfter=8)

h3_style = ParagraphStyle('H3', fontName='LiberationSerif', fontSize=12,
    leading=18, textColor=GOLD, spaceBefore=10, spaceAfter=6)

body_style = ParagraphStyle('Body', fontName='LiberationSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=2, spaceAfter=6, firstLineIndent=0)

body_indent = ParagraphStyle('BodyIndent', parent=body_style, leftIndent=20)


bullet_style = ParagraphStyle('Bullet', fontName='LiberationSerif', fontSize=10.5,
    leading=17, textColor=TEXT_PRIMARY, leftIndent=24, firstLineIndent=-12,
    spaceBefore=2, spaceAfter=4)

callout_style = ParagraphStyle('Callout', fontName='LiberationSerif', fontSize=11,
    leading=18, textColor=ACCENT, leftIndent=16, borderPadding=8,
    spaceBefore=8, spaceAfter=8)

caption_style = ParagraphStyle('Caption', fontName='LiberationSerif', fontSize=9,
    leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6)

header_cell = ParagraphStyle('HeaderCell', fontName='LiberationSans', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER)

cell_style = ParagraphStyle('Cell', fontName='LiberationSans', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER)

cell_left = ParagraphStyle('CellLeft', fontName='LiberationSans', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT)

# ── TOC Template ─────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ── Heading Helper ───────────────────────────────────────────────────
def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN = (PAGE_H - TOP_M - BOT_M) * 0.15

def section(text):
    return [CondPageBreak(H1_ORPHAN), add_heading(text, h1_style, level=0)]

def subsection(text):
    return [add_heading(text, h2_style, level=1)]

def subsubsection(text):
    return [add_heading(text, h3_style, level=2)]

# ── Table Helper ─────────────────────────────────────────────────────
def make_table(headers, rows, col_widths=None):
    if col_widths is None:
        col_widths = [AVAILABLE_W / len(headers)] * len(headers)
    data = [[Paragraph('<b>%s</b>' % h, header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_left) for c in row])
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ── Build Story ──────────────────────────────────────────────────────
OUTPUT_PATH = '/home/z/my-project/download/eAdmin_Guinee_Analyse_Propositions.pdf'

doc = TocDocTemplate(OUTPUT_PATH, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M)

story = []

# ════════════════════════════════════════════════════════════════════
# COVER PAGE
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 80))
story.append(HRFlowable(width="80%", thickness=3, color=GUINEA_RED, spaceAfter=2))
story.append(HRFlowable(width="80%", thickness=3, color=GOLD, spaceAfter=2))
story.append(HRFlowable(width="80%", thickness=3, color=GUINEA_GREEN, spaceAfter=30))
story.append(Spacer(1, 20))
story.append(Paragraph('<b>eAdministration Suite Guinea</b>', cover_title))
story.append(Spacer(1, 12))
story.append(Paragraph('Analyse du Systeme Actuel et<br/>Propositions d\'Amelioration Inspirees<br/>des Meilleures Pratiques Internationales', cover_sub))
story.append(Spacer(1, 30))
story.append(HRFlowable(width="40%", thickness=1, color=ACCENT_LIGHT, spaceAfter=16))
story.append(Paragraph('Republique de Guinee', ParagraphStyle('CoverInst', fontName='LiberationSerif',
    fontSize=13, leading=18, alignment=TA_CENTER, textColor=ACCENT)))
story.append(Paragraph('Ministere de l\'Administration Territoriale<br/>et de la Decentralisation', ParagraphStyle('CoverMin',
    fontName='LiberationSerif', fontSize=11, leading=16, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 40))
story.append(Paragraph('Mai 2026', ParagraphStyle('CoverDate', fontName='LiberationSerif',
    fontSize=12, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 12))
story.append(Paragraph('Document confidentiel', ParagraphStyle('CoverConf', fontName='LiberationSerif',
    fontSize=9, alignment=TA_CENTER, textColor=GUINEA_RED)))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ════════════════════════════════════════════════════════════════════
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName='LiberationSerif', fontSize=13, leading=20, leftIndent=20, spaceBefore=6),
    ParagraphStyle('TOC2', fontName='LiberationSerif', fontSize=11, leading=17, leftIndent=40, spaceBefore=3),
]
story.append(Paragraph('<b>Table des Matieres</b>', ParagraphStyle('TOCTitle',
    fontName='LiberationSerif', fontSize=18, leading=24, textColor=ACCENT, spaceAfter=16)))
story.append(toc)
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════════
# 1. RESUME EXECUTIF
# ════════════════════════════════════════════════════════════════════
story.extend(section('1. Resume Executif'))
story.append(Paragraph(
    'Le present document constitue une analyse approfondie de la plateforme eAdministration Suite Guinea, '
    'solution GovTech SaaS dediee a la modernisation de l\'administration publique guineenne. Cette analyse '
    'identifie les forces du systeme actuel, diagnostique les lacunes critiques, et propose un plan '
    'd\'amelioration structure s\'inspirant des meilleures pratiques internationales observees dans les '
    'plateformes gouvernementales numeriques les plus avancees au monde.', body_style))
story.append(Paragraph(
    'L\'eAdministration Suite Guinea propose actuellement 28 services publics repartis en 10 categories, '
    'un systeme RBAC avec 6 roles et 65 permissions, un workflow de traitement des demandes citoyennes '
    'en 7 etats, et une interface moderne aux couleurs nationales. Cependant, l\'analyse revele des '
    'problemes critiques de securite des donnees, d\'experience utilisateur, et d\'architecture technique '
    'qui limitent considerablement le potentiel de la plateforme pour un deploiement a l\'echelle nationale.', body_style))
story.append(Paragraph(
    'Les propositions d\'amelioration s\'articulent autour de quatre axes strategiques : la securisation '
    'des donnees et la conformite reglementaire, l\'amelioration de l\'experience citoyenne inspiree de '
    'l\'Estonie et du Rwanda, l\'interoperabilite des systemes gouvernementaux sur le modele de X-Road, '
    'et l\'integration des technologies emergentes notamment l\'intelligence artificielle et le mobile money. '
    'Le plan d\'implementation propose s\'etend sur 48 mois en quatre phases progressives.', body_style))

story.append(Spacer(1, 12))
# Key metrics callout
story.append(make_table(
    ['Indicateur', 'Etat Actuel', 'Objectif 2028'],
    [
        ['Services en ligne', '28 services', '100+ services'],
        ['Taux de traitement numerique', '15% (estime)', '80%'],
        ['Delai moyen de traitement', 'Variable (2-30 jours)', '48h maximum'],
        ['Couverture territoriale', 'Conakry uniquement', '8 regions + 34 prefectures'],
        ['Integration paiement', 'Aucune', 'Orange Money + MTN Mobile Money'],
        ['Interoperabilite', 'Aucune', 'X-Road (6+ ministeres)'],
        ['Satisfaction citoyenne', 'Non mesuree', '4.5/5 minimum'],
    ],
    col_widths=[AVAILABLE_W*0.35, AVAILABLE_W*0.30, AVAILABLE_W*0.35]
))
story.append(Paragraph('Tableau 1 : Indicateurs cles de performance - Etat actuel vs Objectifs 2028', caption_style))

# ════════════════════════════════════════════════════════════════════
# 2. ANALYSE DU SYSTEME ACTUEL
# ════════════════════════════════════════════════════════════════════
story.extend(section('2. Analyse du Systeme Actuel'))

story.extend(subsection('2.1 Architecture et Technologies'))
story.append(Paragraph(
    'La plateforme eAdministration Suite Guinea est construite sur une architecture moderne '
    'utilisant Next.js 16.1.3 avec Turbopack, React 19, TypeScript, et Tailwind CSS pour le frontend. '
    'La gestion d\'etat repose sur 15 stores Zustand avec persistance localStorage, offrant une experience '
    'SPA reactive et fluide. Le backend Python FastAPI est partiellement implemente avec des modeles '
    'SQLAlchemy et des routes API, mais n\'est pas encore integre au frontend qui fonctionne entierement '
    'cote client. L\'ensemble des donnees est stocke dans le localStorage du navigateur, ce qui constitue '
    'une limitation majeure pour un systeme de production.', body_style))
story.append(Paragraph(
    'L\'interface utilisateur est soignee, avec un theme aux couleurs nationales de la Guinee '
    '(rouge #CE1126, jaune #FCD116, vert #009460), un mode sombre complet, et des animations '
    'Framer Motion qui apportent une touche professionnelle. Les composants shadcn/ui assurent '
    'une coherence visuelle a travers l\'ensemble de l\'application. Le systeme de navigation est '
    'adapte par role, avec des tableaux de bord dedies pour chaque type d\'utilisateur : Centre de '
    'Commandement Interministeriel pour les ministres, tableau de bord Mairie pour les agents '
    'communaux, portail citoyen pour les usagers, et tableau de bord ANIP pour les agents d\'identification.', body_style))

story.extend(subsection('2.2 Services Publics'))
story.append(Paragraph(
    'La plateforme offre 28 services publics numerises repartis en 10 categories couvrant les '
    'domaines essentiels de l\'administration guineenne. Chaque service est defini avec ses documents '
    'requis, son workflow de traitement, ses motifs de rejet, et ses informations tarifaires. '
    'Le catalogue couvre l\'etat civil (6 services), la justice (3 services), l\'identification (3 services), '
    'l\'urbanisme (3 services), l\'entreprise (3 services), l\'education (3 services), la sante (2 services), '
    'la residence (2 services), la fiscalite (2 services) et le social (2 services). Cette couverture '
    'represente environ 30% des services administratifs courants, ce qui est un bon point de depart '
    'mais insuffisant pour une plateforme nationale.', body_style))

story.extend(subsection('2.3 Systeme RBAC et Securite'))
story.append(Paragraph(
    'Le systeme de controle d\'acces base sur les roles (RBAC) comprend 6 roles, 65 permissions, '
    '14 regles d\'acces aux pages, et un systeme de securite au niveau des lignes (RLS) et des colonnes. '
    'Cependant, l\'analyse a revele un probleme critique : les noms de roles utilises par le store '
    'd\'application (citizen, admin_general, super_admin) ne correspondent pas a ceux du systeme RBAC '
    '(citoyen, admin, superadmin), ce qui rend toutes les verifications de permissions silencieusement '
    'inoperantes. Ce bug a ete corrige dans cette analyse par l\'ajout d\'une couche de mappage des roles.', body_style))
story.append(Paragraph(
    'De plus, le filtrage RLS n\'etait pas applique dans la page de traitement des demandes, ce qui '
    'signifiait qu\'un agent de mairie pouvait voir les demandes de justice et d\'identification, et '
    'qu\'un citoyen pouvait consulter les demandes des autres usagers incluant leurs numeros NIN. '
    'Ces failles de securite sont critiques dans un contexte gouvernemental ou la protection des '
    'donnees personnelles est reglementairement obligatoire selon la Loi L/2016/018/AN relative a '
    'la protection des donnees personnelles de la Republique de Guinee.', body_style))

story.extend(subsection('2.4 Problemes Critiques Identifies'))
story.append(Spacer(1, 6))
story.append(make_table(
    ['Categorie', 'Probleme', 'Severite', 'Impact'],
    [
        ['Securite', 'Incoherence des noms de roles RBAC', 'Critique', 'Toutes les permissions sont inoperantes'],
        ['Securite', 'Pas de filtrage RLS dans service-requests', 'Critique', 'Fuite de donnees sensibles'],
        ['Securite', 'Mots de passe en clair dans le store', 'Elevee', 'Violation potentielle de donnees'],
        ['Securite', 'Pas d\'authentification serveur (JWT)', 'Elevee', 'Acces non securise'],
        ['Architecture', 'Donnees en localStorage uniquement', 'Elevee', 'Perte de donnees, pas de partage'],
        ['Architecture', 'Pas d\'API backend connectee', 'Elevee', 'Pas de persistance multi-appareils'],
        ['UX', 'Dashboard non filtre par role', 'Moyenne', 'Donnees non pertinentes affichees'],
        ['UX', 'Pas de notifications temps reel', 'Moyenne', 'Citoyen non informe des changements'],
        ['Technique', 'Fichiers en base64 dans localStorage', 'Moyenne', 'Limite 5-10Mo du navigateur'],
        ['Technique', 'Pas de generation PDF reelle', 'Moyenne', 'Documents non officiels'],
        ['Reglementaire', 'Pas de conformite Loi L/2016/018', 'Elevee', 'Risque juridique'],
    ],
    col_widths=[AVAILABLE_W*0.16, AVAILABLE_W*0.38, AVAILABLE_W*0.14, AVAILABLE_W*0.32]
))
story.append(Paragraph('Tableau 2 : Inventaire des problemes critiques identifies', caption_style))

# ════════════════════════════════════════════════════════════════════
# 3. BENCHMARK INTERNATIONAL
# ════════════════════════════════════════════════════════════════════
story.extend(section('3. Benchmark International : Meilleures Pratiques GovTech'))

story.extend(subsection('3.1 Estonie - Le Modele e-Estonie'))
story.append(Paragraph(
    'L\'Estonie est mondialement reconnue comme le leader de l\'e-gouvernement. Classee 2eme au classement '
    'UN EGDI 2024, elle a transforme son administration publique grace a une vision numerique ambitieuse '
    'lancee des les annees 1990. Le pilier central de l\'ecosysteme estonien est X-Road, une infrastructure '
    'd\'echange de donnees qui permet a plus de 900 organisations de partager des informations de maniere '
    'securisee en temps reel. Ce systeme elimine le principe de la double saisie et implemente le '
    '"once-only principle" : le citoyen fournit une information une seule fois, et les administrations '
    'se la partagent avec son consentement explicite.', body_style))
story.append(Paragraph(
    'L\'identite numerique estonienne (e-ID) est universelle : chaque citoyen possede une carte a puce '
    'qui lui permet de voter en ligne, signer des contrats, declarer ses impots, et acceder a plus de '
    '600 services en ligne. Le systeme e-ID est utilise par 99% des estoniens, et les citoyens peuvent '
    'consulter un journal d\'audit personnel qui enregistre chaque acces a leurs donnees par les '
    'administrations, assurant une transparence totale. Cette transparence est un facteur cle de confiance : '
    'en 2024, 98% des estoniens declarent faire confiance au systeme numerique gouvernemental. '
    'L\'Estonie economise l\'equivalent de 1 400 annees de travail chaque annee grace a la dematerialisation, '
    'et le traitement moyen d\'une demande administrative ne depasse pas 3 minutes.', body_style))

story.extend(subsection('3.2 Rwanda - Irembo : Le Modele Africain'))
story.append(Paragraph(
    'Le Rwanda, avec sa plateforme Irembo, represente le modele africain le plus avance en matiere de '
    'GovTech. Lancee en 2018, Irembo offre plus de 100 services gouvernementaux en ligne et a ete '
    'concue specifiquement pour le contexte africain avec trois innovations majeures. Premierement, '
    'l\'acces USSD permet aux citoyens disposant uniquement de telephones basiques d\'aceder aux '
    'services via des codes USSD, eliminant la barriere smartphone qui exclut 40% de la population '
    'africaine. Deuxiemement, le reseau Irembo Centers deploye dans les 30 districts du Rwanda '
    'offre des points d\'acces physiques ou les citoyens peuvent etre accompagnes dans leurs demarches '
    'numeriques par des agents formes, palliant le defi de l\'illectronisme.', body_style))
story.append(Paragraph(
    'Troisiemement, l\'integration MTN Mobile Money et Airtel Money permet le paiement des taxes '
    'et frais administratifs directement depuis le telephone mobile, levant un obstacle majeur dans '
    'un pays ou seule 15% de la population possede un compte bancaire classique. Le Rwanda a '
    'egalement implemente un systeme d\'identite numerique nationale (NID) qui sert de base '
    'd\'authentification pour tous les services, et les taux de satisfaction atteignent 92% selon '
    'les enquetes gouvernementales de 2024. Ces resultats demontrent qu\'une plateforme GovTech '
    'reussie en Afrique doit etre concue "mobile-first" et integrer les solutions de paiement mobile '
    'locales plutot que de reproduire les modeles occidentaux.', body_style))

story.extend(subsection('3.3 Singapour - Singpass : Le Modele Asiatique'))
story.append(Paragraph(
    'Singapour, classe 3eme au classement UN EGDI 2024, a developpe Singpass, un systeme d\'identite '
    'numerique utilise par 4.5 millions de personnes, soit 97% de la population eligible. Singpass '
    'fonctionne comme un passeport numerique unique permettant d\'acceder a plus de 2 000 services '
    'gouvernementaux et prives. Le systeme supporte l\'authentification faciale, les notifications '
    'push securisees, et les signatures numeriques legales. L\'architecture est centree sur le citoyen : '
    'chaque personne possede un "dossier numerique" regroupant ses documents administratifs, ses '
    'certificats, et son historique de transactions gouvernementales.', body_style))
story.append(Paragraph(
    'La plateforme Gov.sg unifie tous les canaux de communication gouvernementaux : site web, '
    'application mobile, chatbot WhatsApp, et kiosques physiques. Le design system est rigoureusement '
    'standardise avec une charte graphique unique assuree par le Digital Government Blueprint. '
    'Singapour investit massivement dans l\'IA : le systeme Moments of Life utilise l\'intelligence '
    'artificielle pour anticiper les besoins administratifs des citoyens a chaque etape de leur vie '
    '(naissance, mariage, retraite) et proactivement suggere les services pertinents. Cette approche '
    '"life event" plutot que "service-by-service" revolutionne l\'experience citoyenne en eliminant '
    'la complexite administrative.', body_style))

story.extend(subsection('3.4 Royaume-Uni - GOV.UK : Le Modele de Simplicite'))
story.append(Paragraph(
    'Le GOV.UK du Royaume-Uni, classe 1er au classement Waseda 2025, est devenu la reference mondiale '
    'en matiere de design de services gouvernementaux numeriques. Sa philosophie fondamentale est la '
    'simplicite radicale : le site est concu pour etre comprehensible par un citoyen ayant un niveau '
    'de lecture de 9 ans, conformement aux standards d\'accessibilite WCAG 2.1 AA. Le GOV.UK Design '
    'System est open-source et impose une uniformite visuelle a travers plus de 300 services '
    'gouvernementaux, eliminant la confusion citee par les citoyens face a des interfaces differentes '
    'selon le ministere.', body_style))
story.append(Paragraph(
    'GOV.UK Notify est un systeme de notifications multi-canal (SMS, email, courrier) qui permet '
    'a n\'importe quelle administration d\'envoyer des notifications standardisees aux citoyens en '
    'quelques lignes de code. Ce service traite plus de 5 milliards de notifications par an et est '
    'egalement open-source. Le systeme Verify fournit une authentification federee permettant aux '
    'citoyens de se connecter a tous les services gouvernementaux avec un seul identifiant, et le '
    'GOV.UK Pay unifie les paiements en ligne. Ces trois briques (Verify, Notify, Pay) forment '
    'l\'infrastructure de base que le Royaume-Uni recommande a tout gouvernement souhaitant '
    'digitaliser ses services. La Guinee pourrait s\'en inspirer pour batir des briques similaires '
    'adaptees au contexte local.', body_style))

story.extend(subsection('3.5 Inde - Digital India : Le Modele de la Couverture a Grande Echelle'))
story.append(Paragraph(
    'L\'Inde, avec son programme Digital India, represente le modele le plus ambitieux de transformation '
    'numerique a l\'echelle d\'un milliard de personnes. Le pilier Aadhaar fournit une identite '
    'numerique unique a 1.4 milliard d\'Indiens, servant de base a l\'authentification pour tous les '
    'services gouvernementaux. Le systeme UPI (Unified Payments Interface) a revolutionne les paiements '
    'numeriques avec 10 milliards de transactions mensuelles en 2025, et DigiLocker permet aux citoyens '
    'de stocker et partager leurs documents officiels numeriquement. L\'application UMANG unifie l\'acces '
    'a plus de 1 200 services gouvernementaux de 127 ministères et departements.', body_style))
story.append(Paragraph(
    'Le modele indien est particulierement pertinent pour la Guinee car il demontre qu\'il est possible '
    'de deployer une infrastructure numerique a grande echelle dans un pays en developpement. Les '
    'Centres de Services Communs (CSC), au nombre de 500 000 a travers l\'Inde, offrent des points '
    'd\'acces physiques ou les citoyens ruraux peuvent etre accompagnes dans leurs demarches. Ce '
    'reseau d\'intermediaires est essentiel dans un contexte ou l\'illectronisme reste important, et '
    'il pourrait etre adapte en Guinee avec les centres de services communautaires existants.', body_style))

# ════════════════════════════════════════════════════════════════════
# 4. PROPOSITIONS D'AMELIORATION
# ════════════════════════════════════════════════════════════════════
story.extend(section('4. Propositions d\'Amelioration'))

story.extend(subsection('4.1 Securite et Conformite Reglementaire'))
story.append(Paragraph(
    '<b>4.1.1 Authentification securisee (JWT + OAuth 2.0)</b> : Remplacer l\'authentification cote client '
    'par un systeme d\'authentification serveur base sur JWT (JSON Web Tokens) avec refresh tokens. '
    'Implementer OAuth 2.0 pour permettre une authentification federee compatible avec les futures '
    'identites numeriques guineennes. Ajouter l\'authentification multi-facteurs (MFA) avec envoi de '
    'codes OTP par SMS via les operateurs locaux (Orange, MTN, Celcom). Cette mesure est prioritaire '
    'car sans authentification serveur, tout le systeme RBAC est contournable.', body_style))
story.append(Paragraph(
    '<b>4.1.2 Chiffrement des donnees sensibles</b> : Implementer le chiffrement AES-256 pour les '
    'donnees personnelles stockees (NIN, numeros de telephone, adresses). Les mots de passe doivent '
    'etre haches avec bcrypt ou Argon2 avant stockage. Les documents uploade doivent etre chiffres '
    'cote serveur avec des cles de rotation automatique. Le chiffrement en transit doit utiliser '
    'TLS 1.3 obligatoire sur toutes les communications.', body_style))
story.append(Paragraph(
    '<b>4.1.3 Conformite Loi L/2016/018/AN</b> : Implementer un journal d\'audit des acces aux '
    'donnees personnelles (inspire du systeme estonien), permettant a chaque citoyen de consulter '
    'qui a accede a ses donnees et quand. Ajouter un mecanisme de consentement explicite pour le '
    'partage de donnees entre administrations. Designer un DPO (Data Protection Officer) et '
    'documenter les traitements de donnees dans un registre conforme a la loi guineenne.', body_style))

story.extend(subsection('4.2 Experience Citoyenne'))
story.append(Paragraph(
    '<b>4.2.1 Portail USSD pour les telephones basiques</b> : Developper une interface USSD '
    '(inspiree du modele Irembo du Rwanda) permettant aux citoyens disposant uniquement de '
    'telephones basiques de soumettre des demandes, verifier le statut de leurs dossiers, et '
    'recevoir des notifications. En Guinee, environ 60% de la population utilise des telephones '
    'basiques, rendant l\'acces USSD indispensable pour l\'inclusion numerique. Les codes USSD '
    'pourraient etre : *123# pour le menu principal, *123*1# pour soumettre une demande, '
    '*123*2# pour suivre un dossier, *123*3# pour les notifications.', body_style))
story.append(Paragraph(
    '<b>4.2.2 Notifications multi-canal</b> : Implementer un systeme de notifications inspire '
    'de GOV.UK Notify avec support SMS (via passerelles Orange/MTN), WhatsApp Business API, '
    'email, et notifications in-app. Les citoyens doivent pouvoir choisir leur canal prefere '
    'et recevoir des alertes proactives a chaque changement de statut de leur demande. Le systeme '
    'doit supporter les modeles de messages standardises avec variables dynamiques (nom du citoyen, '
    'reference de demande, nom du service, date de retrait).', body_style))
story.append(Paragraph(
    '<b>4.2.3 Interface "Life Events" (Evenements de Vie)</b> : S\'inspirer du systeme Singapourien '
    'Moments of Life pour reorganiser les services non par categorie administrative mais par '
    'evenement de vie : "Naissance d\'un enfant", "Mariage", "Creation d\'entreprise", "Retraite". '
    'Par exemple, l\'evenement "Naissance" regrouperait automatiquement : declaration de naissance, '
    'extrait d\'acte, certificat de vaccination, carte d\'assurance maladie, et certificat de residence. '
    'Cette approche reduit considerablement la complexite percue par le citoyen.', body_style))

story.extend(subsection('4.3 Interoperabilite et Architecture'))
story.append(Paragraph(
    '<b>4.3.1 Infrastructure X-Road pour l\'echange de donnees</b> : Deployer X-Road, la '
    'solution open-source estonienne (licence MIT), comme couche d\'interoperabilite entre les '
    'systemes gouvernementaux guineens. X-Road permet a chaque administration de partager des '
    'donnees de maniere securisee, avec un controle d\'acces fin, un journal d\'audit complet, '
    'et un chiffrement de bout en bout. Pour la Guinee, les premiers ministeres a connecter '
    'seraient : l\'etat civil, l\'identification (ANIP), la justice, et la fiscalite. X-Road '
    'elimine le principe de la double saisie et permet au citoyen de fournir ses informations '
    'une seule fois.', body_style))
story.append(Paragraph(
    '<b>4.3.2 API Gateway gouvernementale</b> : Creer une API Gateway centralisee qui expose '
    'les services de chaque administration via des API REST standardisees. Cette gateway doit '
    'implementer : la limitation de debit (rate limiting), l\'authentification par cle API, '
    'la transformation de protocoles (SOAP vers REST), et le monitoring en temps reel. '
    'L\'architecture doit etre microservices-native pour permettre a chaque ministere de deployer '
    'ses services independamment, avec un registre de services (Service Mesh) pour la decouverte '
    'automatique et l\'equilibrage de charge.', body_style))
story.append(Paragraph(
    '<b>4.3.3 Base de donnees nationale des citoyens</b> : Implementer un registre national '
    'unifie des citoyens, connecte via X-Road, servant de source de verite pour l\'identite, '
    'l\'etat civil, et les coordonnees. Ce registre doit respecter le principe "once-only" : '
    'une information saisie une seule fois, partagee avec consentement. Le registre doit inclure '
    'une gestion des conflits (resolution de doublons), un historique des modifications, et un '
    'acces traçable par les administrations autorisees.', body_style))

story.extend(subsection('4.4 Paiement et Integration Financiere'))
story.append(Paragraph(
    '<b>4.4.1 Integration Orange Money et MTN Mobile Money</b> : La Guinee compte plus de '
    '12 millions d\'utilisateurs de mobile money, representant la principale methode de paiement '
    'electronique du pays. L\'integration de Orange Money et MTN Mobile Money comme methodes de '
    'paiement pour les frais administratifs est indispensable. Le modele kenyan eCitizen demontre '
    'que l\'integration mobile money est le facteur cle de succes : apres l\'integration M-Pesa, '
    'le volume de paiements en ligne a augmente de 800% en 2 ans. L\'implementation doit suivre '
    'les standards de securite PCI-DSS et supporter les paiements USSD pour les telephones basiques.', body_style))
story.append(Paragraph(
    '<b>4.4.2 Portail de paiement gouvernemental unifie</b> : Creer un portail de paiement '
    'centralise (inspire de GOV.UK Pay) qui unifie tous les canaux de paiement : mobile money, '
    'carte bancaire, virement bancaire, et paiement en especes via les points de service. Le '
    'portail doit generer des recus officiels avec QR code de verification, supporter les '
    'remboursements automatiques en cas de rejet de demande, et fournir un tableau de bord '
    'financier en temps reel pour chaque administration. Les revenus doivent etre automatiquement '
    'ventiles selon les codes budgetaires de chaque ministere.', body_style))

story.extend(subsection('4.5 Intelligence Artificielle'))
story.append(Paragraph(
    '<b>4.5.1 Chatbot citoyen multilingue</b> : Deployer un chatbot IA (inspire de Gov.sg) '
    'disponible en Francais, Soussou, Malinke, et Pular, les quatre langues principales de Guinee. '
    'Le chatbot doit guider les citoyens dans leurs demarches, verifier l\'eligibilite aux services, '
    'pre-remplir les formulaires, et fournir des estimations de delais. Les modeles de langage '
    'doivent etre fine-tunes sur le corpus juridique et administratif guineen pour des reponses '
    'precises et conformes.', body_style))
story.append(Paragraph(
    '<b>4.5.2 Traitement automatique des demandes</b> : Implementer un systeme de tri '
    'automatique par IA qui analyse les demandes entrantes, verifie la completude des documents, '
    'detecte les incoherences, et oriente les demandes vers le service competent. Le systeme '
    'doit pouvoir traiter automatiquement les demandes simples (etat civil, certificats) avec '
    'une verification humaine a posteriori, et orienter les demandes complexes vers les agents '
    'specialises. L\'objectif est de reduire le delai moyen de traitement de 48h a 2h pour '
    'les demandes simples.', body_style))
story.append(Paragraph(
    '<b>4.5.3 Detection de fraude documentaire</b> : Utiliser la vision par ordinateur '
    'pour detecter les documents falsifies ou alteres, comparer les photos d\'identite avec '
    'les bases de donnees biometriques, et identifier les demandes suspectes (doublons, '
    'identites multiples, documents contrefaits). Ce systeme doit fonctionner en arriere-plan '
    'et alerter les agents en cas de suspicion, sans bloquer automatiquement les demandes '
    'pour eviter les faux positifs.', body_style))

# ════════════════════════════════════════════════════════════════════
# 5. PLAN D'IMPLEMENTATION
# ════════════════════════════════════════════════════════════════════
story.extend(section('5. Plan d\'Implementation'))

story.extend(subsection('5.1 Phase 1 : Fondations (Mois 1-12)'))
story.append(Paragraph(
    'La premiere phase concentre les efforts sur la securisation du systeme existant et '
    'la mise en place des infrastructures de base. Priorite absolue : corriger les failles '
    'de securite identifiees, implementer l\'authentification JWT, et deployer le filtrage '
    'RLS correctement sur toutes les pages. En parallele, deployer le backend FastAPI avec '
    'base de donnees PostgreSQL, migrer les donnees du localStorage vers le serveur, et '
    'implementer les notifications SMS de base via les passerelles Orange et MTN.', body_style))
story.append(Paragraph(
    'Les livrables de la Phase 1 incluent : un systeme d\'authentification securise avec MFA, '
    'une base de donnees nationale centralisee pour les demandes citoyennes, un systeme de '
    'notification SMS fonctionnel, la conformite avec la Loi L/2016/018/AN sur la protection '
    'des donnees, et la correction de tous les bugs critiques de securite. Le budget estime '
    'est de 200 000 USD, principalement pour l\'infrastructure serveur et les licences SMS.', body_style))

story.extend(subsection('5.2 Phase 2 : Expansion (Mois 13-24)'))
story.append(Paragraph(
    'La deuxieme phase vise l\'expansion des services et l\'amelioration de l\'experience '
    'citoyenne. Deployer les 72 services supplementaires pour atteindre 100 services en ligne, '
    'integrer Orange Money et MTN Mobile Money pour les paiements, et lancer le portail USSD '
    'pour l\'acces par telephone basique. Implementer l\'approche "Life Events" pour reorganiser '
    'les services selon les evenements de vie des citoyens. Lancer le chatbot IA en Francais '
    'et langues nationales, et deployer les premiers centres de services communautaires dans '
    'les 5 communes de Conakry.', body_style))

story.extend(subsection('5.3 Phase 3 : Interoperabilite (Mois 25-36)'))
story.append(Paragraph(
    'La troisieme phase deploye l\'infrastructure X-Road pour l\'interoperabilite entre les '
    'ministeres et connecte les premiers systemes gouvernementaux : etat civil, identification '
    'ANIP, justice, fiscalite, et sante. Implementer le principe "once-only" pour les donnees '
    'citoyennes, lancer l\'API Gateway gouvernementale, et deployer le journal d\'audit des '
    'acces aux donnees personnelles. Etendre la couverture geographique aux 8 regions '
    'administratives et deployer des centres de services dans les 34 prefectures. Le budget '
    'estime de cette phase est de 500 000 USD pour l\'infrastructure X-Road et la connexion '
    'des systemes ministeriels existants.', body_style))

story.extend(subsection('5.4 Phase 4 : Intelligence (Mois 37-48)'))
story.append(Paragraph(
    'La quatrieme et derniere phase deploye les fonctionnalites avancees d\'intelligence '
    'artificielle : traitement automatique des demandes simples, detection de fraude '
    'documentaire, et systeme de recommandation proactif. Implementer les signatures '
    'numeriques legales avec la plateforme e-Signature, deployer la generation de documents '
    'officiels en PDF avec QR code de verification, et lancer la plateforme de donnees '
    'ouvertes (Open Data) pour la transparence gouvernementale. L\'objectif final est '
    'd\'atteindre 80% de taux de traitement numerique et un delai moyen de 48h maximum '
    'pour toutes les demandes citoyennes, comparable aux standards estoniens.', body_style))

story.append(Spacer(1, 12))
story.append(make_table(
    ['Phase', 'Periode', 'Budget Estime', 'Livrables Cles'],
    [
        ['Phase 1 : Fondations', 'Mois 1-12', '200 000 USD', 'Auth JWT + MFA, PostgreSQL, SMS, Conformite Loi L/2016/018'],
        ['Phase 2 : Expansion', 'Mois 13-24', '350 000 USD', '100 services, Mobile Money, USSD, Chatbot IA, Life Events'],
        ['Phase 3 : Interoperabilite', 'Mois 25-36', '500 000 USD', 'X-Road, Once-Only, API Gateway, 8 regions couvertes'],
        ['Phase 4 : Intelligence', 'Mois 37-48', '400 000 USD', 'IA traitement auto, anti-fraude, e-Signature, Open Data'],
    ],
    col_widths=[AVAILABLE_W*0.20, AVAILABLE_W*0.15, AVAILABLE_W*0.18, AVAILABLE_W*0.47]
))
story.append(Paragraph('Tableau 3 : Plan d\'implementation en 4 phases (48 mois)', caption_style))

# ════════════════════════════════════════════════════════════════════
# 6. COMPARAISON INTERNATIONALE
# ════════════════════════════════════════════════════════════════════
story.extend(section('6. Comparaison avec les Plateformes Internationales'))
story.append(Paragraph(
    'Le tableau ci-dessous positionne l\'eAdministration Suite Guinea par rapport aux '
    'plateformes GovTech de reference, en identifiant les ecarts et les domaines d\'amelioration '
    'prioritaires. La Guinee dispose d\'une base solide avec ses 28 services et son interface '
    'moderne, mais doit combler des lacunes significatives en matiere de securite, d\'interoperabilite, '
    'et d\'inclusion numerique pour atteindre le niveau des leaders mondiaux.', body_style))
story.append(Spacer(1, 8))
story.append(make_table(
    ['Critere', 'Guinee (Actuel)', 'Estonie', 'Rwanda', 'Singapour', 'Objectif Guinee 2028'],
    [
        ['Services en ligne', '28', '600+', '100+', '2 000+', '100+'],
        ['Identite numerique', 'Aucune', 'e-ID (99%)', 'NID', 'Singpass (97%)', 'NIN numerique'],
        ['Interoperabilite', 'Aucune', 'X-Road', 'Partielle', 'SG-Verify', 'X-Road Guinee'],
        ['Paiement en ligne', 'Aucun', 'e-Banking', 'Mobile Money', 'PayNow', 'Orange/MTN Money'],
        ['Acces USSD', 'Aucun', 'Non requis', 'Oui', 'Non requis', 'Oui (*123#)'],
        ['Notifications', 'In-app seul', 'Multi-canal', 'SMS + in-app', 'Push + SMS', 'Multi-canal'],
        ['IA / Chatbot', 'Basique', 'Avance', 'En developpement', 'Moments of Life', 'Chatbot multilingue'],
        ['Conformite RGPD', 'Aucune', 'Totale', 'Partielle', 'PDPA', 'Loi L/2016/018'],
        ['Couverture', '1 ville', 'Nationale', 'Nationale', 'Nationale', '8 regions'],
        ['Classement EGDI', 'Non classe', '2eme', 'Top 20 Afrique', '3eme', 'Top 10 Afrique'],
    ],
    col_widths=[AVAILABLE_W*0.16, AVAILABLE_W*0.13, AVAILABLE_W*0.14, AVAILABLE_W*0.15, AVAILABLE_W*0.17, AVAILABLE_W*0.25]
))
story.append(Paragraph('Tableau 4 : Benchmark international - Guinee vs leaders mondiaux', caption_style))

# ════════════════════════════════════════════════════════════════════
# 7. RECOMMANDATIONS STRATEGIQUES
# ════════════════════════════════════════════════════════════════════
story.extend(section('7. Recommandations Strategiques'))

story.extend(subsection('7.1 Gouvernance et Pilotage'))
story.append(Paragraph(
    'Creer une Agence Nationale du Numerique (ANN) dediee, inspiree de l\'e-Estonia Design Team, '
    'avec un budget propre, une equipe technique permanente, et un mandat clair de transformation '
    'numerique de l\'administration. L\'ANN doit etre rattachee directement a la Primature pour '
    'garantir l\'arbitrage politique necessaire. Mettre en place un Comite de Pilotage '
    'Interministeriel reunissant les secretaires generaux de chaque ministere, se reunissant '
    'mensuellement pour valider les priorites et resoudre les blocages institutionnels. '
    'Definir un Cadre National d\'Interoperabilite (CNIG) qui impose les standards techniques '
    'a respecter par chaque ministere pour la connexion a X-Road.', body_style))

story.extend(subsection('7.2 Formation et Capacitation'))
story.append(Paragraph(
    'Lancer un programme national de formation numerique pour les agents publics, avec un '
    'objectif de 5 000 agents formes en 3 ans. Le programme doit inclure : les competences '
    'numeriques de base, l\'utilisation de la plateforme eAdministration, la securite des '
    'donnees, et les procedures de traitement dematerialise. Creer une academie numerique '
    'gouvernementale (inspiree de la Government Digital Academy du Royaume-Uni) qui delivre '
    'des certifications reconnues et maintient un registre des agents qualifies. Former '
    '200 "champions numeriques" repartis dans les 34 prefectures pour servir de relais '
    'locaux et d\'agents multiplicateurs dans les centres de services communautaires.', body_style))

story.extend(subsection('7.3 Facteurs Cles de Succes'))
story.append(Paragraph(
    'L\'analyse des plateformes GovTech reussies dans le monde revele 10 facteurs cles de succes '
    'que la Guinee doit integrer dans sa strategie de deploiement :', body_style))

kpi_items = [
    '<b>Engagement politique au plus haut niveau</b> : Le soutien du President et du Premier Ministre est indispensable, comme l\'ont montre l\'Estonie et le Rwanda.',
    '<b>Approche progressive ("Start Small, Scale Fast")</b> : Lancer avec 20 services a fort impact, iterer rapidement, puis scaler. Ne pas chercher la perfection initiale.',
    '<b>Design centre citoyen</b> : Concevoir tous les services du point de vue du citoyen, pas de l\'administration. Tester avec de vrais usagers avant deploiement.',
    '<b>Infrastructure DPI (Digital Public Infrastructure)</b> : Construire les briques de base (Identite, Paiements, Echange de donnees) comme des infrastructures reutilisables.',
    '<b>Inclusion numerique</b> : Offrir des canaux alternatifs (USSD, centres physiques, agents communautaires) pour ne laisser personne de cote.',
    '<b>Securite et confiance</b> : La transparence sur l\'utilisation des donnees (journal d\'audit citoyen) construit la confiance, qui construit l\'adoption.',
    '<b>Interoperabilite obligatoire</b> : Imposer par decret l\'utilisation de X-Road pour tout nouveau systeme gouvernemental, afin d\'eviter les silos.',
    '<b>Open Source prioritaire</b> : Utiliser des solutions open-source (X-Road, GOV.UK Notify) pour reduire les couts et s\'affranchir du vendor lock-in.',
    '<b>Partenariats public-prive</b> : Collaborer avec Orange, MTN, et les fintech locales pour les paiements, les notifications, et les services a valeur ajoutee.',
    '<b>Mesure et amelioration continue</b> : Suivre les KPIs en temps reel, adapter les services selon les retours utilisateurs, et publier un rapport annuel de performance.',
]
for item in kpi_items:
    story.append(Paragraph('- ' + item, bullet_style))

# ════════════════════════════════════════════════════════════════════
# 8. CONCLUSION
# ════════════════════════════════════════════════════════════════════
story.extend(section('8. Conclusion'))
story.append(Paragraph(
    'L\'eAdministration Suite Guinea possede les fondements d\'une plateforme GovTech moderne : '
    'une interface utilisateur soignee aux couleurs nationales, un catalogue de 28 services '
    'publics couvrant les besoins essentiels, un systeme RBAC avec 6 roles et 65 permissions, '
    'et un workflow de traitement des demandes en 7 etats. Cependant, les defis identifies '
    'dans cette analyse - securite des donnees, filtrage RLS inoperant, absence de backend '
    'connecte, manque d\'inclusion numerique - necessitent une action corrective immediate '
    'et un plan d\'amelioration structure sur le long terme.', body_style))
story.append(Paragraph(
    'Les meilleures pratiques internationales demontrent que la reussite d\'une plateforme '
    'GovTech repose sur trois piliers : la securite et la confiance (modele estonien), '
    'l\'inclusion numerique (modele rwandais), et la simplification radicale de l\'experience '
    'citoyenne (modele GOV.UK). La Guinee a l\'opportunite de combiner ces trois approches '
    'en s\'appuyant sur sa base existante, pour batir une plateforme qui soit a la fois '
    'securisee, inclusive, et simple d\'utilisation. Le plan d\'implementation en 4 phases '
    'sur 48 mois, avec un budget total estime a 1,45 million USD, propose une trajectoire '
    'realiste et progressive vers cet objectif, avec des livrables concrets a chaque etape '
    'et des indicateurs de performance mesurables.', body_style))
story.append(Paragraph(
    'La transformation numerique de l\'administration guineenne n\'est pas seulement un '
    'projet technique : c\'est un projet de societe qui, s\'il est mene a bien, peut '
    'contribuer significativement a la modernisation de l\'Etat, a la reduction de la '
    'corruption par la tracabilite, a l\'amelioration de la satisfaction citoyenne, et '
    'au developpement economique du pays. Les modeles estonien, rwandais, et singapourien '
    'prouvent qu\'avec une vision claire, un engagement politique fort, et une execution '
    'rigoureuse, la transformation numerique est accessible meme aux pays en developpement. '
    'La Guinee a tous les atouts pour devenir un modele GovTech en Afrique de l\'Ouest.', body_style))

# ════════════════════════════════════════════════════════════════════
# BUILD
# ════════════════════════════════════════════════════════════════════
doc.multiBuild(story)
print(f"PDF generated: {OUTPUT_PATH}")
