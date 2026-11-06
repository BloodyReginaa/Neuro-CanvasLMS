# Neuro-CanvasLMS

[English](../README.md) · [简体中文](README.zh-CN.md) · **Español** · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

**Conecta tu Canvas LMS directamente a Claude y ChatGPT.** Tus cursos, fechas de entrega, calificaciones y apuntes pasan a formar parte de lo que sabe tu IA, en cualquier chat y desde cualquier dispositivo.

> "¿Qué tengo que entregar esta semana?" · "Resume la clase 5 de MATH 132." · "¿Qué comentarios recibí en la tarea 3?" · "¿Hay anuncios nuevos?"

## Por qué Neuro-CanvasLMS

| | |
|---|---|
| ☁️ **Nada se ejecuta en tu computadora** | Vive en la nube, en Cloudflare Workers. Sin aplicaciones abiertas, sin servidor local, sin terminal. |
| 🔌 **Ningún dispositivo tiene que estar encendido** | Cierra la laptop y guarda el móvil: tu IA sigue llegando a Canvas 24/7, desde claude.ai, las apps de escritorio y móvil, Claude Code o ChatGPT. |
| 💸 **Gratis** | Funciona con el plan gratuito de Cloudflare, más que suficiente para un estudiante. Sin facturas ni suscripciones; usas la cuenta de Claude o ChatGPT que ya tienes. |
| 🧠 **Tus archivos viven en la conversación** | Los apuntes y PDF que lee la IA se quedan con ese chat en los servidores de tu proveedor de IA. Nada que descargar ni que ocupe tu disco, y siguen ahí cuando vuelves. |

La mayoría de integraciones de Canvas con IA son herramientas *locales*: solo funcionan mientras tu computadora está encendida y ejecutándolas, y solo en apps de escritorio o de programación. Neuro-CanvasLMS es un **conector remoto**:

| | Herramienta local típica | **Neuro-CanvasLMS** |
|---|---|---|
| Se ejecuta en | tu laptop | la nube (tu propia cuenta de Cloudflare) |
| La laptop debe estar encendida | sí | **no** |
| Funciona en el móvil / claude.ai web | no | **sí** |
| Funciona en ChatGPT | no (ChatGPT solo admite conectores remotos) | **sí** |
| Costo | gratis | **gratis** |

Escrito para estudiantes de UMass Amherst y probado con el Canvas de UMass Amherst. Debería funcionar en cualquier universidad que use Canvas: solo cambias una línea.

## Qué incluye

- **59 herramientas de solo lectura:** cursos, módulos, páginas, archivos, tareas, entregas, calificaciones y comentarios, rúbricas, anuncios, foros, bandeja de entrada, calendario, pendientes, grupos, historial de exámenes y perfil.
- **Lectura real de archivos:** texto de PDF, Word, PowerPoint y Excel, y el archivo original para apuntes escaneados o a mano, para que la IA vea cada página.
- **Solo lectura por diseño:** solo peticiones `GET` fijas. Nunca entrega tareas, envía mensajes, inicia exámenes ni modifica nada en Canvas.
- **Solo tuyo:** tu propio despliegue, vinculado a tu propia cuenta de Canvas.
- **Lo instala la IA:** abre esta carpeta en Claude Code (o Codex) y di *"configura el conector de Canvas"*.

## Cómo funciona

```
Claude / ChatGPT ──OAuth──▶ Neuro-CanvasLMS en tu Cloudflare ──API de solo lectura──▶ el Canvas de tu universidad
 (cualquier dispositivo)     (siempre activo; guarda tu token de Canvas cifrado)
```

## Instalación (≈10 minutos, una sola vez; recomendado: que lo haga la IA)

