/* =========================================
   GEEKWAVE PRODUCT DETAIL (final, integrado)
   ========================================= */

let productoActual = null;
let varianteActual = null;
let selectedPlan = "standard";
let quantity = 1;
let selectedColor = null;

/* ========== HELPERS ========== */

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function getCurrentPrice() {
  if (varianteActual?.precio_usd) return Number(varianteActual.precio_usd);
  return Number(productoActual?.precio_usd || 0);
}

/* ========== GALLERY ========== */

function renderGallery(images = []) {
  const galleryThumbs = document.getElementById("galleryThumbs");
  const mainImage = document.getElementById("mainProductImage");
  if (!galleryThumbs || !mainImage) return;

  galleryThumbs.innerHTML = "";

  const imgs = images && images.length ? images : (productoActual?.imagenes?.length ? productoActual.imagenes : (productoActual?.imagen_principal ? [productoActual.imagen_principal] : []));

  if (!imgs.length) {
    mainImage.src = productoActual?.imagen_principal || "";
    return;
  }

  mainImage.src = imgs[0];

  imgs.forEach((imgUrl, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = `thumb ${index === 0 ? "active" : ""}`;
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = `${productoActual?.nombre || "Imagen"} ${index + 1}`;
    thumb.appendChild(img);

    thumb.addEventListener("click", () => {
      mainImage.src = imgUrl;
      document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
    });

    galleryThumbs.appendChild(thumb);
  });
}

/* ========== VARIANTES ========== */

function renderVariants() {
  const container = document.getElementById("flavorContainer");
  const section = document.getElementById("variantSection");
  if (!container) return;

  const variantes = productoActual?.variantes || [];

  if (!variantes.length) {
    container.innerHTML = "";
    if (section) section.style.display = "none";
    return;
  }

  if (section) section.style.display = "";

  container.innerHTML = "";

  variantes.forEach(variant => {
    const button = document.createElement("button");
    button.type = "button";

    const isActive = varianteActual
      ? (variant.id !== undefined ? String(varianteActual.id) === String(variant.id) : varianteActual.nombre === variant.nombre)
      : false;

    button.className = `flavor-btn ${isActive ? "active" : ""}`;
    button.innerHTML = `<span>${variant.nombre}</span>`;

    button.addEventListener("click", () => {
      varianteActual = variant;
      if (variant.color) selectedColor = variant.color;
      updateVariantUI();
      renderVariants();
    });

    container.appendChild(button);
  });
}

/* ========== HIGHLIGHTS ========== */

function renderHighlights(data) {
  const highlightsList = document.getElementById("highlightsList");
  const highlightsSection = document.getElementById("highlightsSection");
  if (!highlightsList) {
    if (highlightsSection) highlightsSection.style.display = "none";
    return;
  }

  highlightsList.innerHTML = "";

  if (Array.isArray(data.highlights) && data.highlights.length) {
    data.highlights.forEach(h => {
      const li = document.createElement("li");
      li.textContent = h;
      highlightsList.appendChild(li);
    });
    if (highlightsSection) highlightsSection.style.display = "";
    return;
  }

  const tech = data.technical || {};
  const bullets = [];

  if (tech.fpga) bullets.push(`Arquitectura FPGA: ${tech.fpga}`);
  if (tech.cpu || tech.gpu) bullets.push([tech.cpu, tech.gpu].filter(Boolean).join(" / "));
  if (tech.display) {
    const d = tech.display;
    const size = d.tamaño_pulgadas ? `${d.tamaño_pulgadas}"` : "";
    const res = d.resolucion || "";
    const ppi = d.ppi ? ` (${d.ppi} ppi)` : "";
    bullets.push(`Pantalla: ${size} ${res}${ppi}`.trim());
  }
  if (tech.autonomia) bullets.push(`Autonomía: ${tech.autonomia}`);
  if (tech.build) bullets.push(`Construcción: ${tech.build}`);

  if (!bullets.length && data.descripcion_tecnica) {
    bullets.push(data.descripcion_tecnica.split(".").slice(0, 2).join(".") + ".");
  }

  if (bullets.length) {
    bullets.forEach(b => {
      const li = document.createElement("li");
      li.textContent = b;
      highlightsList.appendChild(li);
    });
    if (highlightsSection) highlightsSection.style.display = "";
  } else {
    const li = document.createElement("li");
    li.textContent = "Información técnica no disponible.";
    highlightsList.appendChild(li);
    if (highlightsSection) highlightsSection.style.display = "";
  }
}

