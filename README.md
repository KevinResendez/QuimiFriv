# QuimiFriv: Laboratorio del Primer Parcial

Portal educativo estático hecho con HTML, CSS y JavaScript. No usa backend, cuentas ni dependencias de instalación. El avance y la preferencia de modo claro u oscuro se guardan en `localStorage` del navegador.

## Ejecutarlo

Abre `index.html` en un navegador moderno. Para probarlo con servidor local desde PowerShell:

```powershell
cd "C:\Users\Kevin\Documents\Documentos\Codex Projects\QuimiFriv"
& "C:\Users\Kevin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" -e "require('http').createServer((req,res)=>{const fs=require('fs'),path=require('path');let p=path.join(process.cwd(),decodeURIComponent(req.url.split('?')[0]));if(req.url==='/'||req.url==='/')p=path.join(process.cwd(),'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end('No encontrado')}res.setHeader('Content-Type',p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(b)})}).listen(4173,()=>console.log('QuimiFriv: http://localhost:4173'))"
```

Después visita `http://localhost:4173`. Para borrar el progreso, usa **Reiniciar progreso** en el pie de página; también puedes borrar los datos del sitio desde el navegador.

## Archivos

- `index.html`: estructura de la página, juegos, guía de bolsillo y medallas.
- `styles.css` y `reference.css`: diseño responsive, modal, animaciones y guía.
- `data.js`: preguntas, respuestas, explicaciones y contenidos.
- `app.js`: lógica de juegos, puntuación, medallas y persistencia.
- `assets/`: logos locales de la Universidad Autónoma de Tamaulipas y de la Facultad de Ingeniería y Ciencias.

## Juegos incluidos

Arma tu átomo; Catión, anión o neutro; Configuración Express; Spin Master; Detective periódico; Bloque P; Constructor de Lewis; Mezcla Master; Laboratorio de mediciones y ¡Atrapaelementos! (con control por inclinación en teléfonos).

El contenido se preparó tomando como base la guía de estudio del primer parcial, el material de separación de mezclas y la práctica de equipos de medición disponibles fuera de esta carpeta. Los originales no se modificaron.