Necesitas una cuenta de Canvas, una [cuenta gratuita de Cloudflare](https://dash.cloudflare.com/sign-up) y, **solo para la instalación**, una computadora con [Node.js 20+](https://nodejs.org) y Claude Code (o Codex). Después, esa computadora puede quedarse apagada.

```bash
git clone https://github.com/BloodyReginaa/Neuro-CanvasLMS.git
cd Neuro-CanvasLMS
claude
```

Di: **"Ayúdame a configurar el conector de Canvas."** Sigue [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md): revisa tu equipo, configura tu universidad, inicia sesión en Cloudflare (tú haces clic en Permitir), despliega y te guía para conectarlo. Nunca te pedirá tu token de Canvas.

<details><summary><b>Instalación manual</b></summary>

1. `npm install && npm test`
2. Edita `config.mjs`: `CANVAS_HOST` (p. ej. `umamherst.instructure.com`), `SCHOOL_NAME`, `ACCENT_COLOR`.
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV` → copia el id en `wrangler.jsonc`.
5. `npx wrangler deploy` → anota `https://neuro-canvas-lms.<tú>.workers.dev`.
6. Conéctalo enseguida (la primera cuenta de Canvas que autorice será la propietaria).
</details>

## Conectarlo

1. **Crea un token de Canvas:** Canvas → Cuenta → Configuración → **+ Nuevo token de acceso**. En UMass Amherst dura como máximo **30 días**. Cópialo enseguida: solo se muestra una vez.
2. **Claude:** Configuración → Conectores → **Añadir conector personalizado** → URL `https://…workers.dev/mcp` → Conectar → pega el token en la página que se abre → Autorizar. Funciona en todas partes donde uses Claude, incluida la app móvil y Claude Code (misma cuenta).
3. **ChatGPT:** añade un conector personalizado (modo desarrollador) con la misma URL.
4. Abre un chat nuevo y pregunta *"¿Qué tareas tengo esta semana?"*

**Cuando caduque el token:** crea uno nuevo, desconecta y vuelve a conectar el conector, y pégalo. No hace falta volver a desplegar.

## Actualizaciones

En la instalación eliges cómo llegan las versiones nuevas:

- **Actualización automática (recomendada):** cada versión se instala sola 24 horas después de publicarse, se comprueba y se revierte automáticamente si algo falla.
- **Recordatorios:** tu IA te avisa una vez; di *«actualiza el conector de Canvas»* para instalarla (con las mismas comprobaciones).

Lo hace un pequeño Worker (el actualizador) en tu propia cuenta de Cloudflare. No tiene URL pública e instala solo versiones firmadas con la clave del mantenedor. El almacenamiento, la configuración y tu conexión se conservan; nunca tienes que reconectar.

## Privacidad y seguridad

- El token solo va a tu Worker y al Canvas de tu universidad; se guarda cifrado en tu Cloudflare KV. Nadie más (ni los autores) puede verlo.
- El conector se vincula a la primera cuenta de Canvas que lo autoriza y rechaza las demás.
- Solo Claude, ChatGPT y clientes locales pueden completar OAuth.
- El contenido de los cursos se trata como datos no confiables, nunca como instrucciones.
- Las descargas tienen un límite de 15 MiB, solo HTTPS, y bloquean redes privadas.
- Canvas sigue aplicando tus permisos: solo puedes leer lo que ya ves.
- Los archivos que lee la IA los guarda tu proveedor de IA como parte de la conversación, bajo sus propias condiciones de privacidad. Borra el chat para eliminarlos.

Consulta la política de tu universidad sobre tokens personales y herramientas de terceros.

## Límites

- Archivos de más de 15 MiB no se pueden leer con el conector (límite de memoria de Cloudflare Worker); descárgalos y ábrelos con Claude Code.
- Gradescope, WebAssign, sitios externos, contenido bloqueado e internos de New Quizzes quedan fuera.
- Algunos cursos ocultan Archivos/Exámenes (403/404); lo enlazado desde Módulos suele funcionar.

## Desarrollo

`npm test` · `npm run check` · `npx wrangler deploy`. Los textos de la interfaz están en `i18n.mjs`. Mapa del código en [`AGENTS.md`](../AGENTS.md).

Desarrollado con ayuda de asistentes de programación con IA. Licencia MIT.
