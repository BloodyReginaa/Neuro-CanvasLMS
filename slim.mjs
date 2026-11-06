// Trims what a Canvas tool returns to what a student's AI can use. Canvas answers are written for
// its own web client: every assignment carries thirty teacher-only settings, the same description
// two or three times, an LTI token, and UTC times. This pass
//   - turns HTML fields into text (html-text.mjs), links kept;
//   - drops empty fields, Canvas internals and teacher-only settings (fixed lists below);
//   - writes every time in the user's own time zone ("Fri 2026-11-06 23:59 EST");
//   - in list tools shortens long descriptions, under a total budget, and says where the full
//     text is; the single-item tools keep the full text;
//   - points out assignments handed in outside Canvas (Gradescope etc.), where Canvas's own
//     "unsubmitted" is not to be trusted.
// Every tool accepts raw: true to skip all of this and get Canvas's JSON unchanged.
import { htmlToText, looksLikeHtml } from './html-text.mjs';
import { localTime, isTimeZone } from './time.mjs';
import { CANVAS_HOST } from './config.mjs';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

// ---- what is left out ---------------------------------------------------------------------------
// Fields with no meaning for a student's AI: Canvas and LTI internals, teacher-only grading and
// moderation settings, decoration, administration. (Names are Canvas API field names.)
const DROP = new Set(
  `secure_params external_tool_tag_attributes uuid root_account_id account_id anonymous_id
   migration_id final_grader_id grader_count graders_anonymous_to_graders
   grader_comments_visible_to_graders grader_names_visible_to_final_grader moderated_grading
   post_to_sis annotatable_attachment_id anonymous_instructor_annotations anonymize_students
   new_quizzes_anonymous_participants has_submitted_submissions graded_submissions_exist
   can_duplicate due_date_required max_name_length original_course_id original_assignment_id
   original_assignment_name original_quiz_id submissions_download_url suppress_assignment muted
   grader_id grading_period_id custom_grade_status_id sticker speedgrader_url quiz_extensions_url
   quiz_reports_url quiz_statistics_url message_students_url quiz_submission_versions_html_url
   mobile_url unpublishable version_number permissions editing_roles avatar_url avatar_image_url
   avatar_state thumbnail_url context_color context_image course_color image_download_url
   banner_image_download_url grade_passback_setting storage_quota_mb storage_quota_used_mb license
   homeroom_course template blueprint blueprint_restrictions blueprint_restrictions_by_object_type
   is_public is_public_to_auth_users public_syllabus public_syllabus_to_auth podcast_url
   podcast_has_student_posts topic_children group_topic_children root_topic_id allow_rating
   only_graders_can_rate sort_by_rating summary_enabled expanded expanded_locked sort_order
   sort_order_locked subscription_hold ungraded_discussion_overrides upload_status media_entry_id
   canvadoc_session_url crocodoc_session_url k5_user use_classic_font_in_k5 sortable_name
   asset_string can_unpublish can_lock can_group can_manage_content`
    .split(/\s+/)
    .filter(Boolean),
);
const DROP_PREFIX = /(?:^|_)(?:sis|lti|integration)_/; // sis_user_id, lti_context_id, course_integration_id…
// Settings whose usual value says nothing; the unusual value is kept.
const DEFAULTS = new Map(
  Object.entries({
    peer_reviews: false,
    anonymous_peer_reviews: false,
    automatic_peer_reviews: false,
    intra_group_peer_reviews: false,
    grade_group_students_individually: false,
    hide_in_gradebook: false,
    omit_from_final_grade: false,
    anonymous_grading: false,
    in_closed_grading_period: false,
    is_quiz_assignment: false,
    important_dates: false,
    only_visible_to_overrides: false,
    visible_to_everyone: true,
    post_manually: false,
    require_lockdown_browser: false,
    restrict_quantitative_data: false,
    published: true,
    quiz_lti: false,
    new_tab: false,
    grade_matches_current_submission: true,
    excused: false,
    redo_request: false,
    pinned: false,
    is_section_specific: false,
    comments_disabled: false,
    user_can_see_posts: true,
    require_initial_post: false,
    hidden: false,
    hidden_for_user: false,
    locked: false,
    all_day: false,
    blackout_date: false,
    has_overrides: false,
    indent: 0,
    child_events_count: 0,
    workflow_state: 'published',
    seconds_late: 0,
    anonymous_submissions: false,
    unassign_item: false,
    is_announcement: false,
    new_activity: false,
    category: 'uncategorized',
  }),
);
// null is kept where "none" is the answer to a question students ask.
const KEEP_NULL = new Set(['due_at', 'score', 'grade', 'submitted_at']);
// Fields that hold HTML (when they look like it; the same names hold plain text elsewhere).
const HTML_KEYS = new Set(
  'description message body syllabus_body question_text lock_explanation html long_description text'.split(
    ' ',
  ),
);
// Tools whose messages are plain text (Canvas Inbox), never HTML.
const PLAIN_TOOLS = new Set(['canvas_conversations', 'canvas_conversation']);