/* ========== COLORS ========== */

function normalizeColorsField(data) {
  const raw = data.colores || data.color || "";
  if (Array.isArray(raw)) return raw.map(c => String(c).trim()).filter(Boolean);
  if (!raw) return [];
  const s = String(raw)
    .replace(/\s*\/\s*/g, ",")
    .replace(/\s*\\\s*/g, ",")
    .replace(/\s+\by\b\s+/gi, ",")
    .replace(/\s*,\s*/g, ",");
  return s.split(",").map(c => c.trim()).filter(Boolean);
}

function renderColors(data) {
  try {
    const colorContainer = document.getElementById("colorOptions");
    if (!colorContainer) return;

    const colores = normalizeColorsField(data || {});

    colorContainer.innerHTML = "";

    if (!colores.length) {
      colorContainer.style.display = "none";
      return;
    }

    colorContainer.style.display = "";

    const colorMap = {
      "black": "#0b0b0b",
      "charcoal black": "#111113",
      "piano black": "#0a0a0a",
      "onyx black": "#0b0b0b",
      "white": "#f7f7f7",
      "polar white": "#fbfbfc",
      "classic white": "#f5f5f5",
      "ceramic white": "#f2f2f0",
      "pearl white": "#f7f7f6",
      "satin silver": "#bfbfbf",
      "silver": "#cfcfcf",
      "graphite": "#3f3f46",
      "red": "#d13434",
      "crimson red": "#b71c1c",
      "electric blue": "#0074ff",
      "indigo": "#4b0082",
      "mystic silver": "#c7c9cc",
      "pearl": "#f6f5f3",
      "coral pink": "#ff6f61"
    };

    function pickHex(name) {
      if (!name) return null;
      const key = String(name).toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (colorMap[key]) return colorMap[key];
      for (const k in colorMap) if (key.includes(k)) return colorMap[k];
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(name).trim())) return String(name).trim();
      return null;
    }

    function hexToRgba(hex, alpha = 0.18) {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(s => s + s).join('');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    colores.forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";

      // compatible con ambos estilos que hemos hablado
      btn.classList.add("color-chip");
      btn.classList.add("color-btn");

      const isActive = (selectedColor && String(selectedColor).toLowerCase() === String(c).toLowerCase()) || (!selectedColor && idx === 0);
      if (isActive) btn.classList.add("active");
      btn.dataset.color = c;
      btn.setAttribute("aria-label", `Color ${c}`);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");

      const hex = pickHex(c);
      const rgba = hex ? hexToRgba(hex, 0.20) : 'rgba(255,255,255,0.05)';

      btn.style.setProperty('--chip-color', hex || 'rgba(255,255,255,0.12)');
      btn.style.setProperty('--chip-rgba', rgba);

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      if (hex) swatch.style.background = hex;
      else swatch.classList.add("empty");

      const label = document.createElement("span");
      label.className = "color-label";
      label.textContent = c;

      const left = document.createElement("span");
      left.className = "left";
      left.appendChild(swatch);
      left.appendChild(label);

      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = ""; // keep clean

      btn.appendChild(left);
      btn.appendChild(meta);

      btn.addEventListener("click", () => {
        colorContainer.querySelectorAll(".color-chip, .color-btn").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        selectedColor = c;

        try {
          const variantes = productoActual?.variantes || [];
          const match = variantes.find(v => v.color && String(v.color).toLowerCase() === String(c).toLowerCase());
          if (match) varianteActual = match;
        } catch (e) {
          console.warn("Error matching variant by color:", e);
        }

        updateVariantUI();
        renderVariants();
      });

      colorContainer.appendChild(btn);
    });

    if (!selectedColor) selectedColor = colores[0];

    // center active chip
   try {
  const active = colorContainer.querySelector(".color-chip.active, .color-btn.active");
  if (active) {
    // Centrar horizontalmente sin cambiar el scroll vertical de la página
    const containerRect = colorContainer.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset = (activeRect.left + activeRect.width / 2) - (containerRect.left + containerRect.width / 2);
    // Ajuste directo del scrollLeft; no cambia scrollTop de la página
    // Usamos un pequeño easing para que no sea brusco
    const start = colorContainer.scrollLeft;
    const target = start + offset;
    const duration = 180;
    let startTime = null;
    function animate(t) {
      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // ease-in-out
      colorContainer.scrollLeft = start + (target - start) * ease;
      if (progress < 1) window.requestAnimationFrame(animate);
    }
    window.requestAnimationFrame(animate);
  }
} catch (e) { /* ignore */ }

  } catch (err) {
    console.error("renderColors error:", err);
  }
}

