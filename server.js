const http = require('http');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const {URL}=require('url');
const PORT=process.env.PORT||10000, root=__dirname, DB=process.env.DATA_FILE||path.join(root,'data.json');
const APP_ID='6a357c8d5553d30c6b90df5a';
let db={users:[], entities:{}}; try{if(fs.existsSync(DB)) db=JSON.parse(fs.readFileSync(DB));}catch{}
const save=()=>{fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)};
const uuid=()=>crypto.randomUUID(); const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.pbkdf2Sync(p,s,120000,32,'sha256').toString('hex');
const check=(p,h)=>{const [s,v]=String(h||'').split(':');return s&&crypto.timingSafeEqual(Buffer.from(v||''),Buffer.from(hash(p,s).split(':')[1]));};
const sign=u=>Buffer.from(JSON.stringify({id:u.id,exp:Date.now()+7*864e5})).toString('base64url')+'.'+crypto.createHmac('sha256',process.env.AUTH_SECRET||'precocerto-local-secret').update(u.id).digest('base64url');
function user(req){const x=(req.headers.authorization||'').replace(/^Bearer /,'').split('.');if(x.length!==2)return null;try{const p=JSON.parse(Buffer.from(x[0],'base64url'));if(p.exp<Date.now()||crypto.createHmac('sha256',process.env.AUTH_SECRET||'precocerto-local-secret').update(p.id).digest('base64url')!==x[1])return null;return db.users.find(u=>u.id===p.id)||null}catch{return null}}
const pub=u=>{if(!u)return null;const {password_hash,...x}=u;return x};
function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});res.end(JSON.stringify(data));}
async function body(req){let a=[];for await(const c of req)a.push(c);try{return JSON.parse(Buffer.concat(a)||'{}')}catch{return {}}}
const entityName=p=>decodeURIComponent(p.split('/').filter(Boolean).pop()||'');
async function api(req,res){const u=new URL(req.url,'http://localhost'), p=u.pathname, b=await body(req); const me=user(req);
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'});return res.end()}
 let m=p.match(/^\/api\/apps\/[^/]+\/auth\/(login|register)$/);
 if(m){if(m[1]==='login'){const x=db.users.find(x=>x.email.toLowerCase()===String(b.email||'').toLowerCase());if(!x||!check(b.password,x.password_hash))return json(res,401,{message:'E-mail ou senha inválidos'});return json(res,200,{access_token:sign(x),user:pub(x)});}if(!b.email||!b.password)return json(res,400,{message:'E-mail e senha são obrigatórios'});if(db.users.some(x=>x.email.toLowerCase()===b.email.toLowerCase()))return json(res,409,{message:'E-mail já cadastrado'});const x={id:uuid(),email:b.email.toLowerCase(),full_name:b.full_name||b.name||'',password_hash:hash(b.password),role:db.users.length?'user':'admin',created_date:new Date().toISOString(),created_at:new Date().toISOString()};db.users.push(x);save();return json(res,201,{access_token:sign(x),user:pub(x)});}
 if(p.includes('/auth/logout'))return json(res,200,{ok:true});
 if(p.match(/^\/api\/apps\/[^/]+\/auth\/(me|current-user)$/)){if(!me)return json(res,401,{message:'Não autenticado'});return json(res,200,pub(me));}
 if(!me)return json(res,401,{message:'Autenticação necessária'});
 if(p.match(/\/entities\/User\/me$/)){if(req.method==='GET')return json(res,200,pub(me));if(req.method==='PUT'){Object.assign(me,b);save();return json(res,200,pub(me));}}
 m=p.match(/^\/api\/apps\/[^/]+\/entities\/([^/]+)(?:\/([^/]+))?$/);
 if(m){const name=m[1], id=m[2]; if(name==='User'&&req.method==='DELETE'){if(id===me.id||me.role!=='admin')return json(res,403,{message:'ADM não pode excluir a própria conta'});db.users=db.users.filter(x=>x.id!==id);for(const k of Object.keys(db.entities))db.entities[k]=db.entities[k].filter(x=>x.created_by_id!==id);save();return json(res,200,{ok:true});}
  if(name==='User'&&req.method==='GET'){if(me.role!=='admin')return json(res,403,{message:'Acesso restrito ao ADM'});return json(res,200,db.users.map(pub));}
  db.entities[name]??=[]; let arr=db.entities[name]; if(req.method==='GET'&&!id){let q={};try{q=JSON.parse(u.searchParams.get('q')||'{}')}catch{};let out=arr.filter(x=>x.created_by_id===me.id&&Object.entries(q).every(([k,v])=>x[k]===v));return json(res,200,out);}
  if(req.method==='POST'&&!id){const x={...b,id:uuid(),created_by_id:me.id,created_date:new Date().toISOString(),created_at:new Date().toISOString(),updated_date:new Date().toISOString()};arr.push(x);save();return json(res,201,x)}
  const x=arr.find(x=>x.id===id&&x.created_by_id===me.id);if(!x)return json(res,404,{message:'Registro não encontrado'});if(req.method==='GET')return json(res,200,x);if(req.method==='PUT'){Object.assign(x,b,{updated_date:new Date().toISOString()});save();return json(res,200,x)}if(req.method==='DELETE'){arr=arr.filter(y=>y!==x);db.entities[name]=arr;save();return json(res,200,{ok:true})}
 }
 if(p==='/api/account'&&req.method==='DELETE'){if(me.role==='admin'&&db.users.length>1)return json(res,403,{message:'O ADM não pode excluir a própria conta enquanto houver usuários'});db.users=db.users.filter(x=>x.id!==me.id);for(const k of Object.keys(db.entities))db.entities[k]=db.entities[k].filter(x=>x.created_by_id!==me.id);save();return json(res,200,{ok:true})}
 if(p==='/api/proportion'&&req.method==='POST'){const base=Number(b.base), target=Number(b.target);if(!Number.isFinite(base)||!Number.isFinite(target)||base<=0)return json(res,400,{message:'Valores inválidos'});return json(res,200,{factor:target/base,value:Number(b.value||0)*target/base});}
 return json(res,404,{message:'Rota não encontrada'});
}
function mime(f){return ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(f).toLowerCase()]||'application/octet-stream'}
const server=http.createServer((req,res)=>{if(req.url.startsWith('/api/'))return api(req,res);let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/'||!path.extname(p))p='/index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not Found')}res.writeHead(200,{'content-type':mime(f),'cache-control':'no-cache'});fs.createReadStream(f).pipe(res)});server.listen(PORT,'0.0.0.0',()=>console.log(`Preço Certo listening on ${PORT}`));