// ---- shortening in lists -------------------------------------------------------------------------
// List tools shorten `description`/`message` texts under one total budget (so a list of three
// comes back whole and a list of fifty does not flood the chat); the named tool has the full text.
const PREVIEW_TOOLS = new Map(
  Object.entries({
    canvas_assignments: 'canvas_assignment',
    canvas_upcoming_events: 'canvas_assignment (assignments) or canvas_calendar_event (events)',
    canvas_calendar_events: 'canvas_assignment (assignments) or canvas_calendar_event (events)',
    canvas_todo: 'canvas_assignment',
    canvas_missing_submissions: 'canvas_assignment',
    canvas_course_submissions: 'canvas_assignment',
    canvas_announcements: 'canvas_discussion',
    canvas_discussions: 'canvas_discussion',
    canvas_quizzes: 'canvas_quiz',
  }),
);
const PREVIEW_KEYS = new Set(['description', 'message']);
export const PREVIEW_BUDGET = 12000; // characters of description text per list result
export const PREVIEW_MIN = 400; // every item keeps at least this much
const DUPLICATE_MIN = 300; // a text repeated inside one result is written once

// ---- external tools -------------------------------------------------------------------------------
const TOOL_NAMES = [
  [/gradescope/i, 'Gradescope'],
  [/webassign/i, 'WebAssign'],
  [/zybooks/i, 'zyBooks'],
  [/mheducation|mcgraw/i, 'McGraw Hill'],
  [/pearson|mylab|mastering/i, 'Pearson'],
  [/cengage/i, 'Cengage'],
  [/macmillan|achieve/i, 'Macmillan'],
  [/turnitin/i, 'Turnitin'],
  [/perusall/i, 'Perusall'],
  [/piazza/i, 'Piazza'],
  [/edstem|edusercontent/i, 'Ed Discussion'],
  [/codio/i, 'Codio'],
  [/vocareum/i, 'Vocareum'],
  [/kaltura/i, 'Kaltura'],
  [/panopto/i, 'Panopto'],
  [/zoom\./i, 'Zoom'],
];
function externalToolName(url) {
  if (typeof url !== 'string') return '';
  for (const [re, label] of TOOL_NAMES) if (re.test(url)) return label;
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
export const EXTERNAL_TOOL_NOTE =
  'handed in through this external tool, not in Canvas: Canvas may show it as unsubmitted or missing even after it was submitted there, so do not tell the user it is not done; the tool itself has the real status';
export const NO_SUBMISSION_NOTE =
  'nothing is handed in through Canvas (on paper or no submission), so "unsubmitted" is normal';
function submissionNote(o) {
  const types = Array.isArray(o.submission_types) ? o.submission_types : null;
  if (!types?.length) return undefined;
  if (types.includes('external_tool')) {
    const url = o.external_tool_tag_attributes?.url;
    if (o.is_quiz_lti_assignment || o.quiz_lti || /quiz-lti|quiz_lti/i.test(url ?? ''))
      return undefined;
    const tool = externalToolName(url);
    return (tool ? `${tool}: ` : '') + EXTERNAL_TOOL_NOTE;
  }
  if (types.every(t => t === 'on_paper' || t === 'none')) return NO_SUBMISSION_NOTE;
  return undefined;
}

// ---- the pass -------------------------------------------------------------------------------------
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanValue(v, key, ctx) {
  if (v === undefined) return undefined;
  if (v === null) return KEEP_NULL.has(key) ? null : undefined;
  if (typeof v === 'string') return cleanString(v, key, ctx);
  if (Array.isArray(v)) {
    const out = [];
    for (const x of v) {
      const c = cleanValue(x, key, ctx);
      if (c !== undefined) out.push(c);
    }
    return out.length ? out : undefined;
  }
  if (typeof v === 'object') return cleanObject(v, ctx);
  return v;
}

function cleanString(v, key, ctx) {
  if (v === '') return undefined;
  if (ctx.zone && v.length <= 30 && ISO_UTC.test(v)) return localTime(v, ctx.zone);
  if (ctx.html && (HTML_KEYS.has(key) || key.endsWith('_html')) && looksLikeHtml(v)) {
    const t = htmlToText(v, ctx.base);
    return t === '' ? undefined : t;
  }
  if (key === 'html_url' && v[0] === '/') return ctx.base + v;
  return v;
}

function cleanObject(o, ctx) {
  // The same text under two names: a calendar entry repeats its assignment's description, a
  // graded discussion's assignment repeats the topic's message. Keep the outer one.
  const described =
    (typeof o.description === 'string' && o.description !== '') ||
    (typeof o.message === 'string' && o.message !== '');
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (DROP.has(k) || DROP_PREFIX.test(k)) continue;
    if (DEFAULTS.has(k) && v === DEFAULTS.get(k)) continue;
    if (k === 'calendar' && isObject(v) && 'ics' in v) continue; // a feed link: a pass, like verifier=
    if ((k === 'url' || k.endsWith('_url')) && typeof v === 'string') {
      if (v.startsWith(ctx.api)) continue; // API addresses: the AI cannot open them, the tools do
      if (k === 'url' && v === o.html_url) continue;
    }
    let value = v;
    if (described && isObject(v) && (k === 'assignment' || k === 'discussion_topic')) {
      value = { ...v };
      delete value[k === 'assignment' ? 'description' : 'message'];
      if (isObject(value.discussion_topic)) {
        value.discussion_topic = { ...value.discussion_topic };
        delete value.discussion_topic.message;
      }
    }
    if (ctx.list && k === 'rubric' && Array.isArray(v)) {
      out.rubric = `[rubric with ${v.length} criteria; read it with ${ctx.full}]`;
      continue;
    }
    if (ctx.list && k === 'rubric_settings') continue;
    const c = cleanValue(value, k, ctx);
    if (c !== undefined) out[k] = c;
  }
  const note = submissionNote(o);
  if (note) out.submission_note = note;
  return Object.keys(out).length ? out : undefined;
}

