// Exportar flipbook.jsx — script para Adobe InDesign
// Exporta todas las páginas del documento activo y las convierte a WebP, listas
// para el visor de flipbook de antoraz.com y alejandro.antoraz.com.
// Resultado: una carpeta "<proyecto>-flipbook" junto al .indd, con 01.webp, 02.webp…
// Esa carpeta se sube tal cual dentro de la carpeta del proyecto en Backblaze.
// Si la conversión falla, se quedan las JPEG (el visor también las acepta).

#target indesign

// Dónde está el conversor a WebP (necesita Node.js instalado en el Mac)
var CONVERSOR = '~/Documents/ilustracion-antoraz/herramientas-flipbook/convertir-webp/convertir-webp.js';
var CALIDAD_WEBP = 82;

(function () {
  if (app.documents.length === 0) { alert('Abre primero el documento que quieres convertir.'); return; }
  var doc = app.activeDocument;
  if (!doc.saved) { alert('Guarda el documento antes de exportar.'); return; }

  // Nombre del proyecto: por defecto, el del archivo, en minúsculas y sin espacios
  var base = doc.name.replace(/\.indd$/i, '');
  var sugerido = base.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  var nombre = prompt(
    'Nombre de la carpeta del proyecto en Backblaze\n' +
    '(se creará "<nombre>-flipbook" junto al documento):',
    sugerido, 'Exportar flipbook');
  if (nombre === null) return;
  nombre = nombre.replace(/^\s+|\s+$/g, '').replace(/-flipbook$/i, '');
  if (!nombre) { alert('El nombre no puede estar vacío.'); return; }

  var carpeta = new Folder(doc.filePath + '/' + nombre + '-flipbook');
  if (carpeta.exists) {
    var viejos = carpeta.getFiles(/\.(jpe?g|png|webp)$/i);
    if (viejos.length) {
      if (!confirm('La carpeta "' + carpeta.name + '" ya tiene ' + viejos.length +
                   ' imágenes.\n¿Borrarlas y exportar de nuevo?')) return;
      for (var v = 0; v < viejos.length; v++) viejos[v].remove();
    }
  } else if (!carpeta.create()) {
    alert('No he podido crear la carpeta:\n' + carpeta.fsName); return;
  }

  // Ajustes de exportación (se guardan y se restauran al terminar)
  var p = app.jpegExportPreferences;
  var antes = {
    jpegExportRange: p.jpegExportRange, pageString: p.pageString,
    exportingSpread: p.exportingSpread, exportResolution: p.exportResolution,
    jpegQuality: p.jpegQuality, jpegColorSpace: p.jpegColorSpace,
    embedColorProfile: p.embedColorProfile, useDocumentBleeds: p.useDocumentBleeds,
    antiAlias: p.antiAlias
  };

  var barra = null;
  var resultadoWebp = '';
  try {
    p.exportingSpread = false;            // páginas sueltas, no pliegos
    p.useDocumentBleeds = false;          // sin sangrado: las páginas encajan en el lomo
    p.exportResolution = 144;             // nítido en pantallas Retina sin pesar demasiado
    p.jpegQuality = JPEGOptionsQuality.HIGH;
    p.jpegColorSpace = JpegColorSpaceEnum.RGB;
    p.embedColorProfile = true;
    p.antiAlias = true;
    p.jpegExportRange = ExportRangeOrAllPages.EXPORT_RANGE;

    var total = doc.pages.length;
    var cifras = String(total).length < 2 ? 2 : String(total).length;

    barra = new Window('palette', 'Exportar flipbook');
    var texto = barra.add('statictext', undefined, 'Exportando página 1 de ' + total);
    texto.preferredSize.width = 260;
    var progreso = barra.add('progressbar', undefined, 0, total);
    progreso.preferredSize.width = 260;
    barra.show();

    for (var i = 0; i < total; i++) {
      var n = String(i + 1);
      while (n.length < cifras) n = '0' + n;
      texto.text = 'Exportando página ' + (i + 1) + ' de ' + total;
      progreso.value = i;
      barra.update();
      p.pageString = '+' + (i + 1);       // número absoluto, ignora secciones y numeración
      doc.exportFile(ExportFormat.JPG, new File(carpeta.fsName + '/' + n + '.jpg'), false);
    }

    // Conversión a WebP
    texto.text = 'Convirtiendo a WebP…';
    progreso.value = total;
    barra.update();
    var conversor = new File(CONVERSOR);
    if (!conversor.exists) {
      resultadoWebp = 'No encuentro el conversor a WebP; las páginas se quedan en JPEG.\n(' + conversor.fsName + ')';
    } else {
      var comillas = function (t) { return t.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
      var orden = 'do shell script "export PATH=/usr/local/bin:/opt/homebrew/bin:$PATH; node " & ' +
        'quoted form of "' + comillas(conversor.fsName) + '" & " " & ' +
        'quoted form of "' + comillas(carpeta.fsName) + '" & " --calidad ' + CALIDAD_WEBP + ' --borrar 2>&1"';
      try {
        resultadoWebp = String(app.doScript(orden, ScriptLanguage.APPLESCRIPT_LANGUAGE) || 'Convertidas a WebP.');
      } catch (eWebp) {
        resultadoWebp = 'No se ha podido convertir a WebP; las páginas se quedan en JPEG.\n' + eWebp;
      }
    }
    barra.close(); barra = null;
  } catch (e) {
    alert('Error al exportar:\n' + e);
    return;
  } finally {
    if (barra) { try { barra.close(); } catch (e3) {} }
    for (var k in antes) { try { p[k] = antes[k]; } catch (e2) {} }
  }

  alert(total + ' páginas exportadas en:\n' + carpeta.fsName +
        '\n\n' + resultadoWebp +
        '\n\nSube la carpeta "' + carpeta.name + '" dentro de la carpeta "' +
        nombre + '" del bucket y vuelve a desplegar la web.');
  carpeta.execute();                      // la abre en el Finder
})();
