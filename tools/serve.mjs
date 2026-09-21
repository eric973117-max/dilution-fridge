#!/usr/bin/env node
/* 零依赖静态服务器 —— 这个站是原生 ES module，浏览器不允许 file:// 加载模块，
   所以必须用 http 打开。用法：
     node tools/serve.mjs [--port 8500] [--host 127.0.0.1] [--quiet]
   也支持环境变量 PORT / HOST。
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : null;
};
const PORT = Number(flag('port') || process.env.PORT || 8500);
const HOST = String(flag('host') || process.env.HOST || '127.0.0.1');
const QUIET = !!flag('quiet');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  // 防目录穿越 + 目录请求回落到 index.html
  if (!path.resolve(filePath).startsWith(ROOT)) {
    res.writeHead(403).end('403');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      if (!QUIET) console.log(`${res.statusCode = 404} ${urlPath}`);
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 ' + urlPath);
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      'content-length': buf.length,
      // 开发期不缓存：改完源码刷一下就能看到
      'cache-control': 'no-store, must-revalidate',
    });
    if (!QUIET) console.log(`200 ${urlPath}  ${type.split(';')[0]}  ${buf.length}B`);
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`全链路量子计算  →  http://${HOST}:${PORT}/`);
  console.log(`   根目录: ${ROOT}`);
  console.log(`   改完 src/ styles/ content/ 里的文件，浏览器刷新即可（已关缓存）。`);
  console.log(`   ?lang=en 英文  ·  ?chapter=N 直接跳到第 N 章  ·  ?feed=replay 试数据接口`);
});