/* ========== QUICK SPECS ========== */

function extractResolutionAndPPI(text) {
  if (!text) return {};
  const resMatch = text.match(/(\d{2,4}\s*[×xX]\s*\d{2,4})/);
  const ppiMatch = text.match(/(\d{2,4})\s*ppi/i);
  return {
    resolucion: resMatch ? resMatch[1].replace(/\s+/g, "") : null,
    ppi: ppiMatch ? Number(ppiMatch[1]) : null
  };
}
/* ========== QUICK SPECS (reemplazo, evita rótulos vacíos) ========== */
function renderQuickSpecs(data) {
  const displaySpec = document.getElementById("displaySpec");
  const densitySpec = document.getElementById("densitySpec");
  const autonomySpec = document.getElementById("autonomySpec");

  const techFpga = document.getElementById("techFpga");
  const techCpuGpu = document.getElementById("techCpuGpu");
  const techBuild = document.getElementById("techBuild");
  const technicalGrid = document.getElementById("technicalGrid");

  const quickSpecsSection = document.getElementById("quickSpecsSection"); // contenedor principal (añade id si no existe)
  // si no tienes un contenedor, puedes usar technicalGrid o un padre conocido

  const tech = (data && data.technical) ? data.technical : {};

  // Extraer/display info
  let displayText = "";
  let densityText = "";
  let autonomyText = "";

  if (tech.display) {
    const d = tech.display;
    const size = d.tamaño_pulgadas ? `${d.tamaño_pulgadas}"` : "";
    const res = d.resolucion || "";
    displayText = `${size} ${res}`.trim();
    densityText = d.ppi ? `${d.ppi} PPI` : "";
  } else {
    const fromSpecs = extractResolutionAndPPI(data.especificaciones || data.descripcion_tecnica || "");
    displayText = fromSpecs.resolucion ? fromSpecs.resolucion : "";
    densityText = fromSpecs.ppi ? `${fromSpecs.ppi} PPI` : "";
  }

  autonomyText = tech.autonomia || tech.battery || (data.especificaciones?.match(/\d+\s*mh?a?h?/i) ? (data.especificaciones.match(/\d+\s*mh?a?h?/i)[0]) : "") || "";

  // Technical fields
  const fpgaText = tech.fpga || tech.fpga_model || "";
  const cpuGpuText = [tech.cpu || "", tech.gpu || ""].filter(Boolean).join(" / ");
  const buildText = tech.build || tech.construction || tech.material || "";

  // Decide si hay contenido significativo en esta sección
  const hasDisplay = Boolean(displayText);
  const hasDensity = Boolean(densityText);
  const hasAutonomy = Boolean(autonomyText);
  const hasTech = Boolean(fpgaText || cpuGpuText || buildText);

  const hasAny = hasDisplay || hasDensity || hasAutonomy || hasTech;

  // If there is a quickSpecsSection container, show/hide it based on content.
  // If not, try to use technicalGrid as fallback.
  const container = quickSpecsSection || technicalGrid || document.getElementById("technicalSection");
  if (container) {
    if (!hasAny) {
      container.setAttribute("aria-hidden", "true");
      container.style.display = "none";
    } else {
      container.removeAttribute("aria-hidden");
      container.style.display = "";
    }
  }

  // Fill or clear individual fields and hide their row if empty (if row elements exist)
  function setField(el, value) {
    if (!el) return;
    el.textContent = value || "";
    // try to hide the row if exists: assume each field is inside an element with class .spec-row
    const row = el.closest && el.closest(".spec-row");
    if (row) {
      if (!value) row.style.display = "none";
      else row.style.display = "";
    }
  }

  setField(displaySpec, displayText);
  setField(densitySpec, densityText);
  setField(autonomySpec, autonomyText);
  setField(techFpga, fpgaText);
  setField(techCpuGpu, cpuGpuText);
  setField(techBuild, buildText);

  // Fallback: if no technical bullets exist, ensure highlights show a helpful message
  if (!hasAny) {
    // renderHighlights will already handle description_tecnica fallback; nothing more to do here
  }
}

