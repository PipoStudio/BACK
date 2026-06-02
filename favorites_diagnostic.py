#!/usr/bin/env python3
# favorites_diagnostic.py
# Escanea el código JS del proyecto para detectar problemas comunes del sistema de favoritos.
# Genera un JSON llamado favorites_diagnostic.json en la raíz con el informe.
#
# Uso: ejecutar desde la raíz del repositorio:
#   python3 favorites_diagnostic.py
#
# Output: favorites_diagnostic.json (márcalo y pásamelo para que analice los resultados).

import re
import json
from pathlib import Path
import sys

# Configuración: archivos y patrones a buscar
REPO_ROOT = Path('.')
JS_DIR = REPO_ROOT / 'js'
OUTPUT = REPO_ROOT / 'favorites_diagnostic.json'

# Patrones útiles
PAT_SETITEM = re.compile(r"localStorage\.setItem\s*\(\s*['\"]geekwave_favorites['\"]\s*,", re.I)
PAT_DISPATCH_FAV = re.compile(r"dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['\"]favoritesUpdated['\"]", re.I)
PAT_DISPATCH_GENERIC = re.compile(r"dispatchEvent\s*\(", re.I)
PAT_WINDOW_DISPATCH = re.compile(r"window\.dispatchEvent\s*\(", re.I)
PAT_DOCUMENT_DISPATCH = re.compile(r"document\.dispatchEvent\s*\(", re.I)
PAT_LISTENER_FAV = re.compile(r"addEventListener\s*\(\s*['\"]favoritesUpdated['\"]\s*,", re.I)
PAT_RENDER_FAV_CALL = re.compile(r"\brenderFavorites\s*\(", re.I)
PAT_LISTENER_STORAGE = re.compile(r"addEventListener\s*\(\s*['\"]storage['\"]\s*,", re.I)
PAT_STORAGE_KEY_CHECK = re.compile(r"e\.key\s*===?\s*['\"]geekwave_favorites['\"]", re.I)
PAT_UPDATE_BADGE = re.compile(r"function\s+updateFavoritesBadge\s*\(", re.I)
PAT_RENDER_FUNC = re.compile(r"function\s+renderFavorites\s*\(", re.I)
PAT_FAVORITE_BTN_CLASS_ADD = re.compile(r"\bclassList\.add\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", re.I)
PAT_FAVORITE_BTN_MARK = re.compile(r"\.favorite-btn\b", re.I)
PAT_FAV_BTN_GET = re.compile(r"getElementById\s*\(\s*['\"]favoritesBtn['\"]\s*\)", re.I)
PAT_FAV_CONTAINER = re.compile(r"getElementById\s*\(\s*['\"]favoritesContainer['\"]\s*\)", re.I)
PAT_INVENTARIO_USAGE = re.compile(r"\binventario\b", re.I)
PAT_WINDOW_INV = re.compile(r"window\.inventarioGlobal\b", re.I)
PAT_CLASS_ACTIVE = re.compile(r"(?:classList\.(?:add|remove)\s*\(\s*['\"](active|is-active|has-favorites|is-active)['\"]\s*\))", re.I)

# Files to analyze: all .js under js/ that are not in Game folder (user requested ignore Game)
def gather_js_files():
    files = []
    if not JS_DIR.exists():
        return files
    for p in JS_DIR.rglob('*.js'):
        # skip files under any path containing /Game/ or \Game\
        if 'Game' in p.parts:
            continue
        files.append(p)
    return sorted(files)

def file_lines(p):
    txt = p.read_text(encoding='utf-8', errors='replace')
    return txt.splitlines(), txt

def find_nearby(lines, idx, window=5):
    start = max(0, idx - window)
    end = min(len(lines), idx + window + 1)
    return '\n'.join(lines[start:end])

