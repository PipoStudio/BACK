# analyze_cart_py.py
# Uso: python analyze_cart_py.py [ruta-del-proyecto]
# Ejemplo: python analyze_cart_py.py .
import os, sys, re, json

root = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
exts = {'.js', '.ts', '.jsx', '.tsx', '.html', '.json'}

patterns = [
    ("localStorage_geekwave_cart", re.compile(r"geekwave_cart")),
    ("localStorage_getItem", re.compile(r"localStorage\.getItem\s*\(\s*['\"`][^'\"`]*['\"`]\s*\)")),
    ("State_getCart", re.compile(r"State\.getCart\s*\(")),
    ("function_getCart_def", re.compile(r"function\s+getCart\s*\(")),
    ("inventario_decl", re.compile(r"\b(let|var|const)\s+inventario\s*=")),
    ("window_inventarioGlobal", re.compile(r"window\.inventarioGlobal\s*=")),
    ("fetch_inventario", re.compile(r"fetch\(\s*['\"`].*inventario\.json['\"`]\s*\)")),
    ("addToCart_def", re.compile(r"function\s+addToCart\s*\(|window\.addToCart\s*=")),
    ("addToCart_call", re.compile(r"\baddToCart\s*\(")),
    ("precio_usd", re.compile(r"precio_usd")),
    ("pago_render", re.compile(r"renderCheckoutCart\b")),
    ("State_saveCart", re.compile(r"State\.saveCart\b")),
]

report = {"root": root, "generated_at": None, "findings": {}, "summary": {}}
report["generated_at"] = __import__('datetime').datetime.utcnow().isoformat() + "Z"
for k, _ in patterns:
    report["findings"][k] = []
    report["summary"][k] = 0

def walk(dirpath):
    for entry in os.scandir(dirpath):
        if entry.is_dir():
            if entry.name in ('node_modules', '.git'): continue
            yield from walk(entry.path)
        else:
            yield entry.path

def read_lines(fp):
    try:
        with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read().splitlines()
    except:
        return None

for f in walk(root):
    if os.path.splitext(f)[1].lower() not in exts:
        continue
    lines = read_lines(f)
    if lines is None: continue
    text = "\n".join(lines)
    for key, regex in patterns:
        for m in regex.finditer(text):
            idx = m.start()
            line_no = text[:idx].count("\n") + 1
            context_start = max(0, line_no - 3) - 1
            context_end = min(len(lines), line_no + 2)
            context = "\n".join(lines[context_start:context_end])
            report["findings"][key].append({
                "file": os.path.relpath(f, root),
                "line": line_no,
                "match": m.group(0).strip(),
                "context": context
            })
            report["summary"][key] += 1

out = os.path.join(root, "analyze_cart_report_py.json")
with open(out, "w", encoding="utf-8") as fo:
    json.dump(report, fo, indent=2, ensure_ascii=False)

print("Report saved to:", out)
for key, count in report["summary"].items():
    print(f"{key}: {count}")
print("Si quieres, adjunta 'analyze_cart_report_py.json' o pega las secciones con matches y te indico la desincronización exacta.")