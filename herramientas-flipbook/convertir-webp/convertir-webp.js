#!/usr/bin/env node
// Convierte a WebP las imágenes JPEG y PNG de una carpeta (sin entrar en subcarpetas).
// Uso: node convertir-webp.js CARPETA [--calidad 82] [--borrar]
//   --calidad N  calidad WebP de 1 a 100 (por defecto 82)
//   --borrar     borra cada original después de convertirlo correctamente
// Las imágenes se pasan a sRGB y llevan el perfil incrustado, para que el color
// se vea igual en todos los navegadores.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const args = process.argv.slice(2);
const carpeta = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a));
const iCal = args.indexOf('--calidad');
const calidad = iCal >= 0 ? parseInt(args[iCal + 1], 10) : 82;
const borrar = args.includes('--borrar');

if (!carpeta || !fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
  console.error('No encuentro la carpeta: ' + carpeta);
  process.exit(1);
}
if (!(calidad >= 1 && calidad <= 100)) {
  console.error('La calidad tiene que estar entre 1 y 100.');
  process.exit(1);
}

const mb = n => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';

(async () => {
  const archivos = fs.readdirSync(carpeta)
    .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  if (!archivos.length) {
    console.error('No hay imágenes JPEG ni PNG en la carpeta.');
    process.exit(1);
  }

  // Todo o nada: si una imagen falla, se borran las WebP creadas y los originales quedan intactos
  let antes = 0, despues = 0;
  const creadas = [];
  try {
    for (const f of archivos) {
      const origen = path.join(carpeta, f);
      const destino = path.join(carpeta, f.replace(/\.(jpe?g|png)$/i, '.webp'));
      await sharp(origen)
        .toColourspace('srgb')
        .withIccProfile('srgb')
        .webp({ quality: calidad, effort: 5, smartSubsample: true })
        .toFile(destino);
      creadas.push(destino);
      antes += fs.statSync(origen).size;
      despues += fs.statSync(destino).size;
    }
  } catch (e) {
    creadas.forEach(d => { try { fs.unlinkSync(d); } catch (_) {} });
    throw e;
  }
  if (borrar) archivos.forEach(f => fs.unlinkSync(path.join(carpeta, f)));

  const ahorro = Math.round((1 - despues / antes) * 100);
  console.log(`${archivos.length} imágenes convertidas: ${mb(antes)} → ${mb(despues)} (${ahorro} % menos).`);
})().catch(e => {
  console.error('Error al convertir: ' + e.message);
  process.exit(1);
});
