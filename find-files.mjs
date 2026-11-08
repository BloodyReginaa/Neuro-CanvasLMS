// canvas_find_files: find a course's files by name even when the course hides its Files or Pages
// lists from students (403/404). Many courses do: the files are then only reachable through links
// on the front page, the syllabus, modules, assignments, announcements and the pages those link to.
// This reads exactly those fixed GET routes of ONE course on the configured Canvas host, follows
// links to pages of the same course, and collects every Canvas file link with where it was found.
// It never fetches anything outside the Canvas API; external links are only reported.
import { canvasGet, origin } from './canvas.mjs';
import { CANVAS_HOST } from './config.mjs';
import { decodeEntities } from './html-text.mjs';

// Cloudflare's free plan allows 50 outgoing requests per call; stay well below it.
export const MAX_REQUESTS = 30;
const MAX_FILES = 200;
const MAX_EXTERNAL = 50;
const MAX_PLACES = 3; // places listed per file
const PAGE_BATCH = 5; // linked pages fetched in parallel

export const findFilesTool = {
  name: 'canvas_find_files',
  description:
    "Find files in a course by name or topic, including courses that hide their Files or Pages list from students (canvas_files / canvas_pages return 403 or 404). Searches the course's front page, syllabus, modules, assignments, announcements, page list and the course pages they link to, plus the Files list when visible, and returns each Canvas file_id with its name and where it is linked. Then read a file with canvas_file_content (text, PDF/Office, ZIP) or canvas_file_original (original bytes). Omit query to list every linked file. Links to other sites (e.g. Dropbox) are listed separately.",
  inputSchema: {
    type: 'object',
    properties: {
      course_id: { type: 'integer', minimum: 1 },
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description:
          'Words from the file name or topic, e.g. "lecture 5", "hw3.zip", "midterm review". All words must match.',
      },
    },
    required: ['course_id'],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

export { decodeEntities };
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3]) : null;
};
const plainText = html =>
  decodeEntities(String(html).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
// Links to this Canvas. A school on its own domain is also reachable as <school>.instructure.com and
// course content may use either; only the IDs are taken from a link, every read still goes to
// CANVAS_HOST.
const canvasURL = raw => {
  if (!raw) return null;
  try {
    const u = new URL(raw, origin());
    const ours = u.hostname === CANVAS_HOST || u.hostname.endsWith('.instructure.com');
    return u.protocol === 'https:' && ours ? u : null;
  } catch {
    return null;
  }
};
// /courses/1/files/2, /files/2/download, /users/1/files/2, /api/v1/courses/1/files/2 → 2
function canvasFileId(raw) {
  const m = canvasURL(raw)?.pathname.match(
    /^\/(?:api\/v1\/)?(?:(?:courses|groups|users)\/\d+\/)?files\/(\d{1,15})(?:\/|$)/,
  );
  const n = m ? Number(m[1]) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
// /courses/<this course>/pages/<slug> → slug (pages of other courses are never followed)
function coursePage(raw, courseId) {
  const m = canvasURL(raw)?.pathname.match(
    /^\/(?:api\/v1\/)?courses\/(\d+)\/(?:pages|wiki)\/([^/]+)\/?$/,
  );
  if (!m || Number(m[1]) !== courseId) return null;
  try {
    const slug = decodeURIComponent(m[2]);
    return slug.length <= 250 ? slug : null;
  } catch {
    return null;
  }
}
const FILE_HOSTS =
  /(^|\.)(dropbox\.com|drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com|box\.com|github\.com)$/i;
const FILE_EXT =
  /\.(pdf|zip|pptx?|docx?|xlsx?|csv|txt|md|ipynb|py|java|c|cpp|h|js|tar|gz|tgz|7z|rar)$/i;
export function externalFileLink(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || u.hostname === CANVAS_HOST) return null;
  return FILE_HOSTS.test(u.hostname) || FILE_EXT.test(u.pathname) ? u.href.slice(0, 500) : null;
}
const looksLikeFilename = s => /\.[a-z0-9]{1,5}$/i.test(s ?? '');
const pickName = (title, label) =>
  [title, label].find(looksLikeFilename) ?? (title || label || null);

// Every link in a piece of Canvas HTML: Canvas files, pages of this course, external file links.
export function scanHtml(html, courseId) {
  const out = { files: [], pages: [], external: [] };
  for (const m of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const tag = m[1];
    const label = plainText(m[2]).slice(0, 200);
    const title = attr(tag, 'title')?.slice(0, 200) ?? '';
    const href = attr(tag, 'href');
    const api = attr(tag, 'data-api-endpoint');
    const fileId = canvasFileId(href) ?? canvasFileId(api);
    if (fileId) {
      out.files.push({ file_id: fileId, name: pickName(title, label), link_text: label });
      continue;
    }
    const slug = coursePage(href, courseId) ?? coursePage(api, courseId);
    if (slug) {
      out.pages.push(slug);
      continue;
    }
    const url = externalFileLink(href);
    if (url) out.external.push({ title: title || label || null, url });
  }
  return out;
}

const norm = s =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[_\-.,:;()[\]]+/g, ' ');
// Every query word must appear. A number must be the whole number: "5" matches "Lecture 5" and
// "hw5" but not "Lecture 15" or "2025". Spaces are ignored too, so "lecture5" finds "Lecture 5".
const escape = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = w =>
  new RegExp((/^\d/.test(w) ? '(?<!\\d)' : '') + escape(w) + (/\d$/.test(w) ? '(?!\\d)' : ''));
