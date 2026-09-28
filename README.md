# Combate 2d6

Calculadora de combate 2d6 para *Age of Mythology: The Boardgame*. Una sola pantalla de
teléfono, compartida por dos jugadores sentados uno frente a otro, para resolver un duelo
de unidades a la vez.

## Qué es

- Un único archivo HTML autocontenido (`index.html`): sin backend, sin base de datos, sin
  peticiones de red de ningún tipo. Todo el motor de reglas, los datos de unidades/enfrentamientos
  y la interfaz viven inline en ese archivo.
- Progresive Web App instalable y funcional sin conexión (`manifest.webmanifest` + `sw.js`).
- Persistencia local con `localStorage` (civilizaciones, unidades, historial y ajustes).

## Desplegar en Vercel

Este proyecto es un sitio 100% estático, sin paso de build:

1. En Vercel: **Add New → Project** e importa este repositorio.
2. Framework Preset: **Other**.
3. Build Command: **vacío** (déjalo en blanco).
4. Output Directory: **vacío** (déjalo en blanco).
5. Deploy.

`vercel.json` ya define los headers necesarios para que las actualizaciones del Service Worker
lleguen (`/sw.js` con `Cache-Control: no-cache`-like) y el `Content-Type` correcto del manifest.
`.vercelignore` excluye del despliegue los archivos que no son parte de la app publicada
(`stitch-designs/`, `prompt.md`, `data/`, este `README.md` y la carpeta de herramientas `dev/`).

No se usan `@vercel/analytics` ni Speed Insights ni ninguna otra dependencia de Vercel.

## Desarrollo local

El código fuente editable vive en `dev/`:

- `engine.js` (raíz del repo): motor de reglas puro en JS, sin DOM, ejecutable en Node.
- `data.js` (raíz del repo, generado): `data/*.csv` convertidos a objetos JS, sin redondear
  ni alterar ningún número. Se regenera con `node dev/build-data.mjs`.
- `dev/ui-source.js`, `dev/styles.css`, `dev/icons.js`, `dev/index.template.html`: fuente de
  la interfaz.
- `node dev/build-index.mjs` ensambla todo en el `index.html` final autocontenido.

Para probar el motor de reglas contra una enumeración independiente de las 1296 combinaciones
de dados (casos de la sección 4 del prompt original):

```
node test/enumerate.mjs
```

Para servir la app localmente sin ninguna dependencia externa:

```
node dev/static-server.mjs
```

y abrir `http://localhost:4173/index.html`.
