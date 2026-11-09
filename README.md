# Casa del Brigadier Estanislao López

Sitio estático con el diseño existente, contenido editable con Decap CMS y autenticación directa con GitHub. Conserva las rutas `/`, `/historia/`, `/casa/`, `/patrimonio/` y `/visita/`.

**Para activar el CMS en el sitio existente:** seguí [INTEGRACION-CMS.md](INTEGRACION-CMS.md). Todavía hay que crear el repositorio, registrar la OAuth App y conectar las variables de Netlify. El código no incluye credenciales y no usa Git Gateway, Identity ni un backend de demostración.

## Estructura

- `content/pages/*.json`: contenido de Inicio, Historia, Conocé la casa, Patrimonio y Visita.
- `content/site.json`: textos compartidos del encabezado y pie.
- `templates/`: HTML original con referencias a los contenidos; `templates/casa/index.html` mantiene `/casa/`.
- `public/`: archivos públicos, estilos, JavaScript, imágenes y panel `/admin/`.
- `public/admin/config.yml`: configuración real de Decap y campos del editor. Usa sintaxis JSON, válida como YAML, para poder validarla sin dependencias de compilación.
- `public/assets/`: biblioteca de imágenes existentes y archivos que subas desde el CMS. Se publican en `/assets/`.
- `cms/settings.json`: dominio, rama y configuración pública por defecto. El repositorio puede establecerse mediante `GITHUB_REPOSITORY` en Netlify.
- `scripts/build.mjs`: genera el sitio y la configuración del editor en `dist/`.
- `netlify/functions/`: entrada y retorno OAuth de GitHub; `netlify/lib/oauth.mjs` contiene el flujo verificado.
- `netlify.toml`: compilación, publicación, funciones y rutas de autenticación.
- `tests/`: publicación de contenido, conservación del HTML y CSS, validación y autenticación.
- `.github/workflows/check.yml`: pruebas y compilación en GitHub.

`public/` es la fuente de archivos públicos; `dist/` es la salida generada. No edites `dist/`: el siguiente despliegue la reconstruye. No publiques la carpeta `public` directamente en Netlify, porque omitirías las páginas generadas y las funciones OAuth.

## Uso local

Requiere Node.js 22 o superior. No hay dependencias de compilación adicionales.

```sh
npm ci
npm test
npm run build
npm run preview
```

La vista local se abre en `http://localhost:8080`. El acceso OAuth real se prueba en `https://casadelbrigadier.netlify.app/admin/`, después de completar la guía. No se activa un backend ficticio para simular autenticación local.

Sin `GITHUB_REPOSITORY`, la compilación local permite revisar la web y el panel informa la configuración que falta. Una compilación de Netlify sin ese dato se detiene, para evitar publicar un CMS mal configurado.

## Cómo se publica una edición

Decap guarda el JSON o la imagen en la rama `main` de GitHub. Ese commit activa el build de Netlify. El generador lee esos mismos archivos, rellena las plantillas originales y publica las páginas nuevas. La web no necesita hacer peticiones de contenido en el navegador ni depende de JavaScript para mostrar sus textos.

La línea de tiempo del inicio obtiene sus textos y sus datos interactivos del mismo archivo JSON. Las imágenes y sus versiones ampliadas usan el mismo campo del CMS, incluso cuando subís una imagen nueva.

Los campos de títulos respetan los fragmentos originales de formato: por ejemplo, el texto en cursiva y las líneas separadas se editan por partes sin tener que escribir HTML. Los destinos de teléfono, correo y mapas tienen sus propios campos para no alterar la navegación interna.

## Verificación

Se incluyen pruebas de edición real sobre copias temporales del contenido: cambian títulos, párrafos e imágenes en las cinco páginas, reconstruyen el sitio y comprueban el HTML publicado. También se verifica la línea de tiempo, el encabezado compartido, los campos opcionales y la autenticación con respuestas simuladas de GitHub.

Las pruebas de conservación comparan el HTML público inicial y las huellas de todos los estilos con la versión anterior. Los únicos cambios necesarios en la salida son los datos de la línea de tiempo, las rutas normalizadas de las imágenes y los metadatos del dominio.

No se ha efectuado un acceso real a tu GitHub/Netlify ni una publicación desde tu cuenta: eso requiere los pasos de configuración de la guía. La verificación OAuth con mocks no reemplaza la prueba final de acceso y publicación.
