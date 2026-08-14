const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const UPSTREAM = 'https://agate-precocerto-smart-calc.base44.app';
const root = __dirname;

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[ext] || 'application/octet-stream';
}

async function proxy(req, res) {
  const target = UPSTREAM + req.url;
  const headers = {...req.headers};
  delete headers.host;
  delete headers['content-length'];
  headers['x-forwarded-host'] = req.headers.host || '';
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks=[];
    for await (const c of req) chunks.push(c);
    body = Buffer.concat(chunks);
  }
  try {
    const r = await fetch(target, {method:req.method, headers, body, redirect:'manual'});
    const out = {};
    r.headers.forEach((v,k)=>{ if (k !== 'content-length' && k !== 'transfer-encoding') out[k]=v; });
    if (out.location) out.location = out.location.replace(UPSTREAM, 'https://' + (req.headers.host || 'precocerto-clone.onrender.com'));
    res.writeHead(r.status, out);
    if (req.method !== 'HEAD') res.end(Buffer.from(await r.arrayBuffer())); else res.end();
  } catch (e) {
    res.writeHead(502, {'content-type':'application/json'});
    res.end(JSON.stringify({error:'Backend indisponível'}));
  }
}

const server = http.createServer((req,res)=>{
  if (req.url.startsWith('/api/')) return proxy(req,res);
  let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if (pathname === '/' || !path.extname(pathname)) pathname = '/index.html';
  const file = path.join(root, pathname);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); return res.end('Not Found');
  }
  res.writeHead(200, {'content-type':mime(file), 'cache-control':'no-cache'});
  fs.createReadStream(file).pipe(res);
});
server.listen(PORT, '0.0.0.0', ()=>console.log(`Preço Certo listening on ${PORT}`));
