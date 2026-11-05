# Conector de IA para Canvas

[English](../README.md) · [简体中文](README.zh-CN.md) · **Español** · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

Permite que **Claude** (web, escritorio, móvil, Claude Code) o **ChatGPT** lean tu Canvas, en un chat normal y no solo en una herramienta de programación.

> "¿Qué tengo que entregar esta semana?" · "Resume la clase 5 de MATH 132." · "¿Qué comentarios recibí en la tarea 3?" · "¿Hay anuncios nuevos?"

Escrito para estudiantes de UMass Amherst y probado con el Canvas de UMass Amherst. Debería funcionar en cualquier universidad que use Canvas: solo cambias una línea.

- **Solo lectura.** 58 herramientas, todas peticiones `GET` fijas. Nunca entrega tareas, envía mensajes ni modifica nada.
- **Solo tuyo.** Se ejecuta en tu propia cuenta gratuita de Cloudflare y se vincula a tu cuenta de Canvas.
- **Lee archivos reales.** PDF, Word, PowerPoint, Excel, incluidos apuntes escritos a mano o escaneados (la IA ve las páginas como imágenes).
- **Lo instala la IA.** Abre esta carpeta en Claude Code (o Codex) y di *"configura el conector de Canvas"*.

## Cómo funciona

```
Claude / ChatGPT  ──OAuth──▶  tu Worker de Cloudflare  ──API de solo lectura──▶  el Canvas de tu universidad
                               (este repo; guarda tu token de Canvas cifrado)
```

## Instalación (≈10 minutos; recomendado: que lo haga la IA)

Necesitas: una cuenta de Canvas, una [cuenta gratuita de Cloudflare](https://dash.cloudflare.com/sign-up), [Node.js 20+](https://nodejs.org) y Claude Code (o Codex).

```bash
git clone https://github.com/BloodyReginaa/canvas-ai-connector.git
cd canvas-ai-connector
claude
```

Di: **"Ayúdame a configurar el conector de Canvas."** Sigue [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md): revisa tu equipo, configura tu universidad, inicia sesión en Cloudflare (tú haces clic en Permitir), despliega y te guía para conectarlo. Nunca te pedirá tu token de Canvas.

<details><summary><b>Instalación manual</b></summary>

1. `npm install && npm test`
2. Edita `config.mjs`: `CANVAS_HOST` (p. ej. `umamherst.instructure.com`), `SCHOOL_NAME`, `ACCENT_COLOR`.
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV` → copia el id en `wrangler.jsonc`.
5. `npx wrangler deploy` → anota `https://canvas-ai-connector.<tú>.workers.dev`.
6. Conéctalo enseguida (la primera cuenta de Canvas que autorice será la propietaria).
</details>

## Conectarlo

1. **Crea un token de Canvas:** Canvas → Cuenta → Configuración → **+ Nuevo token de acceso**. En UMass Amherst dura como máximo **30 días**. Cópialo: solo se muestra una vez.
2. **Claude:** Configuración → Conectores → **Añadir conector personalizado** → URL `https://…workers.dev/mcp` → Conectar → pega el token en la página que se abre → Autorizar.
3. **ChatGPT:** añade un conector personalizado (modo desarrollador) con la misma URL.
4. Abre un chat nuevo y pregunta *"¿Qué tareas tengo esta semana?"*

**Cuando caduque el token:** crea uno nuevo, desconecta y vuelve a conectar el conector, y pégalo. No hace falta volver a desplegar.

## Privacidad y seguridad

- El token solo va a tu Worker y al Canvas de tu universidad; se guarda cifrado en tu Cloudflare KV. Nadie más (ni los autores) puede verlo.
- El Worker se vincula a la primera cuenta de Canvas que lo autoriza y rechaza las demás.
- Solo Claude, ChatGPT y clientes locales pueden completar OAuth.
- El contenido de los cursos se trata como datos no confiables, nunca como instrucciones.
- Las descargas tienen límite de tamaño (15 MiB), solo HTTPS, y bloquean redes privadas.
- Canvas sigue aplicando tus permisos: solo puedes leer lo que ya ves.

Consulta la política de tu universidad sobre tokens personales y herramientas de terceros.

## Límites

- Archivos de más de 15 MiB no se pueden leer con el conector; descárgalos y ábrelos con Claude Code.
- Gradescope, WebAssign, sitios externos, contenido bloqueado e internos de New Quizzes quedan fuera.
- Algunos cursos ocultan Archivos/Exámenes (403/404); lo enlazado desde Módulos suele funcionar.

## Desarrollo

`npm test` · `npm run check` · `npx wrangler deploy`. Los textos de la interfaz están en `i18n.mjs`. Mapa del código en [`AGENTS.md`](../AGENTS.md).

Desarrollado con ayuda de asistentes de programación con IA. Licencia MIT.