/* ========== VARIANT UI ========== */

function updateVariantUI() {
  const description = document.getElementById("productDescription");
  const longDescription = document.getElementById("productLongDescription");
  const basePrice = document.getElementById("basePrice");
  const bundlePrice = document.getElementById("bundlePrice");

  const data = varianteActual || productoActual;
  if (!data) return;

  const images = data.imagenes?.length ? data.imagenes : (data.imagen_principal ? [data.imagen_principal] : []);
  renderGallery(images);

  if (description) description.textContent = data.descripcion || productoActual?.descripcion_tecnica || "";
  if (longDescription) longDescription.textContent = data.especificaciones || data.descripcion_tecnica || "";

  const currentPrice = getCurrentPrice();
  if (basePrice) basePrice.textContent = formatPrice(currentPrice);

  const bundleExtra = Number(productoActual?.technical?.bundle_extra_price || productoActual?.technical?.bundle_extra || 50);
  if (bundlePrice) bundlePrice.textContent = formatPrice(currentPrice + bundleExtra);

  renderHighlights(data);
  renderColors(data);
  renderQuickSpecs(data);

  const productTag = document.getElementById("productTag");
  if (productTag) {
    const fpga = productoActual?.technical?.fpga || productoActual?.technical?.fpga_model;
    productTag.textContent = fpga ? "FPGA NATIVE SYSTEM" : "";
  }
}

/* ========== BENEFITS / PLAN DETAILS ========== */

function renderPlanDetails() {
  const benefitsList = document.getElementById("benefitsList");
  const cartButton = document.getElementById("cartButton");

  let productBenefits = [];
  if (Array.isArray(productoActual?.highlights) && productoActual.highlights.length) {
    productBenefits = productoActual.highlights.slice(0, 3);
  } else if (productoActual?.technical) {
    const t = productoActual.technical;
    if (t.display) productBenefits.push(`Pantalla: ${t.display.tamaño_pulgadas || ""}" ${t.display.resolucion || ""}`.trim());
    if (t.fpga) productBenefits.push(`Arquitectura: ${t.fpga}`);
    if (t.autonomia) productBenefits.push(`Autonomía: ${t.autonomia}`);
  }

  if (!productBenefits.length) {
    productBenefits = ["Producto principal", "Verificado antes del envío", "Empaque seguro"];
  }

  const plans = {
    standard: { buttonText: "AÑADIR AL CARRITO", benefits: productBenefits },
    bundle: { buttonText: "AÑADIR AL CARRITO", benefits: productBenefits.concat(["Accesorios adicionales (si aplica)", "Empaque seguro"]) }
  };

  const plan = plans[selectedPlan] || plans.standard;

  if (benefitsList) benefitsList.innerHTML = plan.benefits.map(item => `<li>${item}</li>`).join("");
  if (cartButton) cartButton.innerHTML = `<span>${plan.buttonText}</span>`;
}

