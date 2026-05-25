#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Plan de Test - eAdministration Suite Guinea
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Fonts ──────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCRegular', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('WQYZenHei', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansReg', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBd', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSCRegular', bold='NotoSerifSC')
registerFontFamily('WQYZenHei', normal='WQYZenHei', bold='WQYZenHei')
registerFontFamily('DejaVuSans', normal='DejaVuSansReg', bold='DejaVuSansBd')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')

# ── Palette ────────────────────────────────────────────────────────────────
ACCENT       = colors.HexColor('#4d2fa9')
TEXT_PRIMARY  = colors.HexColor('#1c1d1f')
TEXT_MUTED    = colors.HexColor('#848990')
BG_SURFACE   = colors.HexColor('#dde1e6')
BG_PAGE      = colors.HexColor('#f0f2f3')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── Styles ─────────────────────────────────────────────────────────────────
BODY_FONT = 'WQYZenHei'
HEADING_FONT = 'NotoSerifSC'
EN_FONT = 'Tinos'

styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    'DocTitle', fontName=HEADING_FONT, fontSize=22, leading=30,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6
)
style_h1 = ParagraphStyle(
    'H1', fontName=HEADING_FONT, fontSize=16, leading=24,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10,
    wordWrap='CJK'
)
style_h2 = ParagraphStyle(
    'H2', fontName=HEADING_FONT, fontSize=13, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8,
    wordWrap='CJK'
)
style_h3 = ParagraphStyle(
    'H3', fontName=HEADING_FONT, fontSize=11.5, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6,
    wordWrap='CJK'
)
style_body = ParagraphStyle(
    'Body', fontName=BODY_FONT, fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    firstLineIndent=21, wordWrap='CJK', spaceAfter=4
)
style_body_no_indent = ParagraphStyle(
    'BodyNoIndent', fontName=BODY_FONT, fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    wordWrap='CJK', spaceAfter=4
)
style_bullet = ParagraphStyle(
    'Bullet', fontName=BODY_FONT, fontSize=10, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=24, bulletIndent=12, wordWrap='CJK', spaceAfter=2
)
style_sub_bullet = ParagraphStyle(
    'SubBullet', fontName=BODY_FONT, fontSize=9.5, leading=16,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=42, bulletIndent=30, wordWrap='CJK', spaceAfter=2
)
style_table_header = ParagraphStyle(
    'TableHeader', fontName=BODY_FONT, fontSize=9.5, leading=14,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK'
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName=BODY_FONT, fontSize=9, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
style_table_cell_center = ParagraphStyle(
    'TableCellCenter', fontName=BODY_FONT, fontSize=9, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK'
)
style_caption = ParagraphStyle(
    'Caption', fontName=BODY_FONT, fontSize=9, leading=14,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=6,
    wordWrap='CJK'
)
style_meta = ParagraphStyle(
    'Meta', fontName=BODY_FONT, fontSize=10, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER, wordWrap='CJK'
)
style_note = ParagraphStyle(
    'Note', fontName=BODY_FONT, fontSize=9.5, leading=16,
    textColor=TEXT_MUTED, alignment=TA_LEFT,
    leftIndent=12, borderPadding=6, wordWrap='CJK', spaceAfter=4
)
style_test_case = ParagraphStyle(
    'TestCase', fontName=BODY_FONT, fontSize=10, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=12, wordWrap='CJK', spaceAfter=3
)

# ── Helpers ────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_M = 1.8 * cm
RIGHT_M = 1.8 * cm
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with proper Paragraph wrapping."""
    n = len(headers)
    if col_ratios is None:
        col_ratios = [1.0/n] * n
    col_widths = [r * AVAIL_W for r in col_ratios]
    
    data = [[Paragraph(f'<b>{h}</b>', style_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) for c in row])
    
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def tc(num, title, steps, expected):
    """Format a test case."""
    elems = []
    elems.append(Paragraph(f'<b>TC-{num} : {title}</b>', style_test_case))
    for i, s in enumerate(steps, 1):
        elems.append(Paragraph(f'{i}. {s}', style_sub_bullet))
    elems.append(Paragraph(f'<b>Résultat attendu :</b> {expected}', style_sub_bullet))
    elems.append(Spacer(1, 6))
    return elems

def section(title, level=1):
    """Return a section heading."""
    if level == 1:
        return Paragraph(f'<b>{title}</b>', style_h1)
    elif level == 2:
        return Paragraph(f'<b>{title}</b>', style_h2)
    else:
        return Paragraph(f'<b>{title}</b>', style_h3)

# ── Build Document ─────────────────────────────────────────────────────────
OUTPUT = '/home/z/my-project/download/Plan_de_Test_eAdministration_Suite_Guinea.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=2*cm,
    bottomMargin=2*cm,
    title='Plan de Test - eAdministration Suite Guinea',
    author='Z.ai',
    creator='Z.ai',
)

story = []

# ═══════════════════════════════════════════════════════════════════════════
# COVER / TITLE PAGE
# ═══════════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 80))
story.append(Paragraph('<b>Plan de Test</b>', style_title))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>eAdministration Suite Guinea</b>', ParagraphStyle(
    'SubTitle', fontName=HEADING_FONT, fontSize=16, leading=24,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY
)))
story.append(Spacer(1, 6))
story.append(Paragraph('Plateforme GovTech SaaS de digitalisation de l\'administration publique guinéenne', style_meta))
story.append(Spacer(1, 30))

# Meta info table
meta_data = [
    [Paragraph('<b>Version</b>', style_table_cell_center), Paragraph('1.0', style_table_cell_center)],
    [Paragraph('<b>Date</b>', style_table_cell_center), Paragraph('12 mai 2026', style_table_cell_center)],
    [Paragraph('<b>Environnement</b>', style_table_cell_center), Paragraph('Demo / Pre-production', style_table_cell_center)],
    [Paragraph('<b>Application</b>', style_table_cell_center), Paragraph('eAdministration Suite Guinea', style_table_cell_center)],
    [Paragraph('<b>URL</b>', style_table_cell_center), Paragraph('https://preview-eadmin.space.chatglm.site/', style_table_cell_center)],
]
meta_t = Table(meta_data, colWidths=[AVAIL_W*0.3, AVAIL_W*0.7], hAlign='CENTER')
meta_t.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('BACKGROUND', (0, 0), (0, -1), BG_SURFACE),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(meta_t)

story.append(Spacer(1, 40))
story.append(Paragraph('Document confidentiel - Usage interne', ParagraphStyle(
    'Conf', fontName=BODY_FONT, fontSize=9, leading=14,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)))
# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# TABLE DES MATIERES MANUELLE
# ═══════════════════════════════════════════════════════════════════════════
story.append(Paragraph('<b>Table des Matières</b>', style_h1))
story.append(Spacer(1, 10))

toc_items = [
    ('1', 'Introduction et périmètre du test'),
    ('2', 'Comptes de test et rôles utilisateurs'),
    ('3', 'Tests d\'authentification'),
    ('4', 'Tests du rôle Citoyen'),
    ('5', 'Tests du rôle Agent de Mairie'),
    ('6', 'Tests du rôle Agent d\'Agence (ANIP)'),
    ('7', 'Tests du rôle Agent Ministériel'),
    ('8', 'Tests du rôle Administrateur Général'),
    ('9', 'Tests du rôle Super Administrateur'),
    ('10', 'Tests transversaux et inter-rôles'),
    ('11', 'Tests de la base de données des actes de naissance'),
    ('12', 'Tests de l\'Assistant IA et Chatbot'),
    ('13', 'Tests de la GED et archivage'),
    ('14', 'Tests des courriers et workflows'),
    ('15', 'Tests des analytics et audit'),
    ('16', 'Matrice de couverture des services publics'),
    ('17', 'Récapitulatif et checklist de validation'),
]

for num, title in toc_items:
    story.append(Paragraph(f'{num}.  {title}', ParagraphStyle(
        f'TOC_{num}', fontName=BODY_FONT, fontSize=11, leading=20,
        leftIndent=20, textColor=TEXT_PRIMARY, wordWrap='CJK'
    )))

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 1. INTRODUCTION
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('1. Introduction et périmètre du test'))
story.append(Paragraph(
    'Le présent document constitue le plan de test complet de la plateforme eAdministration Suite Guinea, '
    'une solution GovTech SaaS destinée à la digitalisation de l\'administration publique de la République de Guinée. '
    'Ce plan couvre l\'ensemble des fonctionnalités disponibles dans l\'environnement de démonstration, incluant '
    'les 22 services publics répartis en 8 catégories, les 6 rôles utilisateurs distincts, ainsi que les modules '
    'transversaux tels que l\'Assistant IA, la GED (Gestion Électronique de Documents), le système de courriers, '
    'les workflows de traitement des demandes citoyennes, et les outils d\'analytics et d\'audit. '
    'L\'objectif principal est de valider le bon fonctionnement de chaque parcours utilisateur dans des conditions '
    'réalistes, en simulant les interactions entre citoyens, agents administratifs et superviseurs.',
    style_body
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Chaque cas de test est structuré de manière à permettre une exécution méthodique : un identifiant unique, '
    'une description claire des étapes à suivre, et le résultat attendu pour valider la conformité du comportement. '
    'Les tests sont organisés par rôle utilisateur pour faciliter l\'exécution séquentielle, puis par module '
    'fonctionnel pour les tests transversaux. Ce plan est conçu pour être utilisé comme guide pratique lors '
    'des sessions de validation fonctionnelle, que ce soit par l\'équipe de développement, les chefs de projet, '
    'ou les représentants de l\'administration guinéenne.',
    style_body
))

story.append(Spacer(1, 8))
story.append(section('Périmètre de test', 2))
story.append(make_table(
    ['Domaine', 'Éléments couverts', 'Statut'],
    [
        ['Authentification', '6 comptes démo, connexion, déconnexion, gestion des erreurs', 'Inclus'],
        ['Services publics', '22 services en 8 catégories (État Civil, Justice, Identification, Urbanisme, Entreprise, Éducation, Santé, Résidence)', 'Inclus'],
        ['Portail Citoyen', 'Soumission de demandes, suivi, documents, profil', 'Inclus'],
        ['Mairie', 'Tableau de bord, traitement des demandes, vérification actes de naissance', 'Inclus'],
        ['Agence ANIP', 'Tableau de bord, pipeline CNI/Passeport, traitement des demandes', 'Inclus'],
        ['Ministère', 'GED, courriers, workflows, signatures', 'Inclus'],
        ['Administration', 'Gestion utilisateurs, configuration système, supervision', 'Inclus'],
        ['Super Admin', 'Accès complet, tous modules, tous rôles', 'Inclus'],
        ['Base État Civil', '25 actes de naissance, recherche, vérification d\'identité, statistiques', 'Inclus'],
        ['Assistant IA', 'Chatbot flottant, page Assistant IA, réponses contextuelles', 'Inclus'],
        ['GED & Archivage', 'Gestion documents, archivage, catégories, recherche', 'Inclus'],
        ['Analytics & Audit', 'Tableaux de bord, export PDF/CSV, logs d\'audit', 'Inclus'],
    ],
    [0.20, 0.60, 0.20]
))
story.append(Paragraph('Tableau 1 : Périmètre de couverture des tests', style_caption))

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 2. COMPTES DE TEST
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('2. Comptes de test et rôles utilisateurs'))
story.append(Paragraph(
    'La plateforme dispose de 6 comptes de démonstration préconfigurés, chacun associé à un rôle spécifique '
    'avec des permissions et un accès à des modules distincts. Ces comptes permettent de simuler l\'ensemble '
    'des parcours utilisateur de l\'écosystème administratif guinéen, depuis le citoyen qui soumet une demande '
    'jusqu\'au super administrateur qui supervise l\'intégralité du système. Le tableau ci-dessous récapitule '
    'les identifiants de connexion et les caractéristiques de chaque compte.',
    style_body
))
story.append(Spacer(1, 8))

story.append(make_table(
    ['Email', 'Mot de passe', 'Rôle', 'Institution', 'Page par défaut'],
    [
        ['citoyen@eadmin.gn', 'Eadmin2026!', 'Citoyen', 'Citoyen', 'Portail Citoyen'],
        ['mairie@eadmin.gn', 'Eadmin2026!', 'Agent de Mairie', 'Mairie de Kaloum', 'Tableau de bord Mairie'],
        ['admin@eadmin.gn', 'Eadmin2026!', 'Admin. Général', "Min. Administration Territoriale", 'Tableau de bord'],
        ['agence@eadmin.gn', 'Eadmin2026!', "Agent d'Agence", 'ANIP', 'Tableau de bord Agence'],
        ['ministere@eadmin.gn', 'Eadmin2026!', 'Agent Ministériel', 'Min. de la Justice', 'Tableau de bord'],
        ['superadmin@eadmin.gn', 'Eadmin2026!', 'Super Admin', 'Primature', 'Tableau de bord'],
    ],
    [0.22, 0.12, 0.14, 0.28, 0.24]
))
story.append(Paragraph('Tableau 2 : Comptes de démonstration', style_caption))

story.append(Spacer(1, 10))
story.append(section('Navigation par rôle', 2))
story.append(Paragraph(
    'Chaque rôle dispose d\'un menu latéral (sidebar) adapté à ses fonctions. Le tableau suivant détaille '
    'les modules accessibles pour chaque profil utilisateur. Cette différenciation est essentielle pour le '
    'contrôle d\'accès et la séparation des responsabilités au sein de l\'administration.',
    style_body
))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Rôle', 'Modules principaux', 'Modules admin', 'Modules spéciaux'],
    [
        ['Citoyen', 'Mon Portail, Mes demandes, Services publics, Assistant IA, Paramètres', '-', '-'],
        ['Mairie', 'Tableau de bord, Demandes, GED, Courriers, Assistant IA, Paramètres', '-', 'Base État Civil'],
        ['Agence ANIP', 'Tableau de bord, Demandes, GED, Assistant IA, Paramètres', '-', '-'],
        ['Ministère', 'Tableau de bord, GED, Courriers, Workflows, Signatures, Assistant IA, Paramètres', '-', 'Base État Civil'],
        ['Admin Général', 'Tableau de bord, Demandes, GED, Courriers, Workflows, Signatures, Analytics, Portail Citoyen, Assistant IA', 'Administration, Utilisateurs, Notifications, Audit, Paramètres', 'Base État Civil'],
        ['Super Admin', 'Tous les modules + Espace Mairie + Espace Agence', 'Tous les modules admin', 'Base État Civil'],
    ],
    [0.13, 0.35, 0.28, 0.24]
))
story.append(Paragraph('Tableau 3 : Accès aux modules par rôle', style_caption))

story.append(Spacer(1, 24))

# ═══════════════════════════════════════════════════════════════════════════
# 3. TESTS D'AUTHENTIFICATION
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('3. Tests d\'authentification'))
story.append(Paragraph(
    'Cette section couvre les scénarios de connexion et de déconnexion pour l\'ensemble des comptes, '
    'ainsi que les cas d\'erreur et les comportements attendus lors de la saisie d\'identifiants invalides. '
    'L\'authentification est la porte d\'entrée de la plateforme et doit fonctionner de manière fiable '
    'pour chaque rôle, avec des messages d\'erreur clairs et une redirection appropriée vers le tableau '
    'de bord correspondant au profil de l\'utilisateur connecté.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('AUTH-01', 'Connexion Citoyen', [
        'Accéder à la page d\'accueil de la plateforme',
        'Cliquer sur le bouton "Connexion" dans la barre de navigation',
        'Saisir l\'email citoyen@eadmin.gn et le mot de passe Eadmin2026!',
        'Cliquer sur "Se connecter"',
    ], 'L\'utilisateur est connecté avec le rôle Citoyen. Redirection vers le Portail Citoyen. Le sidebar affiche les modules du citoyen.'),
    
    tc('AUTH-02', 'Connexion Agent de Mairie', [
        'Se déconnecter si connecté',
        'Saisir mairie@eadmin.gn / Eadmin2026!',
        'Se connecter',
    ], 'Connexion réussie avec le rôle Agent de Mairie. Redirection vers le Tableau de bord Mairie. Le nom "Mme Fatoumata Bah" s\'affiche dans le sidebar.'),
    
    tc('AUTH-03', 'Connexion Administrateur Général', [
        'Se déconnecter si connecté',
        'Saisir admin@eadmin.gn / Eadmin2026!',
        'Se connecter',
    ], 'Connexion réussie. Redirection vers le Tableau de bord Admin. Accès complet aux modules d\'administration.'),
    
    tc('AUTH-04', 'Connexion Agent d\'Agence (ANIP)', [
        'Se déconnecter si connecté',
        'Saisir agence@eadmin.gn / Eadmin2026!',
        'Se connecter',
    ], 'Connexion réussie avec le rôle Agent d\'Agence. Redirection vers le Tableau de bord Agence ANIP.'),
    
    tc('AUTH-05', 'Connexion Agent Ministériel', [
        'Se déconnecter si connecté',
        'Saisir ministere@eadmin.gn / Eadmin2026!',
        'Se connecter',
    ], 'Connexion réussie avec le rôle Agent Ministériel. Accès aux modules GED, Courriers, Workflows, Signatures.'),
    
    tc('AUTH-06', 'Connexion Super Administrateur', [
        'Se déconnecter si connecté',
        'Saisir superadmin@eadmin.gn / Eadmin2026!',
        'Se connecter',
    ], 'Connexion réussie avec le rôle Super Admin. Accès complet à tous les modules y compris Espace Mairie et Espace Agence.'),
    
    tc('AUTH-07', 'Échec de connexion - email invalide', [
        'Saisir un email non reconnu (ex: test@invalid.com)',
        'Saisir n\'importe quel mot de passe',
        'Tenter la connexion',
    ], 'Message d\'erreur "Email non reconnu" affiché. Pas de connexion. Le formulaire reste affiché.'),
    
    tc('AUTH-08', 'Échec de connexion - mot de passe incorrect', [
        'Saisir citoyen@eadmin.gn avec un mauvais mot de passe (ex: wrong123)',
        'Tenter la connexion',
    ], 'Message d\'erreur "Mot de passe incorrect" affiché. Pas de connexion.'),
    
    tc('AUTH-09', 'Déconnexion', [
        'Se connecter avec n\'importe quel compte',
        'Cliquer sur le bouton de déconnexion dans le sidebar ou le menu utilisateur',
        'Confirmer la déconnexion',
    ], 'L\'utilisateur est déconnecté. Redirection vers la page d\'accueil publique. Le sidebar disparaît.'),
    
    tc('AUTH-10', 'Persistance du thème', [
        'Se connecter avec n\'importe quel compte',
        'Basculer en mode sombre via Paramètres',
        'Se déconnecter puis se reconnecter',
    ], 'Le thème sombre est conservé après reconnexion grâce à la persistance Zustand.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 4. TESTS DU ROLE CITOYEN
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('4. Tests du rôle Citoyen'))
story.append(Paragraph(
    'Le rôle Citoyen représente l\'utilisateur final de la plateforme, c\'est-à-dire le citoyen guinéen '
    'qui soumet des demandes de documents administratifs, suit l\'avancement de ses requêtes, et interagit '
    'avec l\'administration par le biais du portail numérique. Ce rôle est le plus utilisé dans le cadre '
    'du service public et constitue le point d\'entrée principal de la relation citoyen-administration. '
    'Les tests ci-dessous couvrent l\'ensemble des fonctionnalités accessibles depuis le portail citoyen, '
    'depuis la consultation des services publics jusqu\'au suivi des demandes en temps réel.',
    style_body
))
story.append(Spacer(1, 6))

story.append(section('4.1 Navigation et affichage du portail', 2))
for items in [
    tc('CIT-01', 'Accès au Portail Citoyen après connexion', [
        'Se connecter avec citoyen@eadmin.gn / Eadmin2026!',
        'Vérifier la page affichée par défaut',
    ], 'Le Portail Citoyen s\'affiche avec les sections : Services publics, Mes demandes, Mon profil.'),
    
    tc('CIT-02', 'Affichage des catégories de services', [
        'Sur le Portail Citoyen, vérifier la section "Services publics"',
        'Compter le nombre de catégories affichées',
    ], 'Les 8 catégories sont affichées : État Civil, Justice & Légal, Identification, Urbanisme, Entreprise & Commerce, Éducation, Santé, Résidence & Citoyenneté.'),
    
    tc('CIT-03', 'Filtrage des services par catégorie', [
        'Cliquer sur la catégorie "État Civil"',
        'Vérifier les services affichés',
        'Revenir à "Toutes les catégories"',
    ], 'Seuls les services de la catégorie État Civil sont affichés (5 services). Le retour à "Toutes" réaffiche l\'ensemble.'),
    
    tc('CIT-04', 'Recherche de service', [
        'Utiliser la barre de recherche dans la section services',
        'Taper "passeport"',
        'Vérifier les résultats',
    ], 'Le service "Passeport biométrique" apparaît dans les résultats de recherche.'),
    
    tc('CIT-05', 'Consultation des détails d\'un service', [
        'Cliquer sur un service (ex: "Extrait d\'acte de naissance")',
        'Vérifier les informations affichées',
    ], 'Les détails du service s\'affichent : description, coût (Gratuit), délai (48h), documents requis, bouton "Demander".'),
]:
    story.extend(items)

story.append(section('4.2 Soumission et suivi des demandes', 2))
for items in [
    tc('CIT-06', 'Soumission d\'une demande - Extrait d\'acte de naissance', [
        'Depuis le Portail Citoyen, cliquer sur "Demander" pour l\'Extrait d\'acte de naissance',
        'Remplir le formulaire : motif "Dossier d\'emploi", mode de livraison "Guichet"',
        'Soumettre la demande',
    ], 'La demande est créée avec succès. Un numéro de référence GN-2026-XXXXXX est généré. La demande apparaît dans "Mes demandes" avec le statut "Soumise".'),
    
    tc('CIT-07', 'Soumission d\'une demande - Certificat de nationalité', [
        'Demander un Certificat de nationalité (catégorie État Civil)',
        'Remplir le motif et les informations',
        'Soumettre',
    ], 'Demande créée avec le statut "Soumise". Le service compétent affiché est "Mairie / Commune".'),
    
    tc('CIT-08', 'Soumission d\'une demande - Passeport biométrique', [
        'Demander un Passeport biométrique (catégorie Identification)',
        'Remplir le formulaire complet',
        'Soumettre',
    ], 'Demande créée. Le coût affiché est 150 000 GNF. Le service compétent est "ANIP".'),
    
    tc('CIT-09', 'Suivi d\'une demande existante', [
        'Aller dans "Mes demandes"',
        'Cliquer sur une demande existante (ex: GN-2026-100234)',
        'Vérifier la timeline et les notes de traitement',
    ], 'Les détails de la demande s\'affichent : statut, timeline avec étapes, notes de l\'agent traitant, documents fournis.'),
    
    tc('CIT-10', 'Consultation du profil citoyen', [
        'Accéder à la section profil ou paramètres',
        'Vérifier les informations personnelles',
    ], 'Les informations du citoyen sont affichées : Aminata Diallo, NIN-2019-458723, téléphone, email, adresse.'),
]:
    story.extend(items)

story.append(section('4.3 Services publics - Couverture par catégorie', 2))
story.append(Paragraph(
    'Le tableau suivant répertorie les tests à effectuer pour chaque service public. Pour chaque service, '
    'le testeur doit vérifier que la demande peut être soumise, que le coût et le délai sont correctement '
    'affichés, et que le service compétent est correctement assigné automatiquement.',
    style_body
))
story.append(Spacer(1, 6))

service_tests = [
    ['ec-1', 'Extrait d\'acte de naissance', 'Gratuit', '48h', 'Mairie / Commune'],
    ['ec-2', 'Extrait d\'acte de mariage', 'Gratuit', '48h', 'Mairie / Commune'],
    ['ec-3', 'Extrait d\'acte de décès', 'Gratuit', '48h', 'Mairie / Commune'],
    ['ec-4', 'Certificat de nationalité', '5 000 GNF', '5 jours', 'Mairie / Commune'],
    ['ec-5', 'Déclaration de naissance', 'Gratuit', '24h', 'Mairie / Commune'],
    ['j-1', 'Casier judiciaire', '5 000 GNF', '5 jours', 'Min. de la Justice'],
    ['j-2', 'Certificat de non-poursuite', '3 000 GNF', '3 jours', 'Min. de la Justice'],
    ['j-3', 'Légalisation de documents', '2 000 GNF', '24h', 'Min. de la Justice'],
    ['id-1', 'CNI biométrique', 'Gratuit', '7 jours', 'ANIP'],
    ['id-2', 'Passeport biométrique', '150 000 GNF', '10 jours', 'ANIP'],
    ['id-3', 'Permis de conduire', '25 000 GNF', '10 jours', 'ANIP'],
    ['u-1', 'Permis de construire', '50 000 GNF', '15 jours', 'Dir. Urbanisme'],
    ['e-1', 'Enregistrement entreprise', '50 000 GNF', '3 jours', 'APIP'],
    ['e-2', 'Registre de commerce', '100 000 GNF', '7 jours', 'APIP'],
    ['ed-1', 'Attestation de scolarité', 'Gratuit', '48h', 'Min. Éducation'],
    ['ed-2', 'Diplôme et relevé de notes', '10 000 GNF', '5 jours', 'Min. Éducation'],
    ['s-1', 'Certificat de vaccination', 'Gratuit', '24h', 'Min. Santé'],
    ['s-2', 'Carte sanitaire', '2 000 GNF', '5 jours', 'Min. Santé'],
    ['r-1', 'Certificat de résidence', 'Gratuit', '24h', 'Mairie / Commune'],
    ['r-2', 'Attestation de domicile', '1 000 GNF', '24h', 'Mairie / Commune'],
]

story.append(make_table(
    ['ID Service', 'Nom du service', 'Coût', 'Délai', 'Service assigné'],
    service_tests,
    [0.10, 0.32, 0.16, 0.14, 0.28]
))
story.append(Paragraph('Tableau 4 : Liste des services publics à tester', style_caption))

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 5. TESTS DU ROLE MAIRIE
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('5. Tests du rôle Agent de Mairie'))
story.append(Paragraph(
    'L\'Agent de Mairie est responsable du traitement des demandes relevant de l\'état civil et de la '
    'résidence, ainsi que de la vérification des actes de naissance dans la base de données. Ce rôle '
    'dispose d\'un tableau de bord spécifique avec des statistiques en temps réel sur les demandes à traiter, '
    'les demandes en cours, et les documents produits. Les tests ci-dessous vérifient l\'ensemble du '
    'pipeline de traitement d\'une demande citoyenne, depuis la prise en charge jusqu\'à la livraison '
    'du document final, en passant par la vérification des pièces justificatives et l\'ajout de notes de traitement.',
    style_body
))
story.append(Spacer(1, 6))

story.append(section('5.1 Tableau de bord Mairie', 2))
for items in [
    tc('MAI-01', 'Accès au tableau de bord Mairie', [
        'Se connecter avec mairie@eadmin.gn / Eadmin2026!',
        'Vérifier l\'affichage du tableau de bord',
    ], 'Le tableau de bord Mairie s\'affiche avec les KPIs : demandes reçues, en cours, traitées, rejetées. Les graphiques et statistiques sont visibles.'),
    
    tc('MAI-02', 'Vérification des statistiques du dashboard', [
        'Vérifier les compteurs de demandes par statut',
        'Comparer avec les demandes réelles dans la liste',
    ], 'Les compteurs correspondent au nombre de demandes dans chaque statut (soumises, en cours, validées, prêtes, livrées, rejetées).'),
    
    tc('MAI-03', 'Consultation des demandes récentes', [
        'Dans le tableau de bord, cliquer sur la section "Demandes récentes"',
        'Vérifier la liste des demandes',
    ], 'Les demandes citoyennes sont listées avec référence, nom, service demandé, statut, et date de soumission.'),
]:
    story.extend(items)

story.append(section('5.2 Traitement des demandes citoyennes', 2))
for items in [
    tc('MAI-04', 'Prise en charge d\'une demande soumise', [
        'Accéder à la liste des demandes citoyennes',
        'Sélectionner une demande au statut "Soumise"',
        'Cliquer sur "Prendre en charge" ou changer le statut vers "En cours"',
    ], 'Le statut de la demande passe à "En cours". L\'agent est assigné à la demande. La timeline est mise à jour.'),
    
    tc('MAI-05', 'Ajout d\'une note de traitement', [
        'Ouvrir une demande en cours',
        'Ajouter une note : "Vérification des pièces en cours"',
        'Sauvegarder',
    ], 'La note apparaît dans l\'historique de traitement avec la date, l\'auteur (Mme Fatoumata Bah), et le type "Note".'),
    
    tc('MAI-06', 'Demande de pièces complémentaires', [
        'Ouvrir une demande en cours',
        'Changer le statut vers "Pièces complémentaires"',
        'Ajouter une note : "Certificat de résidence manquant"',
    ], 'Le statut passe à "Pièces complémentaires". Le citoyen peut voir cette information dans son portail.'),
    
    tc('MAI-07', 'Validation d\'une demande', [
        'Ouvrir une demande en cours avec toutes les pièces',
        'Changer le statut vers "Validée"',
        'Ajouter une note de validation',
    ], 'Le statut passe à "Validée". La timeline avance à l\'étape "Validation par le responsable".'),
    
    tc('MAI-08', 'Marquage d\'un document comme prêt', [
        'Ouvrir une demande validée',
        'Changer le statut vers "Prêt"',
        'Indiquer le lieu de retrait',
    ], 'Le statut passe à "Prêt". Le citoyen est notifié que son document est disponible pour le retrait.'),
    
    tc('MAI-09', 'Livraison d\'un document', [
        'Ouvrir une demande prête',
        'Changer le statut vers "Livré"',
        'Sélectionner le mode de livraison',
    ], 'Le statut passe à "Livré". Toutes les étapes de la timeline sont marquées comme complétées. La date de complétion est enregistrée.'),
    
    tc('MAI-10', 'Rejet d\'une demande', [
        'Ouvrir une demande soumise ou en cours',
        'Changer le statut vers "Rejetée"',
        'Ajouter un motif de rejet',
    ], 'Le statut passe à "Rejetée". Le motif est visible par le citoyen. La timeline s\'arrête.'),
]:
    story.extend(items)

story.append(section('5.3 Base de données des actes de naissance', 2))
for items in [
    tc('MAI-11', 'Accès à la base des actes de naissance', [
        'Depuis le sidebar, cliquer sur "Base État Civil"',
        'Vérifier l\'affichage de la page',
    ], 'La base de données des actes de naissance s\'affiche avec la liste des 25 enregistrements et les statistiques.'),
    
    tc('MAI-12', 'Recherche d\'un acte par nom', [
        'Dans la barre de recherche, saisir "Diallo"',
        'Lancer la recherche',
    ], 'Les actes correspondant au nom "Diallo" s\'affichent : Aminata Diallo (bc-001), Lamine Diallo (bc-012), Hadja Diallo (bc-020).'),
    
    tc('MAI-13', 'Recherche par numéro d\'acte', [
        'Saisir le numéro AN/KAL/1995/0001',
        'Lancer la recherche',
    ], 'L\'acte correspondant à Aminata Diallo s\'affiche avec toutes les informations détaillées.'),
    
    tc('MAI-14', 'Vérification d\'identité', [
        'Utiliser la fonction de vérification d\'identité',
        'Saisir le nom "Aminata Diallo" et la date de naissance "15/03/1995"',
        'Lancer la vérification',
    ], 'Le système confirme l\'identité avec les détails de l\'acte de naissance. Le compteur de vérifications est incrémenté.'),
    
    tc('MAI-15', 'Consultation des statistiques', [
        'Accéder à la section statistiques de la base',
        'Vérifier les chiffres affichés',
    ], 'Les statistiques affichent : 22 actifs, 1 annulé, 2 corrigés, 25 total. Répartition par commune et par région est visible.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 6. TESTS DU ROLE AGENCE
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('6. Tests du rôle Agent d\'Agence (ANIP)'))
story.append(Paragraph(
    'L\'Agent d\'Agence ANIP (Agence Nationale d\'Identification) est responsable du traitement des demandes '
    'de documents d\'identification : Carte Nationale d\'Identité biométrique, Passeport biométrique, et '
    'Permis de conduire. Ce rôle dispose d\'un tableau de bord dédié avec un pipeline de traitement spécifique '
    'pour les documents d\'identification, incluant la collecte des données biométriques et la production '
    'des documents sécurisés. Les tests ci-dessous vérifient le fonctionnement complet de ce pipeline, '
    'de la réception de la demande jusqu\'à la remise du document au citoyen.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('AG-01', 'Accès au tableau de bord ANIP', [
        'Se connecter avec agence@eadmin.gn / Eadmin2026!',
        'Vérifier l\'affichage du tableau de bord',
    ], 'Le tableau de bord Agence s\'affiche avec les KPIs spécifiques ANIP : CNI en production, Passeports en attente, Permis délivrés.'),
    
    tc('AG-02', 'Pipeline CNI - Traitement complet', [
        'Sélectionner une demande de CNI biométrique',
        'Prendre en charge la demande',
        'Avancer dans le pipeline : vérification → collecte biométrie → production → validation',
    ], 'Chaque étape du pipeline est franchie. La timeline est mise à jour. Les notes de traitement sont enregistrées à chaque étape.'),
    
    tc('AG-03', 'Pipeline Passeport - Traitement complet', [
        'Sélectionner une demande de Passeport biométrique',
        'Traiter la demande jusqu\'à la livraison',
    ], 'Le passeport est produit et livré. Le statut final est "Livré". Le coût de 150 000 GNF est affiché.'),
    
    tc('AG-04', 'Traitement d\'une demande de permis de conduire', [
        'Chercher une demande de permis de conduire',
        'Prendre en charge et traiter',
    ], 'La demande de permis de conduire est traitée. Le coût de 25 000 GNF est affiché. Le délai de 10 jours est indiqué.'),
    
    tc('AG-05', 'Vérification des demandes de la catégorie Identification', [
        'Filtrer les demandes par catégorie "Identification"',
        'Vérifier la liste',
    ], 'Seules les demandes de CNI, Passeport et Permis de conduire sont affichées.'),
    
    tc('AG-06', 'Accès GED depuis l\'espace Agence', [
        'Naviguer vers la GED depuis le sidebar',
        'Vérifier les documents disponibles',
    ], 'La GED est accessible. Les documents d\'identification archivés sont visibles.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 7. TESTS DU ROLE MINISTERE
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('7. Tests du rôle Agent Ministériel'))
story.append(Paragraph(
    'L\'Agent Ministériel représente les cadres des ministères qui utilisent la plateforme pour la gestion '
    'des documents (GED), le suivi des courriers, l\'animation des workflows de validation, et la signature '
    'électronique des documents. Ce rôle a un accès orienté vers les processus documentaires internes '
    'des ministères, avec une attention particulière portée à la traçabilité et à la conformité des échanges. '
    'Les tests de cette section vérifient le bon fonctionnement de chacun de ces modules dans le contexte '
    'd\'un ministère guinéen.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('MIN-01', 'Connexion et tableau de bord Ministériel', [
        'Se connecter avec ministere@eadmin.gn / Eadmin2026!',
        'Vérifier le tableau de bord',
    ], 'Le tableau de bord Ministériel s\'affiche avec les statistiques de GED, courriers et workflows.'),
    
    tc('MIN-02', 'Accès et navigation dans la GED', [
        'Naviguer vers la GED',
        'Parcourir les catégories de documents',
        'Ouvrir un document',
    ], 'La GED affiche les documents classés par catégorie. L\'ouverture d\'un document montre les détails et les actions disponibles (télécharger, archiver, etc.).'),
    
    tc('MIN-03', 'Gestion des courriers', [
        'Naviguer vers le module Courriers',
        'Vérifier la liste des courriers entrants',
        'Ouvrir un courrier et effectuer une action',
    ], 'Les courriers sont listés avec expéditeur, objet, date, statut. Les actions (marquer lu, transférer, archiver) fonctionnent.'),
    
    tc('MIN-04', 'Workflows de validation', [
        'Naviguer vers le module Workflows',
        'Vérifier les workflows en cours',
        'Approuver ou rejeter une étape de workflow',
    ], 'Les workflows actifs sont listés. L\'approbation avance le workflow à l\'étape suivante. Le rejet notifie l\'initiateur.'),
    
    tc('MIN-05', 'Signatures électroniques', [
        'Naviguer vers le module Signatures',
        'Vérifier les documents en attente de signature',
        'Signer un document',
    ], 'La liste des documents à signer est affichée. La signature est enregistrée avec date et identité du signataire.'),
    
    tc('MIN-06', 'Accès à la Base État Civil', [
        'Depuis le sidebar, accéder à la Base État Civil',
        'Effectuer une recherche d\'acte',
    ], 'L\'agent ministériel peut accéder à la base et effectuer des recherches/vérifications d\'actes de naissance.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 8. TESTS DU ROLE ADMINISTRATEUR GENERAL
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('8. Tests du rôle Administrateur Général'))
story.append(Paragraph(
    'L\'Administrateur Général dispose d\'un accès étendu à la plateforme, incluant les modules de gestion '
    'des utilisateurs, la configuration du système, la supervision des demandes citoyennes, les analytics, '
    'et les logs d\'audit. Ce rôle est conçu pour les cadres supérieurs de l\'administration qui supervisent '
    'l\'ensemble du processus de digitalisation. Les tests de cette section vérifient l\'accès et le '
    'fonctionnement de chaque module d\'administration, ainsi que la cohérence des données affichées.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('ADM-01', 'Tableau de bord Administrateur', [
        'Se connecter avec admin@eadmin.gn / Eadmin2026!',
        'Vérifier le tableau de bord principal',
    ], 'Le dashboard affiche les KPIs globaux : demandes totales, taux de traitement, performance par service, graphiques mensuels.'),
    
    tc('ADM-02', 'Gestion des utilisateurs', [
        'Naviguer vers Administration > Utilisateurs',
        'Vérifier la liste des utilisateurs',
        'Tenter d\'ajouter ou modifier un utilisateur',
    ], 'La liste des 6 comptes démo est affichée. Les actions CRUD sur les utilisateurs fonctionnent (ajout, modification, désactivation).'),
    
    tc('ADM-03', 'Supervision des demandes citoyennes', [
        'Naviguer vers "Demandes citoyennes"',
        'Filtrer par statut, catégorie, date',
        'Ouvrir une demande en détail',
    ], 'Les filtres fonctionnent. La vue détaillée montre toutes les informations de la demande et les notes de traitement.'),
    
    tc('ADM-04', 'Module Analytics', [
        'Naviguer vers Analytics',
        'Vérifier les graphiques et statistiques',
        'Tester l\'export PDF',
        'Tester l\'export CSV',
    ], 'Les graphiques de performance s\'affichent. L\'export PDF génère un fichier téléchargeable. L\'export CSV génère un fichier de données brut.'),
    
    tc('ADM-05', 'Logs d\'audit', [
        'Naviguer vers Audit Logs',
        'Vérifier la liste des événements',
        'Filtrer par type d\'action ou date',
        'Tester l\'export CSV des logs',
    ], 'Les événements d\'audit sont listés avec horodatage, utilisateur, action, détails. Le filtrage fonctionne. L\'export CSV est fonctionnel.'),
    
    tc('ADM-06', 'Notifications', [
        'Naviguer vers Notifications',
        'Vérifier les notifications affichées',
        'Marquer une notification comme lue',
    ], 'Les notifications sont listées. Le marquage "lu" fonctionne. Le compteur de notifications non lues se met à jour.'),
    
    tc('ADM-07', 'Configuration système', [
        'Naviguer vers Paramètres',
        'Vérifier les options disponibles (thème, intégrations, logo)',
        'Changer le thème sombre/clair',
    ], 'Les paramètres sont accessibles et modifiables. Le basculement de thème fonctionne immédiatement.'),
    
    tc('ADM-08', 'Accès Portail Citoyen (vue admin)', [
        'Naviguer vers "Portail Citoyen"',
        'Vérifier la vue administrateur du portail',
    ], 'L\'administrateur peut voir le portail citoyen avec des options supplémentaires de supervision et de gestion.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 9. TESTS DU ROLE SUPER ADMIN
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('9. Tests du rôle Super Administrateur'))
story.append(Paragraph(
    'Le Super Administrateur dispose d\'un accès complet et illimité à l\'ensemble des modules de la plateforme, '
    'y compris les espaces dédiés aux autres rôles (Espace Mairie, Espace Agence). Ce rôle est réservé '
    'aux responsables de la Primature et du gouvernement qui doivent avoir une vue globale sur le système. '
    'Les tests de cette section vérifient que le super administrateur peut accéder à toutes les fonctionnalités '
    'sans restriction et que les modules spécifiques aux autres rôles sont bien accessibles depuis son interface.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('SA-01', 'Connexion Super Admin', [
        'Se connecter avec superadmin@eadmin.gn / Eadmin2026!',
        'Vérifier l\'accès au tableau de bord',
    ], 'Connexion réussie. Le nom "Amadou Oury Bah" et le rôle "Super Administrateur" s\'affichent.'),
    
    tc('SA-02', 'Accès à l\'Espace Mairie', [
        'Depuis le sidebar, naviguer vers "Espace Mairie"',
        'Vérifier l\'accès au tableau de bord Mairie',
    ], 'Le super admin accède au tableau de bord Mairie avec les mêmes fonctionnalités qu\'un agent de mairie.'),
    
    tc('SA-03', 'Accès à l\'Espace Agence', [
        'Depuis le sidebar, naviguer vers "Espace Agence"',
        'Vérifier l\'accès au tableau de bord ANIP',
    ], 'Le super admin accède au tableau de bord ANIP avec les mêmes fonctionnalités qu\'un agent d\'agence.'),
    
    tc('SA-04', 'Accès à tous les modules d\'administration', [
        'Naviguer vers Administration, Utilisateurs, Audit Logs, Analytics',
        'Vérifier l\'accès à chaque module',
    ], 'Tous les modules d\'administration sont accessibles sans restriction.'),
    
    tc('SA-05', 'Accès à la Base État Civil', [
        'Naviguer vers la Base État Civil',
        'Effectuer une recherche et une vérification',
    ], 'Accès complet à la base de données des actes de naissance avec toutes les fonctions de recherche et vérification.'),
    
    tc('SA-06', 'Modification des paramètres système', [
        'Accéder aux Paramètres',
        'Modifier le thème et vérifier les intégrations',
    ], 'Les paramètres sont modifiables. Les changements sont persistés dans le store Zustand.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 10. TESTS TRANSVERSAUX
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('10. Tests transversaux et inter-rôles'))
story.append(Paragraph(
    'Les tests transversaux vérifient les workflows qui impliquent plusieurs rôles utilisateur de manière '
    'séquentielle. Dans la réalité administrative guinéenne, une demande citoyenne passe par plusieurs '
    'intervenants : le citoyen qui soumet, l\'agent qui traite, le superviseur qui valide, et parfois '
    'le ministère qui authentifie. Ces tests simulent des parcours complets de bout en bout pour vérifier '
    'la cohérence du système et la continuité du service public numérique.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('CROSS-01', 'Parcours complet : Citoyen → Mairie → Livraison', [
        'ETAPE 1 : Se connecter comme Citoyen, soumettre une demande d\'extrait d\'acte de naissance',
        'ETAPE 2 : Noter le numéro de référence GN-2026-XXXXXX',
        'ETAPE 3 : Se déconnecter, se reconnecter comme Agent de Mairie',
        'ETAPE 4 : Trouver la demande, la prendre en charge, ajouter des notes',
        'ETAPE 5 : Changer le statut à Validée puis Prêt',
        'ETAPE 6 : Se déconnecter, se reconnecter comme Citoyen',
        'ETAPE 7 : Vérifier que la demande est visible avec le statut "Prêt"',
        'ETAPE 8 : Reconnecter comme Mairie, livrer le document',
    ], 'Le parcours complet fonctionne sans erreur. Chaque changement de statut est visible par le citoyen. La timeline est cohérente.'),
    
    tc('CROSS-02', 'Parcours complet : Citoyen → ANIP → CNI livrée', [
        'ETAPE 1 : Citoyen soumet une demande de CNI biométrique',
        'ETAPE 2 : Agent ANIP prend en charge, vérifie les pièces',
        'ETAPE 3 : Agent ANIP valide et produit la CNI',
        'ETAPE 4 : CNI livrée au guichet',
        'ETAPE 5 : Citoyen vérifie le statut "Livré" dans son portail',
    ], 'Le parcours CNI complet fonctionne. Le coût est 0 GNF (gratuit). Le délai affiché est 7 jours.'),
    
    tc('CROSS-03', 'Parcours avec pièces complémentaires', [
        'ETAPE 1 : Citoyen soumet une demande incomplète (Certificat de nationalité)',
        'ETAPE 2 : Agent de Mairie marque "Pièces complémentaires requises"',
        'ETAPE 3 : Citoyen consulte la demande et voit la demande de pièces',
        'ETAPE 4 : Agent met à jour après réception des pièces',
    ], 'Le processus de pièces complémentaires fonctionne. Le citoyen est informé des pièces manquantes via les notes.'),
    
    tc('CROSS-04', 'Parcours avec rejet', [
        'ETAPE 1 : Citoyen soumet une demande (ex: Attestation de scolarité)',
        'ETAPE 2 : Agent vérifie et rejette la demande avec motif',
        'ETAPE 3 : Citoyen voit le rejet et le motif dans son portail',
    ], 'Le rejet est correctement traité. Le motif est visible par le citoyen. La demande apparaît en statut "Rejetée".'),
    
    tc('CROSS-05', 'Parcours Passeport : Citoyen → ANIP → Livré', [
        'ETAPE 1 : Citoyen demande un Passeport biométrique',
        'ETAPE 2 : Agent ANIP traite la demande complète',
        'ETAPE 3 : Passeport livré au guichet ANIP',
    ], 'Le coût de 150 000 GNF est affiché à chaque étape. Le délai de 10 jours est indiqué. Le parcours se termine avec le statut "Livré".'),
    
    tc('CROSS-06', 'Supervision par l\'Administrateur', [
        'ETAPE 1 : Citoyen soumet une demande',
        'ETAPE 2 : Mairie traite la demande',
        'ETAPE 3 : Admin Général consulte les analytics et les logs d\'audit',
        'ETAPE 4 : Vérifier que les actions sont tracées dans l\'audit',
    ], 'L\'administrateur voit les métriques mises à jour en temps réel. Les actions sont tracées dans les logs d\'audit avec horodatage.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 11. TESTS BASE ÉTAT CIVIL
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('11. Tests de la base de données des actes de naissance'))
story.append(Paragraph(
    'La base de données des actes de naissance est un composant critique de la plateforme eAdministration Suite '
    'Guinea. Elle contient 25 enregistrements de démonstration couvrant les principales communes et régions '
    'de Guinée, avec des statuts variés (actif, annulé, corrigé) permettant de tester tous les scénarios '
    'de recherche et de vérification. Les tests de cette section sont exécutables depuis n\'importe quel '
    'rôle ayant accès à la base (Mairie, Ministère, Admin, Super Admin).',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('BEC-01', 'Affichage de la liste complète', [
        'Accéder à la Base État Civil',
        'Vérifier la liste des 25 enregistrements',
    ], 'Les 25 actes de naissance sont affichés avec numéro d\'acte, nom, prénom, date de naissance, commune, statut.'),
    
    tc('BEC-02', 'Recherche par nom de famille', [
        'Saisir "Camara" dans la recherche',
        'Vérifier les résultats',
    ], 'Les actes correspondant au nom Camara s\'affichent : Ousmane Camara (bc-004), Aissatou Camara (bc-009), Alpha Camara (bc-017), Fatoumata Camara (bc-024).'),
    
    tc('BEC-03', 'Recherche par numéro d\'acte exact', [
        'Saisir "AN/KAN/1992/0045"',
        'Lancer la recherche',
    ], 'L\'acte d\'Ibrahim Condé (bc-002) s\'affiche directement avec toutes les informations détaillées.'),
    
    tc('BEC-04', 'Recherche avancée - Filtrage par commune', [
        'Sélectionner le filtre commune "Kaloum"',
        'Vérifier les résultats',
    ], 'Seuls les actes de la commune de Kaloum s\'affichent : bc-001, bc-009, bc-020.'),
    
    tc('BEC-05', 'Recherche avancée - Filtrage par statut', [
        'Filtrer par statut "Annulé"',
        'Vérifier les résultats',
    ], 'L\'acte bc-015 (Moussa Keita, annulé pour doublon) s\'affiche.'),
    
    tc('BEC-06', 'Recherche avancée - Filtrage par statut "Corrigé"', [
        'Filtrer par statut "Corrigé"',
        'Vérifier les résultats',
    ], 'Les actes corrigés s\'affichent : bc-010 (Sékou Condé, correction nom du père), bc-022 (Abdoulaye Bah, correction date de naissance).'),
    
    tc('BEC-07', 'Vérification d\'identité - Cas positif', [
        'Utiliser la fonction de vérification d\'identité',
        'Saisir : Nom = "Diallo", Prénom = "Aminata", Date naissance = "15/03/1995"',
        'Lancer la vérification',
    ], 'Identité vérifiée avec succès. Les détails de l\'acte AN/KAL/1995/0001 s\'affichent. Le compteur de vérifications est incrémenté.'),
    
    tc('BEC-08', 'Vérification d\'identité - Cas négatif', [
        'Saisir : Nom = "Diallo", Prénom = "Aminata", Date naissance = "01/01/2000"',
        'Lancer la vérification',
    ], 'Aucun acte ne correspond aux critères. Un message "Aucun résultat" est affiché.'),
    
    tc('BEC-09', 'Consultation des statistiques', [
        'Accéder aux statistiques de la base',
        'Vérifier les données affichées',
    ], 'Statistiques : 25 total, 22 actifs, 1 annulé, 2 corrigés. Répartition par commune et région correcte. Nombre de vérifications à jour.'),
    
    tc('BEC-10', 'Filtrage par région', [
        'Filtrer par région "Kankan"',
        'Vérifier les résultats',
    ], 'Les actes de la région de Kankan s\'affichent : bc-002, bc-014, bc-024.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 12. TESTS ASSISTANT IA
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('12. Tests de l\'Assistant IA et Chatbot'))
story.append(Paragraph(
    'La plateforme intègre un assistant IA sous deux formes : un chatbot flottant accessible depuis n\'importe '
    'quelle page via une icône en bas à droite de l\'écran, et une page dédiée "Assistant IA" accessible '
    'depuis le sidebar. L\'assistant utilise le SDK z-ai-web-dev-sdk pour générer des réponses contextuelles, '
    'avec un système de fallback local qui garantit une réponse même en cas d\'indisponibilité du service IA. '
    'Les tests de cette section vérifient le bon fonctionnement des deux interfaces, la qualité des réponses, '
    'et la gestion des erreurs.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('IA-01', 'Ouverture du chatbot flottant', [
        'Depuis n\'importe quelle page authentifiée',
        'Cliquer sur l\'icône du chatbot en bas à droite',
        'Vérifier l\'affichage de la fenêtre de chat',
    ], 'La fenêtre de chat s\'ouvre avec un message de bienvenue. Le champ de saisie est actif et prêt à recevoir un message.'),
    
    tc('IA-02', 'Envoi d\'un message au chatbot', [
        'Saisir "Comment demander un extrait d\'acte de naissance ?"',
        'Envoyer le message',
        'Attendre la réponse',
    ], 'Le message est envoyé et affiché dans le chat. Une réponse contextuelle est générée par l\'IA, expliquant la procédure de demande.'),
    
    tc('IA-03', 'Question sur un service public', [
        'Demander "Quel est le coût d\'un passeport biométrique ?"',
        'Vérifier la réponse',
    ], 'L\'IA répond avec le coût (150 000 GNF), le délai (10 jours), et les documents requis pour le passeport.'),
    
    tc('IA-04', 'Question sur le suivi de demande', [
        'Demander "Comment suivre ma demande ?"',
        'Vérifier la réponse',
    ], 'L\'IA explique comment accéder à la section "Mes demandes" et utiliser le numéro de référence pour le suivi.'),
    
    tc('IA-05', 'Fermeture du chatbot', [
        'Cliquer sur le bouton de fermeture ou l\'icône du chatbot',
        'Rouvrir le chatbot',
    ], 'Le chatbot se ferme. En le rouvrant, l\'historique de conversation est conservé.'),
    
    tc('IA-06', 'Page Assistant IA complète', [
        'Naviguer vers "Assistant IA" dans le sidebar',
        'Vérifier l\'affichage de la page complète',
    ], 'La page Assistant IA s\'affiche avec une interface de chat plus large, les conversations précédentes, et des suggestions de questions.'),
    
    tc('IA-07', 'Conversation multi-tours', [
        'Poser une première question sur les services',
        'Poser une question de suivi liée à la première',
        'Vérifier la continuité de la conversation',
    ], 'L\'IA maintient le contexte de la conversation. Les réponses sont cohérentes avec les questions précédentes.'),
    
    tc('IA-08', 'Gestion d\'une question hors périmètre', [
        'Poser une question non liée à l\'administration (ex: "Quelle est la météo ?")',
        'Vérifier la réponse',
    ], 'L\'IA répond poliment en indiquant que la question est hors de son périmètre d\'expertise, ou fournit une réponse générale utile.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 13. TESTS GED
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('13. Tests de la GED et archivage'))
story.append(Paragraph(
    'Le module de Gestion Électronique de Documents (GED) est accessible par la plupart des rôles administratifs '
    'et permet de classer, consulter, télécharger et archiver les documents administratifs. Le système d\'archivage '
    'assure la traçabilité et la pérennité des documents officiels, conformément aux exigences réglementaires '
    'guinéennes. Les tests ci-dessous vérifient les fonctionnalités principales de la GED, y compris le '
    'classement par catégorie, la recherche, le téléchargement, et le processus d\'archivage.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('GED-01', 'Accès à la GED', [
        'Se connecter avec un rôle ayant accès à la GED (Mairie, Admin, Ministère)',
        'Naviguer vers la GED',
    ], 'La page GED s\'affiche avec la liste des documents organisés par catégorie.'),
    
    tc('GED-02', 'Consultation d\'un document', [
        'Cliquer sur un document dans la liste',
        'Vérifier les détails affichés',
    ], 'Les détails du document s\'affichent : titre, catégorie, date, auteur, statut, actions disponibles (télécharger, archiver).'),
    
    tc('GED-03', 'Téléchargement d\'un document', [
        'Sélectionner un document',
        'Cliquer sur "Télécharger"',
    ], 'Le document est téléchargé au format approprié. Le fichier est intact et lisible.'),
    
    tc('GED-04', 'Archivage d\'un document', [
        'Sélectionner un document actif',
        'Cliquer sur "Archiver"',
        'Confirmer l\'archivage',
    ], 'Le document est marqué comme archivé. Il apparaît dans la section "Archivés" avec la date d\'archivage.'),
    
    tc('GED-05', 'Recherche dans la GED', [
        'Utiliser la barre de recherche de la GED',
        'Saisir un terme de recherche',
    ], 'Les documents correspondant au terme de recherche sont affichés. La recherche fonctionne sur le titre et la catégorie.'),
    
    tc('GED-06', 'Filtrage par catégorie', [
        'Sélectionner une catégorie dans le filtre',
        'Vérifier les résultats',
    ], 'Seuls les documents de la catégorie sélectionnée sont affichés.'),
    
    tc('GED-07', 'Consultation des documents archivés', [
        'Naviguer vers l\'onglet "Archivés"',
        'Vérifier la liste des documents archivés',
    ], 'Les documents archivés sont listés séparément avec leur date d\'archivage et l\'agent qui a effectué l\'archivage.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 14. TESTS COURRIERS ET WORKFLOWS
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('14. Tests des courriers et workflows'))
story.append(Paragraph(
    'Le module de gestion des courriers permet le suivi des correspondances administratives entrantes et '
    'sortantes, tandis que le module de workflows permet de créer et d\'animer des processus de validation '
    'multi-étapes. Ces deux modules sont principalement utilisés par les agents ministériels et les '
    'administrateurs pour assurer la traçabilité des échanges et la conformité des processus décisionnels. '
    'Les tests ci-dessous couvrent les principales opérations de ces modules.',
    style_body
))
story.append(Spacer(1, 6))

story.append(section('14.1 Courriers', 2))
for items in [
    tc('COUR-01', 'Affichage de la liste des courriers', [
        'Se connecter comme Ministère ou Admin',
        'Naviguer vers le module Courriers',
    ], 'La liste des courriers s\'affiche avec les colonnes : référence, objet, expéditeur/destinataire, date, statut, priorité.'),
    
    tc('COUR-02', 'Ouverture d\'un courrier', [
        'Cliquer sur un courrier dans la liste',
        'Vérifier les détails',
    ], 'Le contenu du courrier s\'affiche avec toutes les métadonnées et les actions disponibles.'),
    
    tc('COUR-03', 'Actions sur les courriers', [
        'Ouvrir un courrier',
        'Utiliser le menu d\'actions (3 points)',
        'Tester : Marquer comme lu, Transférer, Archiver',
    ], 'Chaque action fonctionne correctement. Le statut du courrier est mis à jour en conséquence.'),
    
    tc('COUR-04', 'Filtrage des courriers', [
        'Filtrer par statut (Lu, Non lu, Archivé)',
        'Filtrer par priorité (Urgent, Normal, Bas)',
    ], 'Les filtres fonctionnent et affichent uniquement les courriers correspondant aux critères sélectionnés.'),
]:
    story.extend(items)

story.append(section('14.2 Workflows', 2))
for items in [
    tc('WF-01', 'Affichage des workflows', [
        'Naviguer vers le module Workflows',
        'Vérifier la liste des workflows actifs',
    ], 'Les workflows en cours sont listés avec leur nom, initiateur, étape actuelle, et statut.'),
    
    tc('WF-02', 'Action sur une étape de workflow', [
        'Sélectionner un workflow en attente',
        'Approuver ou rejeter l\'étape en cours',
    ], 'L\'action est enregistrée. Le workflow avance à l\'étape suivante (si approuvé) ou notifie l\'initiateur (si rejeté).'),
    
    tc('WF-03', 'Signatures électroniques', [
        'Naviguer vers le module Signatures',
        'Vérifier les documents en attente de signature',
        'Signer un document',
    ], 'La signature est enregistrée avec la date, l\'heure et l\'identité du signataire. Le document est marqué comme signé.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 15. TESTS ANALYTICS ET AUDIT
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('15. Tests des analytics et audit'))
story.append(Paragraph(
    'Les modules d\'analytics et d\'audit fournissent des outils de supervision et de traçabilité essentiels '
    'pour le pilotage de la plateforme. Les analytics offrent des tableaux de bord avec des indicateurs '
    'de performance et des graphiques, tandis que les logs d\'audit enregistrent chaque action effectuée '
    'sur le système. Ces deux modules sont accessibles aux rôles Admin Général et Super Admin. Les tests '
    'ci-dessous vérifient l\'affichage des données, la fonctionnalité des exports, et la complétude des traces.',
    style_body
))
story.append(Spacer(1, 6))

for items in [
    tc('ANA-01', 'Affichage des analytics', [
        'Se connecter comme Admin ou Super Admin',
        'Naviguer vers Analytics',
    ], 'Les graphiques de performance s\'affichent : demandes par mois, taux de traitement, répartition par service, délais moyens.'),
    
    tc('ANA-02', 'Export PDF des analytics', [
        'Dans la page Analytics, cliquer sur "Export PDF"',
        'Vérifier le fichier téléchargé',
    ], 'Un fichier PDF est généré et téléchargé. Il contient les graphiques et les données statistiques visibles à l\'écran.'),
    
    tc('ANA-03', 'Export CSV des analytics', [
        'Cliquer sur "Export CSV"',
        'Ouvrir le fichier téléchargé',
    ], 'Un fichier CSV est généré avec les données brutes des statistiques. Le fichier est lisible et les données sont correctes.'),
    
    tc('AUD-01', 'Affichage des logs d\'audit', [
        'Naviguer vers Audit Logs',
    ], 'Les événements d\'audit sont listés par ordre chronologique décroissant : horodatage, utilisateur, action, détails, adresse IP.'),
    
    tc('AUD-02', 'Filtrage des logs d\'audit', [
        'Filtrer par type d\'action (connexion, modification, suppression)',
        'Filtrer par utilisateur',
        'Filtrer par date',
    ], 'Les filtres fonctionnent et affichent uniquement les événements correspondant aux critères.'),
    
    tc('AUD-03', 'Export CSV des logs d\'audit', [
        'Cliquer sur "Export CSV" dans la page Audit',
        'Ouvrir le fichier téléchargé',
    ], 'Un fichier CSV avec les logs filtrés est téléchargé. Les colonnes incluent : date, utilisateur, action, détails.'),
    
    tc('AUD-04', 'Mode live des logs d\'audit', [
        'Activer le mode "Live" si disponible',
        'Effectuer une action sur la plateforme',
        'Vérifier que l\'action apparaît en temps réel',
    ], 'Les nouvelles actions apparaissent automatiquement dans les logs sans rechargement de page.'),
]:
    story.extend(items)

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 16. MATRICE DE COUVERTURE
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('16. Matrice de couverture des services publics'))
story.append(Paragraph(
    'La matrice ci-dessous croise les 20 services publics (identifiés par leur ID) avec les rôles utilisateurs '
    'pour indiquer quel rôle interagit avec chaque service et dans quel contexte (demande, traitement, supervision). '
    'Cette matrice permet de vérifier que chaque service est testé au moins une fois par un rôle concerné, '
    'assurant ainsi une couverture complète des fonctionnalités de la plateforme.',
    style_body
))
story.append(Spacer(1, 8))

# Compact matrix table
matrix_headers = ['Service', 'Citoyen', 'Mairie', 'ANIP', 'Ministère', 'Admin']
matrix_rows = [
    ['ec-1 Acte naissance', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['ec-2 Acte mariage', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['ec-3 Acte décès', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['ec-4 Cert. nationalité', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['ec-5 Décl. naissance', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['j-1 Casier judiciaire', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['j-2 Cert. non-poursuite', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['j-3 Légalisation', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['id-1 CNI biométrique', 'Demande', '-', 'Traite', '-', 'Supervise'],
    ['id-2 Passeport', 'Demande', '-', 'Traite', '-', 'Supervise'],
    ['id-3 Permis conduire', 'Demande', '-', 'Traite', '-', 'Supervise'],
    ['u-1 Permis construire', 'Demande', '-', '-', '-', 'Supervise'],
    ['e-1 Enreg. entreprise', 'Demande', '-', '-', '-', 'Supervise'],
    ['e-2 Registre commerce', 'Demande', '-', '-', '-', 'Supervise'],
    ['ed-1 Attest. scolarité', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['ed-2 Diplôme/relevé', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['s-1 Cert. vaccination', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['s-2 Carte sanitaire', 'Demande', '-', '-', 'Traite', 'Supervise'],
    ['r-1 Cert. résidence', 'Demande', 'Traite', '-', '-', 'Supervise'],
    ['r-2 Attest. domicile', 'Demande', 'Traite', '-', '-', 'Supervise'],
]

story.append(make_table(
    matrix_headers,
    matrix_rows,
    [0.22, 0.14, 0.14, 0.14, 0.18, 0.18]
))
story.append(Paragraph('Tableau 5 : Matrice de couverture services x rôles', style_caption))

story.append(Spacer(1, 12))
story.append(section('Résumé de couverture par rôle', 2))
story.append(make_table(
    ['Rôle', 'Nb. cas de test', 'Modules couverts', 'Parcours complets'],
    [
        ['Citoyen', '10+', 'Portail, Services, Demandes, Profil', 'CROSS-01, CROSS-02, CROSS-03, CROSS-04, CROSS-05'],
        ['Agent de Mairie', '15', 'Dashboard, Demandes, GED, Courriers, Base État Civil', 'CROSS-01, CROSS-03, CROSS-04'],
        ['Agent d\'Agence ANIP', '6', 'Dashboard, Demandes, GED', 'CROSS-02, CROSS-05'],
        ['Agent Ministériel', '6', 'Dashboard, GED, Courriers, Workflows, Signatures', 'CROSS-04'],
        ['Admin Général', '8', 'Dashboard, Admin, Utilisateurs, Analytics, Audit, Paramètres', 'CROSS-06'],
        ['Super Admin', '6', 'Tous les modules + Espace Mairie + Espace Agence', 'CROSS-06'],
    ],
    [0.16, 0.12, 0.36, 0.36]
))
story.append(Paragraph('Tableau 6 : Résumé de couverture par rôle', style_caption))

# story.append(PageBreak())  # removed for better fill ratio

# ═══════════════════════════════════════════════════════════════════════════
# 17. RECAPITULATIF ET CHECKLIST
# ═══════════════════════════════════════════════════════════════════════════
story.append(section('17. Récapitulatif et checklist de validation'))
story.append(Paragraph(
    'Cette section finale fournit une checklist de validation récapitulative que l\'équipe de test peut '
    'utiliser pour suivre l\'avancement de la campagne de test. Chaque item correspond à un domaine '
    'fonctionnel clé et doit être validé en cochant la case correspondante une fois que tous les cas de '
    'test du domaine ont été exécutés avec succès. Cette checklist synthétise l\'ensemble des tests décrits '
    'dans les sections précédentes et permet d\'identifier rapidement les domaines nécessitant une attention '
    'particulière ou des corrections.',
    style_body
))
story.append(Spacer(1, 8))

checklist_items = [
    ['Authentification', 'AUTH-01 à AUTH-10', 'Connexion/déconnexion des 6 rôles, erreurs de login, persistance thème', ''],
    ['Portail Citoyen', 'CIT-01 à CIT-10', 'Navigation, filtrage, recherche, soumission de demandes, suivi, profil', ''],
    ['Services publics (20)', 'Voir Tableau 4', 'Soumission de demande pour chaque service, vérification coût/délai/assignation', ''],
    ['Agent de Mairie', 'MAI-01 à MAI-15', 'Dashboard, traitement demandes, base état civil, vérification identité', ''],
    ['Agent ANIP', 'AG-01 à AG-06', 'Dashboard, pipeline CNI/Passeport/Permis, GED', ''],
    ['Agent Ministériel', 'MIN-01 à MIN-06', 'Dashboard, GED, courriers, workflows, signatures', ''],
    ['Admin Général', 'ADM-01 à ADM-08', 'Dashboard, utilisateurs, demandes, analytics, audit, paramètres', ''],
    ['Super Admin', 'SA-01 à SA-06', 'Accès complet, Espace Mairie, Espace Agence, tous modules', ''],
    ['Parcours inter-rôles', 'CROSS-01 à CROSS-06', '6 parcours complets bout-en-bout multi-rôles', ''],
    ['Base État Civil', 'BEC-01 à BEC-10', 'Recherche, filtrage, vérification identité, statistiques', ''],
    ['Assistant IA', 'IA-01 à IA-08', 'Chatbot flottant, page assistant, multi-tours, hors périmètre', ''],
    ['GED & Archivage', 'GED-01 à GED-07', 'Consultation, téléchargement, archivage, recherche, filtrage', ''],
    ['Courriers', 'COUR-01 à COUR-04', 'Liste, détails, actions, filtrage', ''],
    ['Workflows & Signatures', 'WF-01 à WF-03', 'Workflows actifs, approbation/rejet, signatures électroniques', ''],
    ['Analytics', 'ANA-01 à ANA-03', 'Graphiques, export PDF, export CSV', ''],
    ['Audit', 'AUD-01 à AUD-04', 'Logs, filtrage, export CSV, mode live', ''],
]

story.append(make_table(
    ['Domaine', 'Cas de test', 'Points de validation', 'Statut'],
    checklist_items,
    [0.16, 0.16, 0.52, 0.16]
))
story.append(Paragraph('Tableau 7 : Checklist de validation finale', style_caption))

story.append(Spacer(1, 16))
story.append(Paragraph(
    'Pour chaque domaine, le testeur doit exécuter tous les cas de test listés, vérifier que le résultat '
    'attendu est obtenu, et noter tout écart ou anomalie observé. En cas d\'échec d\'un cas de test, '
    'il est recommandé de documenter les étapes exactes de reproduction, le comportement observé, et le '
    'comportement attendu afin de faciliter la correction par l\'équipe de développement. L\'objectif est '
    'd\'atteindre un taux de réussite de 100% sur l\'ensemble des cas de test avant la mise en production '
    'de la plateforme eAdministration Suite Guinea.',
    style_body
))

# ═══════════════════════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════════════════════
doc.build(story)
print(f"PDF generated: {OUTPUT}")
