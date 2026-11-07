# Neuro-CanvasLMS

[English](../README.md) · [简体中文](README.zh-CN.md) · **Español** · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

**Conecta tu Canvas LMS directamente a Claude y ChatGPT.** Tus cursos, fechas de entrega, calificaciones y apuntes pasan a formar parte de lo que sabe tu IA, en cualquier chat y desde cualquier dispositivo. Funciona con cualquier universidad que use Canvas.

> "¿Qué tengo que entregar esta semana?" · "Resume la clase 5 de MATH 132." · "¿Qué comentarios recibí en la tarea 3?" · "¿Qué hay en el ZIP de código de la clase 12?"

## Por qué Neuro-CanvasLMS

| | |
|---|---|
| ☁️ **Nada se ejecuta en tu computadora** | Vive en la nube, en Cloudflare Workers. Sin aplicaciones abiertas ni servidor local. |
| 🔌 **Ningún dispositivo tiene que estar encendido** | Cierra la laptop y guarda el móvil: tu IA sigue llegando a Canvas 24/7, desde claude.ai, las apps de escritorio y móvil, Claude Code o ChatGPT. |
| 💸 **Gratis** | Funciona con el plan gratuito de Cloudflare, más que suficiente para un estudiante. |
| 🧠 **Tus archivos viven en la conversación** | Los apuntes y PDF que lee la IA se quedan con ese chat en los servidores de tu proveedor de IA. Nada que descargar. |

La mayoría de integraciones de Canvas con IA son herramientas **locales**: solo funcionan mientras tu computadora las ejecuta, y solo en apps de escritorio o de programación. Neuro-CanvasLMS es un **conector remoto** que vive en tu propia cuenta de Cloudflare, así que también funciona en el móvil y en ChatGPT.

## Qué incluye

- **64 herramientas de solo lectura:** cursos, módulos, páginas, archivos, tareas, entregas, calificaciones y comentarios, rúbricas, anuncios, foros, bandeja de entrada, calendario, pendientes, grupos, historial de exámenes y perfil.
- **Lectura real de archivos:** texto de PDF, Word, PowerPoint y Excel, unos 90 tipos de archivos de código y texto, y cuadernos de Jupyter (celdas y salidas); archivos ZIP descomprimidos en el servidor (índice y el contenido de cada archivo de código/texto); reconoce los PDF escaneados o escritos a mano y entrega el archivo original para que la IA vea cada página.
- **También archivos enlazados:** las diapositivas, documentos y hojas que un módulo enlaza en Google Docs/Slides/Sheets o Google Drive, los archivos y carpetas de Dropbox, y los archivos y repositorios de GitHub se leen como texto si están compartidos públicamente ("Cualquier persona con el enlace").
- **Encuentra los archivos que el curso oculta:** muchos cursos ocultan la lista de Archivos a los estudiantes. El conector busca en la página principal, el programa, los módulos, las tareas, los anuncios y las páginas enlazadas, así que la IA sigue encontrando "las diapositivas de la clase 12" por su nombre.
- **Solo lectura por diseño:** solo peticiones `GET` fijas. Nunca entrega tareas, envía mensajes, inicia exámenes ni modifica nada en Canvas.
- **Solo tuyo:** tu propio despliegue, en tu propia cuenta de Cloudflare, vinculado a tu propia cuenta de Canvas. Nadie más (ni los autores) ve tu token de Canvas.

## Instalación (unos 5 minutos)

