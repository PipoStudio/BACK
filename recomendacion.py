#!/usr/bin/env python3
"""
Genera recomendaciones automáticas a partir de json/inventario.json.

Salida por defecto: json/recommendations.json
Formato de salida:
{
  "<product_id>": [
     "<recommended_id_1>",
     "<recommended_id_2>",
     "<recommended_id_3>"
  ],
  ...
}

Uso:
  python3 scripts/generate_recommendations.py \
    --input json/inventario.json \
    --output json/recommendations.json \
    --limit 3

Opciones:
  --input   Ruta al inventario (array o { "productos": [...] })
  --output  Ruta de salida (JSON)
  --limit   Número de recomendaciones por producto (default: 3)
  --full    Si se incluye, escribe objetos completos en vez de solo ids
  --verbose Muestra logs
"""
from __future__ import annotations
import json
import math
from pathlib import Path
import argparse
from typing import List, Dict, Any, Tuple

def load_inventory(path: Path) -> List[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data, dict) and 'productos' in data and isinstance(data['productos'], list):
        return data['productos']
    if isinstance(data, list):
        return data
    raise ValueError("Formato de inventario no reconocido. Debe ser array o {'productos': [...]}")

def numeric_price(p: Dict[str, Any]) -> float:
    try:
        return float(p.get('precio_usd') or p.get('precio') or 0)
    except Exception:
        return 0.0

def ao_score(p: Dict[str, Any]) -> float:
    ao = p.get('ao') or p.get('year') or p.get('anio')
    try:
        v = float(ao)
        # pequeña transformación para que años mayores sumen más, pero acotado
        return min(10.0, (v % 100) / 10.0)
    except Exception:
        return 0.0

def score_candidate(base: Dict[str, Any], cand: Dict[str, Any]) -> Tuple[float, float]:
    """
    Devuelve (score, priceDiff) donde score mayor = más relevante,
    priceDiff usado para desempate (menor mejor).
    """
    score = 0.0
    sub_base = (base.get('subcategoria') or '').strip()
    cat_base = (base.get('categoria') or '').strip()
    sub_cand = (cand.get('subcategoria') or '').strip()
    cat_cand = (cand.get('categoria') or '').strip()

    if sub_base and sub_cand and sub_base == sub_cand:
        score += 100.0
    elif cat_base and cat_cand and cat_base == cat_cand:
        score += 50.0

    price_base = numeric_price(base)
    price_cand = numeric_price(cand)
    price_diff = abs(price_base - price_cand)

    # bonus por proximidad relativa de precio (hasta 20)
    if price_base > 0:
        price_bonus = max(0, 20 - min(20, round(price_diff / max(1.0, price_base))))
    else:
        # si price_base == 0, no bonificación
        price_bonus = 0
    score += price_bonus

    # pequeño bonus por "ao" si existe
    score += ao_score(cand)

    return score, price_diff

def generate_recommendations(inventario: List[Dict[str, Any]], limit: int = 3, verbose: bool=False, full_objects: bool=False) -> Dict[str, List[Any]]:
    # Precompute ids as strings for stable keys
    id_map = { str(p.get('id')): p for p in inventario }
    recommendations: Dict[str, List[Any]] = {}

    for pid, product in id_map.items():
        candidates = [c for cid, c in id_map.items() if cid != pid]
        scored = []
        for c in candidates:
            s, pd = score_candidate(product, c)
            scored.append((s, pd, c))
        # ordenar por score desc, priceDiff asc
        scored.sort(key=lambda x: (-x[0], x[1]))
        top = scored[:limit]
        if full_objects:
            recommendations[pid] = [ item[2] for item in top ]
        else:
            recommendations[pid] = [ str(item[2].get('id')) for item in top ]
        if verbose:
            print(f"[{pid}] {product.get('nombre','<no-name>')} -> {[str(x.get('id')) for (_,_,x) in top]}")

    return recommendations

def main():
    parser = argparse.ArgumentParser(description="Genera recommendations.json desde inventario.json")
    parser.add_argument('--input', '-i', required=True, help='Ruta al inventario json (array o {productos:[]})')
    parser.add_argument('--output', '-o', required=True, help='Ruta de salida recommendations.json')
    parser.add_argument('--limit', '-n', type=int, default=3, help='Número de recomendaciones por producto')
    parser.add_argument('--full', action='store_true', help='Escribir objetos completos en vez de solo ids')
    parser.add_argument('--verbose', '-v', action='store_true', help='Modo verbose')
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"ERROR: input file {input_path} no existe.")
        return

    inventario = load_inventory(input_path)
    recos = generate_recommendations(inventario, limit=args.limit, verbose=args.verbose, full_objects=args.full)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(recos, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Recomendaciones generadas: {output_path} (limit={args.limit}, full={args.full})")

if __name__ == '__main__':
    main()