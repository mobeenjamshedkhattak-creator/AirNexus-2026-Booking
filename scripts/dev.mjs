import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('public');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname==='/'?'/index.html':pathname));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403);return res.end();}
  fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);});
});
const portIndex=process.argv.indexOf('--port');
server.listen(Number(process.env.PORT||(portIndex>=0?process.argv[portIndex+1]:3000)),'0.0.0.0',()=>console.log('AirNexus preview ready'));