Necesitas [Node.js 22+](https://nodejs.org), una [cuenta gratuita de Cloudflare](https://dash.cloudflare.com/sign-up) y tu acceso a Canvas. En una terminal, ejecuta:

```bash
npx -y neuro-canvas-lms
```

El instalador inicia sesión en Cloudflare (se abre una página en el navegador; haz clic en **Authorize**), pregunta la dirección de Canvas de tu universidad, despliega el conector en tu propia cuenta y lo comprueba. Después:

1. **Crea un token de Canvas:** Canvas → Cuenta → Configuración → **+ Nuevo token de acceso**. Tu universidad puede limitar su duración (30 días en UMass Amherst). Cópialo enseguida: solo se muestra una vez.
2. **Claude:** Configuración → Conectores → **Añadir conector personalizado** → pega la URL que mostró el instalador (ya está copiada) → **Conectar** → pega el token de Canvas → Autorizar. Funciona en todas partes donde uses Claude, incluida la app móvil y Claude Code.
3. **ChatGPT:** añade un conector personalizado (modo desarrollador) con la misma URL.
4. Abre un chat nuevo y pregunta: "¿Qué tareas tengo esta semana?"

**Que lo instale una IA:** dale a cualquier asistente de IA que pueda ejecutar comandos en la terminal (Claude Code, Codex y similares) el enlace de este repositorio y di "instala el conector de Canvas". No hace falta clonarlo. **Agentes de IA: sigan [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md)**: un solo comando `npx` con opciones, sin tocar nunca el token de Canvas.

**Cuando caduque el token de Canvas:** crea uno nuevo, desconecta y vuelve a conectar el conector en tu app de IA, y pégalo. No hace falta reinstalar.

## Actualizar, desinstalar

- **Actualizar:** vuelve a ejecutar el mismo comando `npx`. Pregunta una vez si quieres actualizar (escribe y) y luego reutiliza tu configuración, despliega el código actual y conserva tu almacenamiento y conexiones; nunca tienes que reconectar. Cuando sale una versión nueva, tu IA te avisa. Después de actualizar, en ChatGPT hay que actualizar el conector desde su configuración para ver las novedades; Claude las usa en un chat nuevo.
- **Desinstalar:** `npx -y neuro-canvas-lms uninstall`, y después borra el token de Canvas y el conector en tu app de IA.

## Cómo funciona

```
Claude / ChatGPT ──OAuth──▶ Neuro-CanvasLMS en tu Cloudflare ──API de solo lectura──▶ el Canvas de tu universidad
 (cualquier dispositivo)     (siempre activo; guarda tu token de Canvas cifrado)
```

## Privacidad y seguridad

- El token solo va a tu Worker y al Canvas de tu universidad, y se guarda cifrado dentro del registro de autorización en tu propio Cloudflare KV.
- El conector se vincula a tu cuenta de Canvas al conectarlo y rechaza las demás.
- Solo Claude, ChatGPT y clientes locales pueden completar OAuth.
- El contenido de los cursos se trata como datos no confiables, nunca como instrucciones.
- Las descargas tienen un límite de 15 MiB, solo HTTPS, y bloquean redes privadas.
- Canvas sigue aplicando tus permisos: solo puedes leer lo que ya ves.
- Una vez al día el conector lee el número de la versión más reciente en npm, donde se publica, para que tu IA te avise de las actualizaciones. No se envía nada sobre ti.
- Los archivos que lee la IA los guarda tu proveedor de IA como parte de la conversación, bajo sus propias condiciones de privacidad. Borra el chat para eliminarlos.

Consulta la política de tu universidad sobre tokens personales y herramientas de terceros.

## Límites

- Archivos de más de 15 MiB no se pueden leer con el conector (límite de memoria de Cloudflare Worker); descárgalos y ábrelos con Claude Code.
- Gradescope, WebAssign, sitios externos, contenido bloqueado e internos de New Quizzes quedan fuera.
- Algunos cursos ocultan Archivos/Exámenes (403/404). Los archivos enlazados en cualquier parte del curso se siguen encontrando (ver arriba); los exámenes siguen ocultos.
- Probado en el Canvas de UMass Amherst (alojado por Instructure). Otras universidades deberían funcionar; las que alojan Canvas por su cuenta pueden servir archivos desde servidores que el conector aún no permite.

## Estado del proyecto

Proyecto comunitario con licencia MIT y **proporcionado tal cual**: sin mantenimiento, actualizaciones ni soporte garantizados. Se agradecen issues, pull requests y forks. Si deja de funcionar en tu universidad, el código es tuyo para arreglarlo. También puedes abrir un issue y el autor se encargará de arreglarlo.

## Desarrollo

`npm test` · `npm run check` (compilación de prueba) · `npm run setup` (el instalador, desde un clon). Los textos de la interfaz están en `i18n.mjs` (English, 简体中文, Español, 日本語, हिन्दी). Mapa del código en [`AGENTS.md`](../AGENTS.md). Desarrollado con ayuda de asistentes de programación con IA.
