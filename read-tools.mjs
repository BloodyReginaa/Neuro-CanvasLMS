// Additional read-only tools (everything beyond the core set in canvas.mjs).
// add(name, description, route, properties, required, query):
//   route    — string, or a function of the validated arguments returning the API path
//   query    — fixed query parameters, or a function mapping validated arguments to them
// Only arguments declared in `properties` can reach Canvas; the AI cannot add query parameters.
// A query function also gets { timeZone } (the user's Canvas time zone) as its second argument.
import { dayRange } from './time.mjs';
const id = { type: 'integer', minimum: 1 };
const text = { type: 'string', minLength: 1, maxLength: 250 };
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const choice = (...values) => ({ type: 'string', enum: values });
const listOf = p => ({ type: 'array', items: p, minItems: 1, maxItems: 20 });
const context = { context_type: choice('course', 'group'), context_id: id };
const ctx = a => `/${a.context_type}s/${a.context_id}`;
// Only these fixed routes and explicitly mapped parameters can reach Canvas.
export const extraSpecs = [];
function add(name, description, route, properties = {}, required = [], query = {}) {
  extraSpecs.push({ name: 'canvas_' + name, description, route, properties, required, query });
}
add(
  'course',
  'Read course syllabus, grading configuration and your visible enrollment scores.',
  a => `/courses/${a.course_id}`,
  { course_id: id },
  ['course_id'],
  { 'include[]': ['syllabus_body', 'total_scores', 'term', 'course_image'] },
);
add(
  'pages',
  'List the wiki pages of a course or group that you can see, with their page_url, title and update time. Many courses hide this list (401/403/404); then find pages through canvas_modules or canvas_find_files.',
  a => ctx(a) + '/pages',
  context,
  Object.keys(context),
);
add(
  'context_page',
  'Read an accessible course or group page; use page_url from the page list.',
  a => ctx(a) + '/pages/' + encodeURIComponent(a.page_url),
  { ...context, page_url: text },
  [...Object.keys(context), 'page_url'],
);
add(
  'front_page',
  'Read the front (home) page of a course or group in full. Often holds the schedule, office hours and links to slides; files it links are found by canvas_find_files.',
  a => ctx(a) + '/front_page',
  context,
  Object.keys(context),
);
add(
  'assignment_groups',
  "List a course's assignment groups (for example Homework, Exams) with their grade weights and drop rules (drop lowest/highest). Use with canvas_course_submissions to work out a weighted grade.",
  a => `/courses/${a.course_id}/assignment_groups`,
  { course_id: id },
  ['course_id'],
);
add(
  'submission',
  'Read your own submission, prior attempts, teacher comments, rubric feedback and saved what-if score. Does not mark feedback read.',
  a => `/courses/${a.course_id}/assignments/${a.assignment_id}/submissions/self`,
  { course_id: id, assignment_id: id },
  ['course_id', 'assignment_id'],
  {
    'include[]': [
      'submission_history',
      'submission_comments',
      'rubric_assessment',
      'student_entered_score',
    ],
  },
);
add(
  'course_submissions',
  "Your grades in one course, one compact row per assignment: name, group, score/points, due date, submitted or not, late, missing, excused, and the number of teacher comments; plus the assignment groups with their weights and drop rules. Pass full: true for the comments, rubric assessments and every field, or read one assignment's feedback with canvas_submission.",
  a => `/courses/${a.course_id}/students/submissions`,
  {
    course_id: id,
    full: {
      type: 'boolean',
      description: 'true: every field, with teacher comments and rubric assessments (large).',
    },
  },
  ['course_id'],
  a => ({
    'student_ids[]': ['self'],
    'include[]': a.full
      ? ['submission_comments', 'rubric_assessment', 'assignment', 'student_entered_score']
      : ['submission_comments', 'assignment'],
  }),
);
add(
  'enrollments',
  'Read your own enrollments and released course grades, one entry per course (several sections of one course are merged). Hidden grades remain hidden; a course with no total says so in grades_note.',
  '/users/self/enrollments',
);
add(
  'missing_submissions',
  'Assignments Canvas marks as missing (past due, not submitted in Canvas), one short row each with its course. Work handed in on an external tool such as Gradescope can be listed here by mistake: see submission_note. Pass full: true for every field (descriptions are in canvas_assignment).',
  '/users/self/missing_submissions',
  {
    full: {
      type: 'boolean',
      description: 'true: every field, with assignment descriptions (large).',
    },
  },
  [],
  { 'include[]': ['course'] },
);
add(
  'rubrics',
  'List the grading rubrics of a course that you can see, with their criteria and point ranges. For the feedback on your own work use canvas_submission.',
  a => `/courses/${a.course_id}/rubrics`,
  { course_id: id },
  ['course_id'],
);
add(
  'rubric',
  'Read one grading rubric, without requesting other students assessments.',
  a => `/courses/${a.course_id}/rubrics/${a.rubric_id}`,
  { course_id: id, rubric_id: id },
  ['course_id', 'rubric_id'],
);
add(
  'peer_reviews',
  'List the peer reviews of one assignment that are visible to you: the reviews you must do and the ones done on your work, with their status. Canvas only shows what your role allows.',
  a => `/courses/${a.course_id}/assignments/${a.assignment_id}/peer_reviews`,
  { course_id: id, assignment_id: id },
  ['course_id', 'assignment_id'],
);
add(
  'discussions',
  'List discussion topics in a course or group, with titles, authors, dates and reply counts; search_term filters by title. Announcements are read with canvas_announcements.',
  a => ctx(a) + '/discussion_topics',
  { ...context, search_term: text },
  Object.keys(context),
  a => ({ search_term: a.search_term }),
);
add(
  'discussion',
  'Read one discussion topic or announcement in full (message as text with links, author, dates). It does not mark it read. Replies are read with canvas_discussion_entries.',
  a => ctx(a) + `/discussion_topics/${a.topic_id}`,
  { ...context, topic_id: id },
  [...Object.keys(context), 'topic_id'],
);
add(
  'discussion_entries',
  'Read top-level discussion entries and initial replies. Use discussion_replies for complete paginated replies.',
  a => ctx(a) + `/discussion_topics/${a.topic_id}/entries`,
  { ...context, topic_id: id },
  [...Object.keys(context), 'topic_id'],
);
add(
  'discussion_replies',
  'Read the replies to one entry of a discussion, for threaded discussions. Take entry_id from canvas_discussion_entries.',
  a => ctx(a) + `/discussion_topics/${a.topic_id}/entries/${a.entry_id}/replies`,
  { ...context, topic_id: id, entry_id: id },
  [...Object.keys(context), 'topic_id', 'entry_id'],
);
add(
  'conversations',
  'List Canvas Inbox conversations (messages from teachers and classmates inside Canvas), newest first; scope picks unread, starred, archived or sent. This is Canvas messaging, not Gmail. Read one in full with canvas_conversation.',
  '/conversations',
  { scope: choice('unread', 'starred', 'archived', 'sent') },
  [],
  a => ({ scope: a.scope }),
);
add(
  'conversation',
  'Read a Canvas Inbox conversation and its messages WITHOUT marking it read.',
  a => `/conversations/${a.conversation_id}`,
  { conversation_id: id },
  ['conversation_id'],
  { auto_mark_as_read: 'false' },
);
add(
  'unread_count',
  'Read how many Canvas Inbox conversations are unread. This is Canvas messaging, not email. Read them with canvas_conversations (scope unread).',
  '/conversations/unread_count',
);
add(
  'activity_stream',
  'What is new across all your current courses, newest first: announcements, discussion posts, graded submissions (score, grade, teacher comments) and Inbox messages. The quickest answer to "any updates?" or "what\'s new?": one call instead of checking each course. Long texts are shortened. Nothing is marked read.',
  '/users/self/activity_stream',
  {},
  [],
  { only_active_courses: 'true' },
);
add(
  'calendar_events',
  'Calendar entries for a date range (YYYY-MM-DD, both days included). type "event" (default) reads calendar events such as lectures and office hours; type "assignment" reads assignment deadlines. Without context_codes only your personal calendar is read: pass course_<id> codes for course entries. For everything due across all courses, canvas_planner is simpler.',
  '/calendar_events',
  {
    start_date: date,
    end_date: date,
    type: choice('event', 'assignment'),
    context_codes: listOf({ type: 'string', pattern: '^(course|group|user)_[1-9][0-9]*$' }),
  },
  ['start_date', 'end_date'],
  a => ({
    start_date: a.start_date,
    end_date: a.end_date,
    type: a.type ?? 'event',
    'context_codes[]': a.context_codes,
  }),
);
add(
  'calendar_event',
  'Read one calendar event or appointment reservation in full: time, place, description and the course it belongs to. Take event_id from canvas_calendar_events.',
  a => `/calendar_events/${a.event_id}`,
  { event_id: id },
  ['event_id'],
);
add(
  'appointment_groups',
  'Read available Canvas appointment groups, times and your reservations; does not book anything.',
  '/appointment_groups',
  {},
  [],
  { 'include[]': ['appointments', 'reserved_times', 'participant_count'] },
);
add(
  'appointment_group',
  'Read one appointment group (sign-up slots a teacher offers, such as office hours or demos) with its available time slots and your reservations.',
  a => `/appointment_groups/${a.appointment_group_id}`,
  { appointment_group_id: id },
  ['appointment_group_id'],
);
add(
  'planner_notes',
  'Read your personal to-do notes (planner notes), optionally for a date range (YYYY-MM-DD, both days included).',
  '/planner_notes',
  { start_date: date, end_date: date },
  [],
  (a, o = {}) => dayRange(a.start_date, a.end_date, o.timeZone),
);
add(
  'planner_overrides',
  "List the marks you set on planner items: which ones you checked off as done or dismissed in Canvas's to-do list. Planner items themselves come from canvas_planner.",
  '/planner/overrides',
);
add(
  'todo',
  'Your Canvas to-do list as on the dashboard: assignments still to submit (and, for teachers, to grade).',
  '/users/self/todo',
);
add(
  'upcoming_events',
  'Your upcoming calendar events and assignment deadlines across all courses, as in the Canvas "Coming up" list (about the next week; no date input). Long descriptions are shortened. For a chosen date range use canvas_planner.',
  '/users/self/upcoming_events',
);
add(
  'files',
  'List or search accessible personal, course, group or folder files. File metadata includes download links.',
  a =>
    a.context_type === 'user' ? '/users/self/files' : `/${a.context_type}s/${a.context_id}/files`,
  { context_type: choice('user', 'course', 'group', 'folder'), context_id: id, search_term: text },
  ['context_type'],
  a => ({ search_term: a.search_term }),
);
add(
  'file',
  'Read file metadata and its Canvas-provided download URL. Use file_content to extract supported text.',
  a => `/files/${a.file_id}`,
  { file_id: id },
  ['file_id'],
);
add(
  'folders',
  "List folders: your personal files (context_type user), a course's or group's folders, or the subfolders of a folder (context_type folder with its id). Many courses hide their files; use canvas_find_files then.",
  a =>
    a.context_type === 'user'
      ? '/users/self/folders'
      : `/${a.context_type}s/${a.context_id}/folders`,
  { context_type: choice('user', 'course', 'group', 'folder'), context_id: id },
  ['context_type'],
);
add(
  'folder',
  "Read one folder's details: name, full path, parent folder and how many files and subfolders it holds. List its subfolders with canvas_folders (context_type folder).",
  a => `/folders/${a.folder_id}`,
  { folder_id: id },
  ['folder_id'],
);
add(
  'file_content',
  'Read text from a Canvas file: PDF text, DOCX, PPTX, XLSX, plain text or code, and ZIP archives (unpacked on the server: listing plus the text of every code/text/document file inside; pass `entry` to read one file from the listing). Max download 15 MiB; paginated text via offset. For scanned or handwritten PDFs use canvas_file_original. No external URL input.',
  a => `/files/${a.file_id}`,
  {
    file_id: id,
    offset: { type: 'integer', minimum: 0, maximum: 5000000 },
    max_chars: { type: 'integer', minimum: 1000, maximum: 30000 },
    entry: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      pattern: '^[^\\x00-\\x1f]+$',
      description:
        'ZIP only: path of one file inside the archive, exactly as shown in the listing.',
    },
  },
  ['file_id'],
);
add(
  'groups',
  'List the Canvas groups you belong to (project teams, study groups) with their ids and courses. Use the group id as context_id for group pages, files and discussions.',
  '/users/self/groups',
);
add(
  'group',
  "Read one group's details: name, description, course and member count. List its members with canvas_group_members.",
  a => `/groups/${a.group_id}`,
  { group_id: id },
  ['group_id'],
);
add(
  'group_members',
  'List the members of one group that you are allowed to see, with their names.',
  a => `/groups/${a.group_id}/users`,
  { group_id: id },
  ['group_id'],
);
add(
  'module',
  'Read one course module: its name, unlock date, prerequisites and your completion progress. It does not mark anything complete. List its items with canvas_module_items.',
  a => `/courses/${a.course_id}/modules/${a.module_id}`,
  { course_id: id, module_id: id },
  ['course_id', 'module_id'],
);
add(
  'module_item',
  'Read one module item: its type, title, link to the content and the requirement to complete it (view, submit, minimum score) with your status.',
  a => `/courses/${a.course_id}/modules/${a.module_id}/items/${a.item_id}`,
  { course_id: id, module_id: id, item_id: id },
  ['course_id', 'module_id', 'item_id'],
);
add(
  'quizzes',
  'Read accessible classic Canvas quiz metadata. New Quizzes and external platforms may only expose assignment metadata.',
  a => `/courses/${a.course_id}/quizzes`,
  { course_id: id },
  ['course_id'],
);
add(
  'quiz',
  'Read classic quiz instructions, dates and settings visible to you; never starts an attempt.',
  a => `/courses/${a.course_id}/quizzes/${a.quiz_id}`,
  { course_id: id, quiz_id: id },
  ['course_id', 'quiz_id'],
);
add(
  'quiz_submission',
  'Read your own existing classic quiz submission; never creates an attempt.',
  a => `/courses/${a.course_id}/quizzes/${a.quiz_id}/submission`,
  { course_id: id, quiz_id: id },
  ['course_id', 'quiz_id'],
  { 'include[]': ['submission', 'quiz'] },
);
add(
  'quiz_submission_questions',
  'Read questions and answers Canvas permits you to view for an existing quiz submission. Requires a submission id obtained from quiz_submission; does not unlock or start a quiz.',
  a => `/quiz_submissions/${a.quiz_submission_id}/questions`,
  { quiz_submission_id: id },
  ['quiz_submission_id'],
);
add(
  'settings',
  "Read your personal Canvas settings without changing them. For this connector's own version use canvas_connector_version.",
  '/users/self/settings',
);
add(
  'user',
  "Read your own user profile including timezone and locale. For this connector's own version use canvas_connector_version.",
  '/users/self',
);
add(
  'communication_channels',
  'List the places Canvas sends you notifications (email addresses, push, SMS) with their ids. Use an id with canvas_notification_preferences.',
  '/users/self/communication_channels',
);
add(
  'notification_preferences',
  'Read delivery frequency for a notification channel obtained from communication_channels.',
  a => `/users/self/communication_channels/${a.channel_id}/notification_preferences`,
  { channel_id: id },
  ['channel_id'],
);
add(
  'favorites',
  'List the courses you starred as favorites in Canvas (the ones on your dashboard). For every course use canvas_courses.',
  '/users/self/favorites/courses',
);
add(
  'favorite_groups',
  'List the groups you starred as favorites in Canvas.',
  '/users/self/favorites/groups',
);
add(
  'course_nicknames',
  'List the nicknames you gave courses in Canvas, so you can match a name like "Calc" to its course.',
  '/users/self/course_nicknames',
);
