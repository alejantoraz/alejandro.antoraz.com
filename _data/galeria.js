require('dotenv').config();
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

const s3 = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
});

async function leerTexto(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

module.exports = async function () {
  const bucket = process.env.B2_BUCKET;

  const carpetas = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: '/',
  }));

  const proyectos = [];

  for (const prefijo of carpetas.CommonPrefixes || []) {
    const nombreProyecto = prefijo.Prefix.replace('/', '');

    const archivos = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefijo.Prefix,
    }));

    const claves = (archivos.Contents || []).map(obj => obj.Key);

    const imagenesGrande = claves
      .filter(key => key.includes('-grande/') && /\.(jpe?g|png|webp|gif)$/i.test(key))
      .map(key => `${process.env.B2_ENDPOINT}/${bucket}/${key}`);

    const imagenesMini = claves
      .filter(key => key.includes('-mini/') && /\.(jpe?g|png|webp|gif)$/i.test(key))
      .map(key => `${process.env.B2_ENDPOINT}/${bucket}/${key}`);

    const claveMd = claves.find(key => key.endsWith(`${nombreProyecto}.md`));

    let datos = { titulo: nombreProyecto, año: '', orden: 999, autor_texto: '', portada: '' };
    let descripcionHtml = '';

    if (claveMd) {
      const textoCrudo = await leerTexto(bucket, claveMd);
      const { data, content } = matter(textoCrudo);
      datos = { ...datos, ...data };
      descripcionHtml = md.render(content);
    }

    const portadaExplicita = datos.portada
      ? `${process.env.B2_ENDPOINT}/${bucket}/${datos.portada}`
      : null;

    if (imagenesGrande.length) {
      proyectos.push({
        nombre: nombreProyecto,
        titulo: datos.titulo,
        año: datos.año,
        autor_texto: datos.autor_texto,
        orden: datos.orden,
        portada: portadaExplicita || imagenesMini[0] || imagenesGrande[0],
        imagenes: imagenesGrande,
        imagenesMini,
        descripcionHtml,
      });
    }
  }

  proyectos.sort((a, b) => (a.orden || 999) - (b.orden || 999));

  return proyectos;
};