/* ---------- Recomendaciones dinámicas: Complementa tu setup ---------- */

/**
 * Devuelve hasta `limit` productos recomendados a partir del inventario y el producto actual.
 * Heurística:
 *  1) misma subcategoria (más prioridad)
 *  2) misma categoria
 *  3) proximidad de precio (precio_usd)
 *  4) fallback por precio/orden
 */
function getRecommendedProducts(inventario, producto, limit = 3) {
  if (!Array.isArray(inventario) || !producto) return [];
  const pid = String(producto.id);
  const cat = producto.categoria || '';
  const sub = producto.subcategoria || '';
  const price = Number(producto.precio_usd || producto.precio || 0);

  const candidates = inventario.filter(p => String(p.id) !== pid);

  const scored = candidates.map(p => {
    let score = 0;
    if (p.subcategoria && sub && String(p.subcategoria) === String(sub)) score += 100;
    else if (p.categoria && cat && String(p.categoria) === String(cat)) score += 50;

    const pPrice = Number(p.precio_usd || p.precio || 0);
    const priceDiff = Math.abs((price || 0) - (pPrice || 0));
    const priceBonus = price === 0 ? 0 : Math.max(0, 20 - Math.min(20, Math.round(priceDiff / Math.max(1, price || 1))));
    score += priceBonus;

    if (p.ao) score += Math.min(10, Number(p.ao) ? (Number(p.ao) % 100) / 10 : 0);

    return { p, score, priceDiff };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.priceDiff - b.priceDiff;
  });

  const top = scored.slice(0, limit).map(s => s.p);
  if (top.length >= limit) return top;

  const used = new Set(top.map(x => String(x.id)));
  const remaining = candidates.filter(p => !used.has(String(p.id)));
  remaining.sort((a,b) => (Number(a.precio_usd||0) - Number(b.precio_usd||0)));
  const fill = remaining.slice(0, limit - top.length);
  return top.concat(fill);
}

/**
 * Renderiza los productos recomendados dentro de .related-grid
 * Reemplaza su contenido actual.
 */
function renderRelatedProducts(recommended) {
  const grid = document.querySelector('.related-grid');
  if (!grid) return;

  if (!recommended || recommended.length === 0) {
    grid.innerHTML = `<div style="color:var(--text-muted); padding: 24px;">No hay recomendaciones disponibles para este producto.</div>`;
    return;
  }

  grid.innerHTML = recommended.map(prod => {
    const imagen = prod.imagen_principal || (Array.isArray(prod.imagenes) && prod.imagenes[0]) || 'https://placehold.co/400x400/png?text=No+Image';
    const nombre = (prod.nombre || 'Producto').replace(/"/g, '&quot;');
    const precio = prod.precio_usd ? `$${Number(prod.precio_usd).toFixed(2)}` : (prod.precio ? `$${prod.precio}` : '');
    return `
      <article class="related-card">
        <div class="related-image"><img src="${imagen}" alt="${nombre}"></div>
        <div class="related-content">
          <span class="related-category">${prod.categoria || ''}</span>
          <h3>${nombre}</h3>
          <p class="related-price">${precio}</p>
          <a href="info.html?id=${prod.id}" class="related-btn">Ver producto</a>
        </div>
      </article>
    `;
  }).join('');
}


/* ========== PRODUCT LOAD ========== */
async function loadProduct() {
  try {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    if (!productId) return;

    const response = await fetch("json/inventario.json");
    const data = await response.json();

    // CORRECCIÓN AQUÍ: Extraemos el array plano de productos de forma segura
    const inventario = (data && data.productos) ? data.productos : data;

    const producto = inventario.find(p => String(p.id) === String(productId));
    if (!producto) {
      console.error("Producto no encontrado");
      return;
    }

    // ==== TODO TU CÓDIGO ORIGINAL CONTINÚA IGUAL DESDE AQUÍ ====
    producto.technical = producto.technical || {};
    if (!producto.colores && producto.color) producto.colores = normalizeColorsField(producto);

    productoActual = producto;

    selectedColor = productoActual.colores?.[0] || productoActual.color || null;

    if (producto.variantes && producto.variantes.length) {
      varianteActual = producto.variantes[0];
      if (varianteActual.color) selectedColor = varianteActual.color;
    } else {
      varianteActual = null;
    }

    const title = document.getElementById("productTitle");
    if (title) title.textContent = producto.nombre || "Producto";

    updateVariantUI();
    renderVariants();
    renderPlanDetails();
    // --- Generar y renderizar recomendaciones dinámicas ---
try {
  // 'inventario' es la variable local que ya cargaste arriba en loadProduct()
  const recos = getRecommendedProducts(inventario, producto, 3); // cambias 3 por el número deseado
  renderRelatedProducts(recos);
} catch (e) {
  console.warn('No fue posible generar recomendaciones dinámicas:', e);
}
  } catch (error) {
    console.error("Error cargando producto:", error);
  }
}

/* ========== QUANTITY ========== */

function setupQuantityControls() {
  const increaseBtn = document.getElementById("increaseQty");
  const decreaseBtn = document.getElementById("decreaseQty");
  const quantityValue = document.getElementById("quantityValue");
  if (!increaseBtn || !decreaseBtn || !quantityValue) return;

  increaseBtn.addEventListener("click", () => { quantity++; quantityValue.textContent = String(quantity); });
  decreaseBtn.addEventListener("click", () => { if (quantity > 1) { quantity--; quantityValue.textContent = String(quantity); } });
}

/* ========== CONFIG SELECTOR ========== */

function setupPlanSelectors() {
  document.querySelectorAll(".config-option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".config-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPlan = btn.dataset.plan || "standard";
      renderPlanDetails();
    });
  });
}

