// canvas_link_content: the text of a file that course content links to on another site — a
// syllabus pointing at a Dropbox PDF, a page pointing at Google Docs. Module ExternalUrl items have
// canvas_module_file_content; this covers links written into the syllabus, the front page, a page,
// an assignment or an announcement/discussion.
// Not a URL fetcher: the AI names where the link is and the link itself, the connector reads that
// place from Canvas and goes on only if the same link is really there (as a link or as a plain
// address in the text) and points at a file host or a file (find-files.mjs externalFileLink). The
// download then goes through the same checks as every other one (module-file.mjs).
import { callCanvas } from './canvas.mjs';
import { scanHtml, externalFileLink, decodeEntities } from './find-files.mjs';
import { readLinkedText, textOptions } from './module-file.mjs';

const id = { type: 'integer', minimum: 1 };
const SOURCES = ['syllabus', 'front_page', 'page', 'assignment', 'discussion'];
export const linkContentTool = {
  name: 'canvas_link_content',
  description:
    'Read the TEXT of a file that a course links to on another site, from a link written in the syllabus, the front page, a page, an assignment or an announcement/discussion: Google Docs, Slides and Sheets, Google Drive files, Dropbox files and folders, GitHub files and repositories, or a direct link to a PDF/Office/ZIP/code file. Give where the link is (source, and source_id: the page_url for a page, the assignment_id or the discussion/announcement topic_id) and the link exactly as it appears there; only a link that really is in that Canvas content is read. canvas_find_files lists such links with these arguments (read_with). Google and Dropbox files must be shared publicly ("Anyone with the link"). For module items use canvas_module_file_content. Same text options as canvas_file_content (offset, max_chars, entry for ZIPs).',
  inputSchema: {
    type: 'object',
    properties: {
      course_id: id,
      source: { type: 'string', enum: SOURCES },
      source_id: {
        type: 'string',
        minLength: 1,
        maxLength: 250,
        pattern: '^[^\\x00-\\x1f]+$',
        description:
          'page: its page_url; assignment: the assignment_id; discussion: the topic_id. Not used for syllabus and front_page.',
      },
      url: { type: 'string', minLength: 8, maxLength: 500, pattern: '^https?://' },
      ...textOptions,
    },
    required: ['course_id', 'source', 'url'],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

// The HTML of the named place, read from Canvas (raw: the links as Canvas stores them).
async function sourceHtml(args, token, apiFetch) {
  const c = args.course_id;
  const need = () => {
    if (args.source_id === undefined)
      throw new Error(`Missing source_id (the ${args.source === 'page' ? 'page_url' : 'id'}).`);
    return args.source_id;
  };
  const num = () => {
    const n = Number(need());
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid source_id');
    return n;
  };
  const get = async (name, a) =>
    (await callCanvas(name, { ...a, raw: true }, token, apiFetch)).data;
  switch (args.source) {
    case 'syllabus':
      return { html: (await get('canvas_course', { course_id: c }))?.syllabus_body };
    case 'front_page': {
      const p = await get('canvas_front_page', { context_type: 'course', context_id: c });
      return { html: p?.body, title: p?.title };
    }
    case 'page': {
      const p = await get('canvas_context_page', {
        context_type: 'course',
        context_id: c,
        page_url: need(),
      });
      if (p?.locked_for_user) throw new Error('Canvas: this page is locked for you.');
      return { html: p?.body, title: p?.title };
    }
    case 'assignment': {
      const a = await get('canvas_assignment', { course_id: c, assignment_id: num() });
      if (a?.locked_for_user) throw new Error('Canvas: this assignment is locked for you.');
      return { html: a?.description, title: a?.name };
    }
    case 'discussion': {
      const t = await get('canvas_discussion', {
        context_type: 'course',
        context_id: c,
        topic_id: num(),
      });
      if (t?.locked_for_user) throw new Error('Canvas: this discussion is locked for you.');
      return { html: t?.message, title: t?.title };
    }
    default:
      throw new Error('Invalid source');
  }
}

// Every file link in a piece of Canvas HTML: <a href> links and addresses written as plain text.
export function fileLinksIn(html, courseId) {
  const links = new Map();
  for (const x of scanHtml(html, courseId).external) links.set(x.url, x.title);
  const text = decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' '));
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>()[\]{}]+/g)) {
    const url = externalFileLink(m[0].replace(/[.,;:!?]+$/, ''));
    if (url && !links.has(url)) links.set(url, null);
  }
  return links;
}

const same = (a, b) => {
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
};

export async function linkContent(args, token, apiFetch, options = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error('Invalid arguments');
  const allowed = Object.keys(linkContentTool.inputSchema.properties);
  for (const k of Object.keys(args))
    if (!allowed.includes(k))
      throw new Error(
        'Unexpected argument: ' +
          String(k)
            .slice(0, 40)
            .replace(/[^\w-]/g, '?'),
      );
  if (!Number.isSafeInteger(args.course_id) || args.course_id < 1)
    throw new Error('Invalid course_id');
  if (!SOURCES.includes(args.source)) throw new Error('Invalid source');
  const url = args.url;
  if (typeof url !== 'string' || url.length < 8 || url.length > 500 || !/^https?:\/\//.test(url))
    throw new Error('Invalid url');
  const sid = args.source_id;
  if (sid !== undefined && (typeof sid !== 'string' || !sid.length || sid.length > 250))
    throw new Error('Invalid source_id');

  const place = await sourceHtml(args, token, apiFetch);
  const links = fileLinksIn(place.html, args.course_id);
  const found = [...links.keys()].find(l => same(l, url));
  if (!found) {
    const list = [...links.keys()].slice(0, 15);
    throw new Error(
      `Canvas file: this link is not in that ${args.source.replace('_', ' ')} (only links that the course content itself contains can be read). ` +
        (list.length
          ? `File links there: ${list.join(' , ')}`
          : 'It links to no files on other sites; canvas_find_files lists where the course links to files.'),
    );
  }
  const text = Object.fromEntries(
    ['offset', 'max_chars', 'entry'].filter(k => args[k] !== undefined).map(k => [k, args[k]]),
  );
  return readLinkedText(found, links.get(found) ?? place.title, text, options, {
    linked_from: {
      source: args.source,
      ...(sid !== undefined ? { source_id: sid } : {}),
      ...(place.title ? { title: place.title } : {}),
    },
    original: 'Opening the link gives',
    originalHint: 'Give the user the link to open the file itself.',
  });
}