def analyze_file(p: Path):
    lines, text = file_lines(p)
    report = {
        'path': str(p),
        'exists': True,
        'issues': [],
        'occurrences': {
            'setitem': [],
            'dispatch_favorites': [],
            'dispatch_any': [],
            'dispatch_window': [],
            'dispatch_document': [],
            'listener_favoritesUpdated': [],
            'listener_storage': [],
            'storage_key_checks': [],
            'updateFavoritesBadge_defs': [],
            'renderFavorites_defs': [],
            'renderFavorites_calls': [],
            'favoritesContainer_refs': [],
            'favoritesBtn_refs': [],
            'inventario_refs': [],
            'classnames_found': []
        }
    }

    # Scan line by line to capture context and line numbers
    for i, line in enumerate(lines):
        if PAT_SETITEM.search(line):
            ctx = find_nearby(lines, i, 6)
            report['occurrences']['setitem'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
        if PAT_DISPATCH_FAV.search(line):
            ctx = find_nearby(lines, i, 6)
            report['occurrences']['dispatch_favorites'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
        if PAT_DISPATCH_GENERIC.search(line):
            ctx = find_nearby(lines, i, 3)
            report['occurrences']['dispatch_any'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
        if PAT_WINDOW_DISPATCH.search(line):
            report['occurrences']['dispatch_window'].append({'line': i+1, 'snippet': line.strip()})
        if PAT_DOCUMENT_DISPATCH.search(line):
            report['occurrences']['dispatch_document'].append({'line': i+1, 'snippet': line.strip()})
        if PAT_LISTENER_FAV.search(line):
            # capture the following block up to matching closing paren/brace heuristic
            ctx = find_nearby(lines, i, 12)
            report['occurrences']['listener_favoritesUpdated'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
            # Check if in that nearby context renderFavorites is called
            if PAT_RENDER_FAV_CALL.search(ctx):
                report['issues'].append({
                    'severity': 'medium',
                    'type': 'render_on_update_listener',
                    'message': "El listener 'favoritesUpdated' llama a renderFavorites; esto puede provocar que el panel se renderice tras cualquier cambio y deformar la UI.",
                    'file': str(p),
                    'line': i+1,
                    'context': ctx
                })
        if PAT_LISTENER_STORAGE.search(line):
            ctx = find_nearby(lines, i, 10)
            report['occurrences']['listener_storage'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
            if PAT_STORAGE_KEY_CHECK.search(ctx):
                report['occurrences']['storage_key_checks'].append({'line': i+1, 'context': ctx})
            else:
                report['issues'].append({
                    'severity': 'low',
                    'type': 'storage_listener_without_key_check',
                    'message': "Listener 'storage' presente pero no parece verificar e.key === 'geekwave_favorites'.",
                    'file': str(p),
                    'line': i+1,
                    'context': ctx
                })
        if PAT_UPDATE_BADGE.search(line):
            ctx = find_nearby(lines, i, 10)
            report['occurrences']['updateFavoritesBadge_defs'].append({'line': i+1, 'context': ctx})
        if PAT_RENDER_FUNC.search(line):
            ctx = find_nearby(lines, i, 10)
            report['occurrences']['renderFavorites_defs'].append({'line': i+1, 'context': ctx})
        if PAT_RENDER_FAV_CALL.search(line):
            ctx = find_nearby(lines, i, 6)
            report['occurrences']['renderFavorites_calls'].append({'line': i+1, 'snippet': line.strip(), 'context': ctx})
        if PAT_FAV_CONTAINER.search(line):
            report['occurrences']['favoritesContainer_refs'].append({'line': i+1, 'snippet': line.strip()})
        if PAT_FAV_BTN_GET.search(line):
            report['occurrences']['favoritesBtn_refs'].append({'line': i+1, 'snippet': line.strip()})
        if PAT_INVENTARIO_USAGE.search(line):
            report['occurrences']['inventario_refs'].append({'line': i+1, 'snippet': line.strip()})
        # class names
        mcls = PAT_FAVORITE_BTN_CLASS_ADD.search(line)
        if mcls:
            cls = mcls.group(1)
            report['occurrences']['classnames_found'].append({'line': i+1, 'class': cls, 'snippet': line.strip()})

    # Post-analysis cross-file style hints will be done at higher level
    return report

def consolidate(findings):
    # build global summary across files
    summary = {
        'files_scanned': len(findings),
        'files_with_setitem': 0,
        'files_with_dispatch_favorites': 0,
        'files_with_listener_favoritesUpdated': 0,
        'files_with_listener_storage_for_favs': 0,
        'updateFavoritesBadge_defs': 0,
        'renderFavorites_defs': 0,
        'inconsistencies': [],
    }

    # collect class usage map (class -> set(files))
    class_map = {}
    for f in findings:
        occ = f['occurrences']
        if occ['setitem']:
            summary['files_with_setitem'] += 1
        if occ['dispatch_favorites']:
            summary['files_with_dispatch_favorites'] += 1
        if occ['listener_favoritesUpdated']:
            summary['files_with_listener_favoritesUpdated'] += 1
        if occ['storage_key_checks']:
            summary['files_with_listener_storage_for_favs'] += 1
        summary['updateFavoritesBadge_defs'] += len(occ['updateFavoritesBadge_defs'])
        summary['renderFavorites_defs'] += len(occ['renderFavorites_defs'])
        for c in occ['classnames_found']:
            class_map.setdefault(c['class'], set()).add(f['path'])

    # detect mismatch between classes used to mark favorites in product buttons vs navbar
    # Typical: productos.js uses 'active' while navbar uses 'has-favorites' or viceversa
    class_usage = {k: list(v) for k, v in class_map.items()}
    # If 'active' used in some files and 'has-favorites' in others -> inconsistency
    if 'active' in class_map and 'has-favorites' in class_map:
        summary['inconsistencies'].append({
            'type': 'class-name-mismatch',
            'message': "Se detectó uso de 'active' en algunos archivos y 'has-favorites' en otros. Esto puede causar que el estado visual no sincronice correctamente.",
            'details': {
                'active_in': list(class_map['active']),
                'has-favorites_in': list(class_map['has-favorites'])
            }
        })
    # Check dispatch vs listener presence
    # If setItem present but no dispatch in same file -> flag
    for f in findings:
        if f['occurrences']['setitem'] and not f['occurrences']['dispatch_favorites'] and not f['occurrences']['dispatch_window'] and not f['occurrences']['dispatch_document']:
            summary['inconsistencies'].append({
                'type': 'missing-dispatch-after-setitem',
                'message': "Este archivo actualiza localStorage('geekwave_favorites') pero no emite un evento 'favoritesUpdated' cercano. Esto impide que el navbar se entere en la misma pestaña.",
                'file': f['path'],
                'examples': f['occurrences']['setitem'][:3]
            })
    # If listener_favoritesUpdated calls renderFavorites -> warn
    for f in findings:
        for l in f['occurrences']['listener_favoritesUpdated']:
            if PAT_RENDER_FAV_CALL.search(l.get('context','')):
                summary['inconsistencies'].append({
                    'type': 'render-on-update-listener',
                    'message': "Listener 'favoritesUpdated' invoca renderFavorites. Esto puede causar que el panel se re-renderice automáticamente y cambie la maquetación.",
                    'file': f['path'],
                    'line': l['line'],
                    'context': l.get('context')
                })
    # If renderFavorites uses 'inventario' but inventory is fetched async in another file -> warn
    # detect files that define fetch('json/inventario.json') and files that call renderFavorites/inventario
    files_fetch_inventory = set()
    files_render_using_inventario = []
    for f in findings:
        lines_ctx = ''.join([c['context'] for c in f['occurrences']['updateFavoritesBadge_defs'] if 'context' in c])
        # simpler: search in file for fetch('json/inventario.json')
        txt = Path(f['path']).read_text(encoding='utf-8', errors='replace')
        if "fetch('json/inventario.json')" in txt or 'fetch("./json/inventario.json")' in txt:
            files_fetch_inventory.add(f['path'])
        # if renderFavorites defs or inventario refs present
        if f['occurrences']['renderFavorites_defs'] or f['occurrences']['inventario_refs']:
            files_render_using_inventario.append(f['path'])
    if files_render_using_inventario and files_fetch_inventory and files_fetch_inventory.isdisjoint(files_render_using_inventario):
        summary['inconsistencies'].append({
            'type': 'inventario-race',
            'message': "renderFavorites depende de 'inventario' pero la carga de inventario ocurre en otro archivo de forma asíncrona. renderFavorites podría ejecutarse antes de que inventario esté disponible.",
            'fetch_files': list(files_fetch_inventory),
            'render_files': list(files_render_using_inventario)
        })

    summary['class_usage'] = class_usage
    return summary

def main():
    js_files = gather_js_files()
    if not js_files:
        print("No se encontraron archivos JS en js/ (o la carpeta no existe).")
        sys.exit(1)

    findings = []
    for p in js_files:
        try:
            findings.append(analyze_file(p))
        except Exception as e:
            findings.append({
                'path': str(p),
                'exists': True,
                'error': str(e),
                'issues': [],
                'occurrences': {}
            })

    summary = consolidate(findings)

    report = {
        'meta': {
            'repo_root': str(REPO_ROOT.resolve()),
            'scanned_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
            'js_files_count': len(js_files),
        },
        'summary': summary,
        'files': findings
    }

    # Write JSON
    try:
        OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"✅ Informe generado: {OUTPUT}")
    except Exception as e:
        print("❌ Error escribiendo el JSON:", e)
        sys.exit(2)

if __name__ == '__main__':
    main()