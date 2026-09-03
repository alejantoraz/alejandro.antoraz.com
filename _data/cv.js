require('dotenv').config();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
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

module.exports = async function () {
  const bucket = process.env.B2_BUCKET;
  const clave = 'cv-ilustracion.md';

  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: clave }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  const textoCrudo = Buffer.concat(chunks).toString('utf-8');

  const { data, content } = matter(textoCrudo);

  return {
    titulo: data.titulo || 'alejandro antoraz alonso',
    cvHtml: md.render(content),
  };
};
