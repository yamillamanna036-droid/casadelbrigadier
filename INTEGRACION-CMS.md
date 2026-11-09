# Activar Decap CMS conservando casadelbrigadier.netlify.app

El código ya contiene el panel real de Decap CMS, los contenidos editables, el generador y las funciones de autenticación. Falta conectar tus cuentas. La dirección pública seguirá siendo:

- Inicio: `https://casadelbrigadier.netlify.app/`
- Conocé la casa: `https://casadelbrigadier.netlify.app/casa/`
- Administración: `https://casadelbrigadier.netlify.app/admin/`

**Usá el proyecto de Netlify que ya existe. No crees otro sitio, no cambies su nombre y no arrastres este ZIP de código fuente al área de publicación manual.** A partir de esta integración, Netlify debe construir el sitio desde GitHub.

## 1. Guardar una copia y descomprimir el proyecto

Guardá el último ZIP estático que publicaste, por si necesitás volver a esa versión. Descargá y descomprimí el ZIP nuevo `casa-del-brigadier-decap-github.zip`.

En la raíz de la carpeta extraída deben verse `package.json`, `netlify.toml`, `README.md` y las carpetas `public`, `content`, `templates`, `scripts`, `netlify`, `cms` y `tests`. También hay `.gitignore`, `.env.example` y `.github` (algunos sistemas ocultan los nombres que empiezan con punto).

No hay que copiar esta carpeta dentro de otra carpeta `casa`: `/casa/` ya está definida por la plantilla y el generador.

## 2. Crear el repositorio de GitHub

