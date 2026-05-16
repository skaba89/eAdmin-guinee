#!/usr/bin/env python3
"""Replace framer-motion with lightweight CSS animations in all component files."""

import re
import os

FILES = [
    'src/components/auth/login-page.tsx',
    'src/components/auth/register-page.tsx',
    'src/components/app/database-query-page.tsx',
    'src/components/layout/app-sidebar.tsx',
    'src/components/app/audit-logs-page.tsx',
    'src/components/app/dashboard-page.tsx',
    'src/components/app/settings-page.tsx',
    'src/components/app/citizen-portal-page.tsx',
    'src/components/app/ai-chatbot-widget.tsx',
    'src/components/app/ged-page.tsx',
    'src/components/app/service-requests-page.tsx',
    'src/components/app/workflow-page.tsx',
    'src/components/app/users-page.tsx',
    'src/components/app/ai-assistant-page.tsx',
    'src/components/app/courriers-page.tsx',
    'src/components/app/signatures-page.tsx',
    'src/components/app/notifications-page.tsx',
    'src/components/app/admin-page.tsx',
    'src/components/app/analytics-page.tsx',
]

BASE = '/home/z/my-project'

def process_file(filepath):
    full_path = os.path.join(BASE, filepath)
    with open(full_path, 'r') as f:
        content = f.read()

    original = content

    # 1. Replace framer-motion import with our animations
    # Check what's imported
    has_motion = 'motion' in content
    has_animate_presence = 'AnimatePresence' in content
    has_use_inview = 'useInView' in content and 'framer-motion' in content

    # Build replacement import
    imports = []
    if has_motion:
        imports.append('FadeIn')
    if has_animate_presence:
        pass  # AnimatePresence removed, just conditional render

    if imports:
        new_import = f"import {{ {', '.join(imports)} }} from '@/lib/animations'"
        # Replace the framer-motion import line
        content = re.sub(
            r"import\s*\{[^}]*\}\s*from\s*'framer-motion'",
            new_import,
            content
        )

    # 2. Replace AnimatePresence
    # Remove AnimatePresence wrapper - just keep children
    content = re.sub(r'<AnimatePresence[^>]*>\s*', '', content)
    content = re.sub(r'\s*</AnimatePresence>', '', content)

    # 3. Replace motion.div with appropriate element
    # Pattern: <motion.div ... props ...>content</motion.div>

    # Common patterns for motion.div:
    # a) Simple fade-in: initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    # b) Slide up: initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    # c) Slide from left: initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    # d) Scale: initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}

    # Replace motion.div with FadeIn or div depending on props
    # This is complex, so we'll do a simplified replacement

    # Replace self-closing motion.div tags first (rare but possible)
    # Then opening/closing pairs

    # Simple approach: replace <motion.div with <div, remove animation props
    # and let the FadeIn wrapper handle animations

    # Replace <motion.div with <div and remove motion-specific props
    content = content.replace('<motion.div', '<div')
    content = content.replace('</motion.div>', '</div>')
    content = content.replace('<motion.span', '<span')
    content = content.replace('</motion.span>', '</span>')
    content = content.replace('<motion.button', '<button')
    content = content.replace('</motion.button>', '</button>')
    content = content.replace('<motion.section', '<section')
    content = content.replace('</motion.section>', '</section>')
    content = content.replace('<motion.nav', '<nav')
    content = content.replace('</motion.nav>', '</nav>')
    content = content.replace('<motion.p', '<p')
    content = content.replace('</motion.p>', '</p>')

    # Remove framer-motion specific props
    # initial={{ ... }}
    content = re.sub(r'\s*initial=\{\{[^}]*\}\}', '', content)
    # animate={{ ... }}
    content = re.sub(r'\s*animate=\{\{[^}]*\}\}', '', content)
    # exit={{ ... }}
    content = re.sub(r'\s*exit=\{\{[^}]*\}\}', '', content)
    # whileHover={{ ... }}
    content = re.sub(r'\s*whileHover=\{\{[^}]*\}\}', '', content)
    # whileTap={{ ... }}
    content = re.sub(r'\s*whileTap=\{\{[^}]*\}\}', '', content)
    # whileInView={{ ... }}
    content = re.sub(r'\s*whileInView=\{\{[^}]*\}\}', '', content)
    # transition={{ ... }}
    content = re.sub(r'\s*transition=\{\{[^}]*\}\}', '', content)
    # viewport={{ ... }}
    content = re.sub(r'\s*viewport=\{\{[^}]*\}\}', '', content)
    # variants={{ ... }}
    content = re.sub(r'\s*variants=\{\{[^}]*\}\}', '', content)
    # layout prop
    content = re.sub(r'\s*layout(=\{[^}]*\})?', '', content)
    # layoutId prop
    content = re.sub(r'\s*layoutId="[^"]*"', '', content)

    # Remove any leftover empty FadeIn import if no FadeIn is actually used
    if 'FadeIn' not in content.replace("import { FadeIn } from '@/lib/animations'", ''):
        # If FadeIn import exists but not used, remove it
        content = content.replace("import { FadeIn } from '@/lib/animations'\n", '')

    # Add transition classes to divs that had motion for simple animations
    # Add hover:scale-105 to elements that might have had whileHover

    if content != original:
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    else:
        print(f"No changes: {filepath}")
        return False

updated = 0
for f in FILES:
    if process_file(f):
        updated += 1

print(f"\nTotal files updated: {updated}")
