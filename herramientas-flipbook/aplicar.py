#!/usr/bin/env python3
"""Añade el visor de flipbook a una de las webs (antoraz.com o alejandro.antoraz.com).
Uso: python3 aplicar.py RUTA_DEL_PROYECTO
Es idempotente: si ya está aplicado, no cambia nada."""
import shutil, sys
from pathlib import Path

PAQUETE = Path(__file__).resolve().parent

BLOQUE = '''{% if proyecto.flipbook and proyecto.flipbook.length %}
<link rel="stylesheet" href="/flipbook/flipbook.css">
<section class="flipbook" tabindex="0" aria-label="{{ proyecto.titulo or proyecto.nombre }}: documento">
  <script type="application/json">{{ proyecto.flipbook | dump | safe }}</script>
  <div class="flipbook-escenario"><div class="flipbook-libro"></div></div>
  <div class="flipbook-controles">
    <button type="button" class="flipbook-ant" aria-label="Página anterior">&lsaquo;</button>
    <span class="flipbook-contador">1 / {{ proyecto.flipbook.length }}</span>
    <button type="button" class="flipbook-sig" aria-label="Página siguiente">&rsaquo;</button>
  </div>
</section>
<script src="/flipbook/flipbook.js" defer></script>
{% endif %}
'''
web = Path(sys.argv[1]).resolve()

def parchear(ruta, cambios):
    texto = ruta.read_text(encoding='utf-8')
    original = texto
    for buscar, poner, marca in cambios:
        if marca in texto:
            continue
        if buscar not in texto:
            sys.exit(f'ERROR: no encuentro en {ruta.name}:\n{buscar}')
        texto = texto.replace(buscar, poner, 1)
    if texto != original:
        ruta.write_text(texto, encoding='utf-8')
        print('modificado:', ruta.relative_to(web))
    else:
        print('sin cambios:', ruta.relative_to(web))

# 1. galeria.js: reconocer la subcarpeta *-flipbook/
parchear(web / '_data/galeria.js', [
    ("    const claveMd =",
     "    const numeroPagina = key => {\n"
     "      const n = key.split('/').pop().match(/(\\d+)\\D*$/);\n"
     "      return n ? parseInt(n[1], 10) : 0;\n"
     "    };\n\n"
     "    const paginasFlipbook = claves\n"
     "      .filter(key => key.includes('-flipbook/') && /\\.(jpe?g|png|webp)$/i.test(key))\n"
     "      .sort((a, b) => numeroPagina(a) - numeroPagina(b))\n"
     "      .map(key => `${process.env.B2_ENDPOINT}/${bucket}/${key}`);\n\n"
     "    const claveMd =",
     "paginasFlipbook"),
    ("    if (imagenesGrande.length) {",
     "    if (imagenesGrande.length || paginasFlipbook.length) {",
     "imagenesGrande.length || paginasFlipbook.length"),
    ("portada: portadaExplicita || imagenesMini[0] || imagenesGrande[0],",
     "portada: portadaExplicita || imagenesMini[0] || imagenesGrande[0] || paginasFlipbook[0],",
     "|| paginasFlipbook[0]"),
    ("        imagenesMini,\n",
     "        imagenesMini,\n        flipbook: paginasFlipbook,\n",
     "flipbook: paginasFlipbook"),
])

# 2. proyecto.njk: el visor va entre el texto y las fotos
bloque = BLOQUE
parchear(web / 'proyecto.njk', [
    ('<div class="fotos-proyecto">', bloque + '\n<div class="fotos-proyecto">', 'class="flipbook"'),
])

# 3. .eleventy.js: copiar la carpeta flipbook/ a la web publicada
parchear(web / '.eleventy.js', [
    ('module.exports = function (eleventyConfig) {\n',
     'module.exports = function (eleventyConfig) {\n  eleventyConfig.addPassthroughCopy("flipbook");\n',
     'addPassthroughCopy("flipbook")'),
])

# 4. archivos del visor
destino = web / 'flipbook'
destino.mkdir(exist_ok=True)
for f in ['flipbook.js', 'flipbook.css', 'page-flip.browser.js', 'page-flip.LICENSE']:
    shutil.copy2(PAQUETE / 'flipbook' / f, destino / f)
print('copiado: flipbook/')
print('Listo.')