// Shorten the description texts of a list under the budget: the longest ones give first.
function shortenPreviews(items, full) {
  const found = [];
  const walk = v => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (isObject(v))
      for (const [k, x] of Object.entries(v)) {
        if (PREVIEW_KEYS.has(k) && typeof x === 'string') found.push([v, k]);
        else walk(x);
      }
  };
  walk(items);
  const lengths = found.map(([o, k]) => o[k].length);
  if (lengths.reduce((a, b) => a + b, 0) <= PREVIEW_BUDGET) return;
  // The cap that brings the total to the budget, never below the per-item minimum.
  const sorted = [...lengths].sort((a, b) => a - b);
  let cap = PREVIEW_MIN;
  let used = 0;
  for (let i = 0; i < sorted.length; i++) {
    const rest = sorted.length - i; // items at least this long
    const even = (PREVIEW_BUDGET - used) / rest; // what each of them may take
    if (even <= sorted[i]) {
      cap = Math.max(PREVIEW_MIN, Math.floor(even));
      break;
    }
    used += sorted[i];
  }
  for (const [o, k] of found) {
    const t = o[k];
    if (t.length <= cap + 40) continue;
    const at = Math.max(cap - 80, t.lastIndexOf(' ', cap));
    const short = t.slice(0, at).trimEnd();
    o[k] = `${short}… [shortened, ${t.length - short.length} more characters; full text: ${full}]`;
  }
}

// A long text that appears twice in one result is written once; the second says where.
function dedupe(data) {
  const seen = new Map();
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (isObject(v))
      for (const [k, x] of Object.entries(v)) {
        const p = `${path}.${k}`;
        if (typeof x === 'string' && x.length >= DUPLICATE_MIN) {
          if (seen.has(x)) v[k] = `[same text as ${seen.get(x)}]`;
          else seen.set(x, p);
        } else walk(x, p);
      }
  };
  walk(data, 'data');
}

// result: what canvasGet returned ({ data, has_more, next_page, api_url, note? }).
export function slim(name, result, { timeZone, now = new Date() } = {}) {
  const zone = isTimeZone(timeZone) ? timeZone : null;
  const base = 'https://' + CANVAS_HOST;
  const list = PREVIEW_TOOLS.has(name) && Array.isArray(result.data);
  const ctx = {
    zone,
    base,
    api: base + '/api/',
    html: !PLAIN_TOOLS.has(name),
    list,
    full: PREVIEW_TOOLS.get(name),
  };
  let data = cleanValue(result.data, 'data', ctx);
  if (data === undefined) data = Array.isArray(result.data) ? [] : result.data === null ? null : {};
  dedupe(data);
  if (list) shortenPreviews(data, ctx.full);
  const out = { ...result, data };
  if (zone) {
    out.time_zone = zone;
    out.now = localTime(now, zone);
  }
  return out;
}