1. Entrá a [GitHub](https://github.com/) con tu cuenta.
2. Abrí [New repository](https://github.com/new).
3. Como nombre, podés usar `casa-del-brigadier`. Elegí si será público o privado. No agregues otro README, licencia ni `.gitignore`, porque el proyecto ya trae sus archivos.
4. Creá el repositorio.
5. En el repositorio vacío, elegí el enlace **uploading an existing file**. Si ya hay archivos, usá **Add file → Upload files**.
6. Subí el **contenido extraído** del ZIP, manteniendo las carpetas, no el ZIP ni una carpeta contenedora adicional. `package.json` y `netlify.toml` deben quedar directamente en la raíz del repositorio.
7. Confirmá la carga con un commit a `main`.
8. Verificá que existan, por ejemplo, `content/pages/inicio.json`, `public/admin/config.yml`, `templates/casa/index.html` y `netlify/functions/auth.mjs`.

No subas archivos `.env` con valores reales. `.env.example` solo contiene nombres y ejemplos. Si la carga web no incluye archivos ocultos, podés usar GitHub Desktop para añadir la carpeta completa; `.github/workflows/check.yml` es recomendable para las pruebas, aunque no es necesario para que Netlify ejecute su build.

Anotá la ruta del repositorio, por ejemplo `TU_USUARIO/casa-del-brigadier`. No incluyas `https://github.com/` ni `.git` en ese valor.

## 3. Crear la aplicación OAuth para el editor

Esta es una **OAuth App** propia, no la GitHub App que Netlify instala para compilar repositorios.

1. En GitHub, abrí **Settings → Developer settings → OAuth Apps → New OAuth App**. También podés entrar a [las aplicaciones OAuth](https://github.com/settings/developers).
2. Completá:

| Campo | Valor |
| --- | --- |
| Application name | `Casa del Brigadier CMS` |
| Homepage URL | `https://casadelbrigadier.netlify.app` |
| Authorization callback URL | `https://casadelbrigadier.netlify.app/api/callback` |

3. Registrá la aplicación.
4. Copiá el **Client ID** y generá un **Client Secret**. Guardalos para el próximo paso.

El callback debe ser exactamente `/api/callback`. No es `/admin/`, `/casa/` ni una URL de ChatGPT. No hace falta activar Device Flow. Los usuarios del editor deben tener permiso de escritura en el repositorio; si invitás a otra persona, añadila como colaboradora en GitHub.

## 4. Configurar las variables en el proyecto actual de Netlify

Abrí el proyecto cuyo dominio es `casadelbrigadier.netlify.app`. En **Project configuration → Environment variables**, añadí estos valores para el contexto de producción:

| Variable | Valor | Ámbito que necesita |
| --- | --- | --- |
| `GITHUB_REPOSITORY` | `TU_USUARIO/casa-del-brigadier` | Builds y Functions |
| `GITHUB_BRANCH` | `main` | Builds |
| `CMS_SITE_URL` | `https://casadelbrigadier.netlify.app` | Builds y Functions |
| `GITHUB_CLIENT_ID` | Client ID de tu OAuth App | Functions |
| `GITHUB_CLIENT_SECRET` | Client Secret de tu OAuth App | Functions, marcado como secreto |
| `GITHUB_OAUTH_SCOPE` | `repo` para repositorio privado; `public_repo` para repositorio público | Functions |

Si tu plan no muestra la selección de ámbitos, cargá las variables desde la configuración del proyecto; el código solo utiliza el secreto en las funciones y nunca lo escribe en `dist/` ni en la configuración pública del CMS.

`CMS_SITE_URL` no lleva `/casa/`. Si activás previews, no necesitás permitir el acceso OAuth desde sus dominios: la administración se realiza desde el dominio principal. No habilites Git Gateway ni Netlify Identity.

Podés completar estas variables antes de vincular el repositorio para que el primer build tenga la configuración lista.

## 5. Vincular GitHub al mismo sitio de Netlify

1. Dentro del **proyecto existente**, abrí **Project configuration → Developer settings → Continuous deployment → Repository**.
2. Elegí **Link repository** y seleccioná **GitHub**.
3. Cuando Netlify pida autorización, instalá o autorizá la **Netlify GitHub App** para el repositorio que acabás de crear. Esto sirve para leer el código y disparar builds; no sustituye la OAuth App del editor.
4. Seleccioná `TU_USUARIO/casa-del-brigadier` y la rama `main`.
5. Verificá estos ajustes, que ya están declarados en `netlify.toml`:

| Ajuste | Valor |
| --- | --- |
| Base directory | vacío / raíz del repositorio |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Node.js | `22` |

6. Guardá y esperá el deploy. Si ya había empezado antes de definir las variables, ejecutá **Deploys → Trigger deploy → Deploy site**.
7. Comprobá que el deploy termine correctamente y que Netlify detecte las funciones `auth` y `callback`.

No cambies el dominio ni el nombre del proyecto. Vincular un repositorio al sitio existente cambia la forma de publicar y conserva su dirección.

Si la interfaz de tu cuenta presenta otra agrupación de menús, buscá **Continuous deployment → Repository → Link repository** dentro de la configuración del mismo proyecto. No uses la opción para crear una web nueva.

## 6. Probar el acceso y una edición real

1. Abrí `https://casadelbrigadier.netlify.app/` y las cuatro páginas internas, incluida `/casa/`. Verificá que mantienen el diseño y las funciones.
2. Abrí `https://casadelbrigadier.netlify.app/admin/`.
3. Pulsá **Login with GitHub** (o su traducción), autorizá tu OAuth App y regresá al editor.
4. En **Páginas → Inicio → Secciones de la página**, buscá el primer título. Cambiá temporalmente una palabra y pulsá **Publicar**. Los títulos que conservan cursivas o saltos de línea se editan en sus fragmentos; no hace falta escribir HTML.
5. En GitHub, verificá que se haya creado un commit que modifica `content/pages/inicio.json` en `main`.
6. En Netlify, abrí **Deploys** y comprobá que ese commit haya disparado una nueva compilación.
7. Cuando el deploy diga **Published**, recargá la página de inicio y verificá el texto.
8. Devolvé la palabra a su valor original y publicá otra vez.
9. Probá una imagen en **Páginas → Conocé la casa → Secciones de la página → Los patios → Imágenes**. Subí una imagen, modificá su descripción accesible y publicá. Verificá el commit en `public/assets/`, el nuevo deploy y la foto en `/casa/`. También debe abrirse la misma imagen al ampliarla.
10. En **Inicio → Línea de tiempo**, editá el texto de un hito y publicá. Verificá tanto el texto inicial como el que aparece al pulsar su fecha.

El guardado de Decap confirma el commit en GitHub. El cambio público se verá cuando Netlify termine de construir y publicar. Esta configuración usa publicación directa a `main`; no introduce borradores locales que aparenten haber actualizado la web.

## 7. Qué se puede administrar

- Inicio: títulos y párrafos, ilustración, fotos, epígrafes, contenidos de cada bloque, horarios, contactos y los cinco hitos de la línea de tiempo.
- Historia: encabezado, textos de los cuatro apartados, imágenes, epígrafes, desplegables y bloque final.
- Conocé la casa: encabezado, patios, habitantes, excavación, exposiciones, imágenes y textos.
- Patrimonio: encabezado, catálogo, documentos, indumentaria, arqueología, galería y textos finales.
- Visita: encabezado, horarios, ubicación, mapa, contactos y preguntas frecuentes.
- Encabezado y pie: textos comunes en las cinco páginas.

Los enlaces internos, las secciones, las clases de estilo y las rutas permanecen en las plantillas. Los campos **Destinos de enlaces** permiten actualizar teléfonos, correos y enlaces externos; si cambiás un contacto, revisá también su texto visible. No borres imágenes que sigan usándose en otra página.

## 8. Si algo no funciona

| Síntoma | Qué revisar |
| --- | --- |
| El build pide `GITHUB_REPOSITORY` | Definí la variable en Netlify y ejecutá otro deploy. |
| Se ve el diseño pero `/admin/` no existe | El repositorio debe contener `public/admin/` y la publicación debe ser `dist`, tras ejecutar el build. |
| `/admin/` informa que falta el repositorio | La nueva configuración aún no se compiló; revisá variables y desplegá. |
| Error en la URL de callback | Compará la OAuth App con `https://casadelbrigadier.netlify.app/api/callback`. |
| `/api/auth` o `/api/callback` devuelve 404 | Revisá `netlify.toml` y la publicación de las funciones; un ZIP arrastrado al dropzone no configura este flujo de servidor. |
| Mensaje de sesión inválida | Cerrá la ventana emergente y entrá de nuevo desde `/admin/`; el estado de acceso vence a los diez minutos. |
| Acceso denegado al repositorio | Revisá usuario, permisos de escritura, autorización de la organización y `GITHUB_REPOSITORY`. |
| El CMS guarda pero no cambia la web | Buscá el commit en `main`; revisá el build correspondiente y que los despliegues automáticos estén activos. |
| La imagen no se publica | Los archivos nuevos van a `public/assets/`; su URL debe ser `/assets/archivo.ext`. El build valida que exista. |
| Abrir una imagen ampliada falla | Verificá que uses el `public/app.js` nuevo, que admite las rutas de imagen guardadas por Decap. |
| Cambiaste el Client Secret | Actualizá la variable de Functions y redeplegá. No lo guardes en GitHub. |

Para volver atrás, podés publicar un deploy anterior desde el historial de Netlify. Para deshacer una edición puntual, revertí su commit de contenido en GitHub y dejá que Netlify reconstruya.

## Verificaciones realizadas y límites

El proyecto incluye 19 pruebas automáticas de las cinco páginas, edición de títulos/párrafos/imágenes, propagación de los textos compartidos, línea de tiempo, campos opcionales, conservación del cuerpo HTML y de todos los estilos, configuración de dominio y flujo OAuth (estado firmado, vencimiento, PKCE, permisos de escritura y protocolo `postMessage` real de Decap).

Las peticiones a GitHub de esas pruebas están simuladas. El acceso y la publicación con tus cuentas deben comprobarse con el procedimiento anterior después de registrar la OAuth App. No se han creado repositorios, aplicaciones ni credenciales en tus cuentas y no se ha modificado tu proyecto de Netlify desde aquí.

## Documentación consultada

- [Índice oficial actual de Decap CMS](https://decapcms.org/llms.txt).
- [Backend GitHub](https://decapcms.org/docs/github-backend/).
- [Colecciones de archivos](https://decapcms.org/docs/collection-file/).
- [Inicialización manual de Decap](https://decapcms.org/docs/manual-initialization/).
- [Clientes OAuth externos](https://decapcms.org/docs/external-oauth-clients/).
- [Autorización de OAuth Apps en GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
- [Crear una OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- [Vincular un repositorio a un proyecto existente de Netlify](https://docs.netlify.com/build/git-workflows/repo-permissions-linking/).
- [Funciones de Netlify](https://docs.netlify.com/build/functions/overview/).