/* ========== CART ========== */

function setupCartButton() {
  const cartButton = document.getElementById("cartButton");
  if (!cartButton) return;

  // Guardar el contenido original para restaurarlo exactamente
  const originalHTML = cartButton.innerHTML;

  cartButton.addEventListener("click", () => {
    if (!productoActual) return;

    const itemName = varianteActual ? `${productoActual.nombre} - ${varianteActual.nombre}` : productoActual.nombre;

    // Llamada correcta a addToCart (id, nombre, qty)
    if (typeof window.addToCart === "function") {
      window.addToCart(productoActual.id, itemName, quantity);
    }

    // Cambiar estado visual del botón: texto y clase
    cartButton.classList.add("adding");
    // Cambiamos solo el texto visible (si la estructura es <span>...</span>, mantenemos el icono si existe)
    // Intentamos sacar el span interno si existe
    const span = cartButton.querySelector("span");
    if (span) {
      span.textContent = "Añadiendo...";
    } else {
      cartButton.textContent = "Añadiendo...";
    }

    // Restaurar cuando llegue el evento cartUpdated o tras un timeout de seguridad
    const onUpdated = () => {
      cartButton.classList.remove("adding");
      cartButton.innerHTML = originalHTML;
      window.removeEventListener("cartUpdated", onUpdated);
      // limpiar posible timeout
      if (cartButton._restoreTimeout) {
        clearTimeout(cartButton._restoreTimeout);
        delete cartButton._restoreTimeout;
      }
    };

    // Listener único (se quita en onUpdated)
    window.addEventListener("cartUpdated", onUpdated, { once: true });

    // Fallback: si no llega cartUpdated por alguna razón, restaurar en 1400ms
    if (cartButton._restoreTimeout) clearTimeout(cartButton._restoreTimeout);
    cartButton._restoreTimeout = setTimeout(() => {
      // Solo restaurar si sigue en estado adding
      if (cartButton.classList.contains("adding")) onUpdated();
    }, 1400);
  });
}
/* ========== INIT ========== */

document.addEventListener("DOMContentLoaded", async () => {
  setupQuantityControls();
  setupPlanSelectors();
  setupCartButton();
  await loadProduct();
});