const matchesAll = (words, hay) => {
  const h = norm(hay);
  const squeezed = h.replace(/\s+/g, '');
  return words.every(w => {
    const p = wordPattern(w);
    return p.test(h) || (!/^\d+$/.test(w) && p.test(squeezed));
  });
};
const placeText = p => [p.title, p.module].filter(Boolean).join(' ');

export async function findFiles(args, token, fetcher) {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error('Invalid arguments');
  for (const k of Object.keys(args))
    if (k !== 'course_id' && k !== 'query')
      throw new Error(
        'Unexpected argument: ' +
          String(k)
            .slice(0, 40)
            .replace(/[^\w-]/g, '?'),
      );
  const c = args.course_id;
  if (!Number.isSafeInteger(c) || c < 1) throw new Error('Invalid course_id');
  const q = args.query;
  if (q !== undefined && (typeof q !== 'string' || !q.trim() || q.length > 100))
    throw new Error('Invalid query');
  const words = q ? norm(q).split(/\s+/).filter(Boolean) : [];

  let requests = 0;
  let complete = true;
  const get = async (path, query = {}, page) => {
    if (requests >= MAX_REQUESTS) {
      complete = false;
      return null;
    }
    requests++;
    const u = new URL('/api/v1' + path, origin());
    for (const [k, v] of Object.entries(query)) u.searchParams.append(k, String(v));
    u.searchParams.set('per_page', '50');
    if (page) u.searchParams.set('page', String(page));
    return canvasGet(u, token, fetcher);
  };
  const searched = {};
  // A source being hidden or not enabled (401/403/404) is normal. A source that failed (timeout,
  // network, rate limit, Canvas error) was not searched: the result is then incomplete, and if
  // nothing could be searched at all the error is passed on instead of an empty "complete" list.
  // An expired token, a rate limit or an HTML error page (Canvas down, a firewall) stops everything.
  const failures = [];
  const hidden = e => [401, 403, 404].includes(e.status);
  const stops = e =>
    e.rateLimited || /authorization expired|HTML error page/.test(e?.message ?? '');
  const attempt = async (source, run) => {
    try {
      const n = await run();
      searched[source] = n === undefined ? 'ok' : `ok (${n})`;
    } catch (e) {
      if (stops(e)) throw e;
      if (hidden(e)) searched[source] = `not available (HTTP ${e.status})`;
      else {
        failures.push(e);
        complete = false;
        searched[source] = e.status ? `failed (HTTP ${e.status})` : 'failed';
      }
    }
  };
  const pagesOf = async (path, query, maxPages, each) => {
    let page,
      n = 0;
    for (let i = 0; i < maxPages; i++) {
      const r = await get(path, query, page);
      if (!r) break;
      for (const x of [].concat(r.data ?? [])) {
        each(x);
        n++;
      }
      if (!r.next_page) break;
      if (i === maxPages - 1) complete = false;
      page = r.next_page;
    }
    return n;
  };

  const files = new Map();
  const external = [];
  const known = new Set(); // page slugs already queued
  const read = new Set(); // page slugs whose body was already scanned
  const queue = [];
  const markRead = slug => {
    if (typeof slug !== 'string') return;
    known.add(slug);
    read.add(slug);
  };
  const enqueue = slug => {
    if (!known.has(slug)) {
      known.add(slug);
      queue.push(slug);
    }
  };
  const addFile = (f, where) => {
    let e = files.get(f.file_id);
    if (!e) {
      if (files.size >= MAX_FILES) {
        complete = false;
        return;
      }
      e = { file_id: f.file_id, name: f.name ?? null, found_in: [] };
      if (f.link_text && f.link_text !== f.name) e.link_text = f.link_text;
      files.set(f.file_id, e);
    } else if (!looksLikeFilename(e.name) && looksLikeFilename(f.name)) e.name = f.name;
    const key = JSON.stringify(where);
    if (e.found_in.length < MAX_PLACES && !e.found_in.some(p => JSON.stringify(p) === key))
      e.found_in.push(where);
  };
  // Where a link was written, as canvas_link_content takes it (link-content.mjs).
  const linkSource = where =>
    where.type === 'syllabus'
      ? { source: 'syllabus' }
      : where.type === 'page'
        ? where.page_url
          ? { source: 'page', source_id: where.page_url }
          : { source: 'front_page' }
        : where.type === 'assignment' && Number.isSafeInteger(where.assignment_id)
          ? { source: 'assignment', source_id: String(where.assignment_id) }
          : where.type === 'announcement' && Number.isSafeInteger(where.topic_id)
            ? { source: 'discussion', source_id: String(where.topic_id) }
            : null;
  const addExternal = (x, where) => {
    if (external.length < MAX_EXTERNAL && !external.some(y => y.url === x.url)) {
      const from = linkSource(where);
      external.push({
        ...x,
        found_in: where,
        ...(from
          ? { read_with: { tool: 'canvas_link_content', course_id: c, ...from, url: x.url } }
          : {}),
      });
    }
  };
  const addHtml = (html, where) => {
    const r = scanHtml(html, c);
    for (const f of r.files) addFile(f, where);
    for (const slug of r.pages) enqueue(slug);
    for (const x of r.external) addExternal(x, where);
  };
  const modulesWithoutItems = [];
  const addModuleItems = (m, items) => {
    for (const it of items) {
      const where = { type: 'module', module: m.name ?? null, module_id: m.id, item_id: it.id };
      if (it.type === 'File' && Number.isSafeInteger(it.content_id))
        addFile({ file_id: it.content_id, name: it.title ?? null }, where);
      else if (it.type === 'Page' && typeof it.page_url === 'string') enqueue(it.page_url);
      else if (it.type === 'ExternalUrl' && it.external_url) {
        const url = String(it.external_url).slice(0, 500);
        if (external.length < MAX_EXTERNAL && !external.some(y => y.url === url))
          external.push({
            title: it.title ?? null,
            url,
            found_in: where,
            read_with: {
              tool: 'canvas_module_file_content',
              course_id: c,
              module_id: m.id,
              item_id: it.id,
            },
          });
      }
    }
  };
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '');

  await Promise.all([
    attempt('front_page', async () => {
      const r = await get(`/courses/${c}/front_page`);
      if (!r) return;
      markRead(r.data?.url);
      addHtml(r.data?.body, {
        type: 'page',
        title: r.data?.title ?? 'Front page',
        page_url: r.data?.url ?? null,
      });
    }),
    attempt('syllabus', async () => {
      const r = await get(`/courses/${c}`, { 'include[]': 'syllabus_body' });
      if (r) addHtml(r.data?.syllabus_body, { type: 'syllabus' });
    }),
    attempt('modules', () =>
      pagesOf(`/courses/${c}/modules`, { 'include[]': 'items' }, 3, m => {
        if (!Number.isSafeInteger(m?.id)) return;
        if (Array.isArray(m.items)) addModuleItems(m, m.items);
        else modulesWithoutItems.push(m); // Canvas leaves out items when a module has too many
      }),
    ),
    attempt('assignments', () =>
      pagesOf(`/courses/${c}/assignments`, {}, 2, a =>
        addHtml(a?.description, {
          type: 'assignment',
          title: a?.name ?? null,
          assignment_id: a?.id,
        }),
      ),
    ),
    attempt('announcements', () =>
      pagesOf(`/courses/${c}/discussion_topics`, { only_announcements: 'true' }, 1, t =>
        addHtml(t?.message, { type: 'announcement', title: t?.title ?? null, topic_id: t?.id }),
      ),
    ),
    attempt('page_list', () =>
      pagesOf(`/courses/${c}/pages`, { 'include[]': 'body' }, 2, p => {
        if (typeof p?.url !== 'string') return;
        if (typeof p.body === 'string') {
          markRead(p.url);
          addHtml(p.body, { type: 'page', title: p.title ?? null, page_url: p.url });
        } else enqueue(p.url);
      }),
    ),
    attempt('course_files', () =>
      pagesOf(`/courses/${c}/files`, longest.length >= 2 ? { search_term: longest } : {}, 1, f => {
        if (Number.isSafeInteger(f?.id))
          addFile(
            { file_id: f.id, name: f.display_name ?? f.filename ?? null },
            { type: 'course_files', folder_id: f.folder_id ?? null },
          );
      }),
    ),
  ]);

  for (const m of modulesWithoutItems)
    await attempt(`module_${m.id}`, () =>
      pagesOf(`/courses/${c}/modules/${m.id}/items`, {}, 2, it => addModuleItems(m, [it])),
    );

  // Pages linked from everything above, breadth first, never outside this course.
  let pagesRead = 0,
    pagesUnavailable = 0,
    pagesFailed = 0;
  while (queue.length) {
    const batch = queue.splice(0, PAGE_BATCH).filter(slug => !read.has(slug));
    await Promise.all(
      batch.map(async slug => {
        try {
          const r = await get(`/courses/${c}/pages/${encodeURIComponent(slug)}`);
          if (!r) return;
          pagesRead++;
          markRead(slug);
          markRead(r.data?.url);
          addHtml(r.data?.body, {
            type: 'page',
            title: r.data?.title ?? null,
            page_url: r.data?.url ?? slug,
          });
        } catch (e) {
          if (stops(e)) throw e;
          if (hidden(e)) pagesUnavailable++;
          else {
            failures.push(e);
            complete = false;
            pagesFailed++;
          }
        }
      }),
    );
    if (requests >= MAX_REQUESTS && queue.length) {
      complete = false;
      break;
    }
  }
  searched.linked_pages =
    `${pagesRead} read` +
    (pagesUnavailable ? `, ${pagesUnavailable} not available` : '') +
    (pagesFailed ? `, ${pagesFailed} failed` : '');
  const sources = Object.entries(searched).filter(([k]) => k !== 'linked_pages');
  // Nothing could be searched: say why instead of "no files, complete".
  if (failures.length && !pagesRead && !sources.some(([, v]) => v.startsWith('ok'))) {
    const e = failures.find(x => /^Canvas/.test(x.message ?? '')) ?? failures[0];
    throw /^Canvas/.test(e.message ?? '')
      ? e
      : new Error(`Canvas could not be searched (${e.name}). Try again in a minute.`);
  }
  // Every source 404: most likely not a course this user is in.
  const wrongCourse =
    !files.size && sources.length && sources.every(([, v]) => v === 'not available (HTTP 404)');

  let list = [...files.values()];
  let matchedOn = null;
  let ext = external;
  if (words.length) {
    const byName = list.filter(f => matchesAll(words, `${f.name ?? ''} ${f.link_text ?? ''}`));
    const byPlace = list.filter(f =>
      matchesAll(
        words,
        `${f.name ?? ''} ${f.link_text ?? ''} ${f.found_in.map(placeText).join(' ')}`,
      ),
    );
    matchedOn = byName.length ? 'file name' : byPlace.length ? 'where the file is linked' : null;
    list = byName.length ? byName : byPlace;
    ext = external.filter(x =>
      matchesAll(words, `${x.title ?? ''} ${x.url} ${placeText(x.found_in)}`),
    );
  }
  return {
    course_id: c,
    query: q ?? null,
    ...(matchedOn ? { matched_on: matchedOn } : {}),
    files: list,
    files_linked_in_course: files.size,
    external_links: ext,
    searched,
    complete,
    ...(failures.length
      ? {
          note: `Some places could not be searched (they failed, see searched: ${failures.length} failed request${failures.length > 1 ? 's' : ''}), so a file missing here may still exist. Try again in a minute before telling the user it is not there.`,
        }
      : complete
        ? {}
        : {
            note: `Stopped after ${requests} Canvas requests; some linked pages or lists were not searched. Open more pages with canvas_context_page or canvas_module_items if the file is not listed.`,
          }),
    ...(wrongCourse
      ? {
          course_note:
            'Every part of this course answered 404: check the course_id (canvas_courses lists the user’s courses).',
        }
      : {}),
    how_to_read:
      'Read a file_id with canvas_file_content (text from PDF/Office/code, ZIP listing and contents) or canvas_file_original (original bytes, e.g. scanned PDFs). An external link with read_with: call the tool it names with those arguments for its text (Google Docs/Slides/Sheets/Drive, Dropbox, GitHub, direct file links); for a module item canvas_module_file gives the original file. Other external links cannot be read by this connector: give the user the link.',
  };
}
