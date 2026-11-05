// Additional read-only tools (everything beyond the core set in canvas.mjs).
// add(name, description, route, properties, required, query):
//   route    — string, or a function of the validated arguments returning the API path
//   query    — fixed query parameters, or a function mapping validated arguments to them
// Only arguments declared in `properties` can reach Canvas; the AI cannot add query parameters.
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
  'List accessible course or group pages.',
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
  'Read the front page of a course or group.',
  a => ctx(a) + '/front_page',
  context,
  Object.keys(context),
);
add(
  'assignment_groups',
  'Read assignment groups and grade weights.',
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
  'List your own submissions and feedback for a course.',
  a => `/courses/${a.course_id}/students/submissions`,
  { course_id: id },
  ['course_id'],
  {
    'student_ids[]': ['self'],
    'include[]': [
      'submission_comments',
      'rubric_assessment',
      'assignment',
      'student_entered_score',
    ],
  },
);
add(
  'enrollments',
  'Read your own enrollments and released course grades. Hidden grades remain hidden.',
  '/users/self/enrollments',
);
add(
  'missing_submissions',
  'Read your missing assignments.',
  '/users/self/missing_submissions',
  {},
  [],
  { 'include[]': ['course'] },
);
add(
  'rubrics',
  'List accessible grading rubrics for a course.',
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
  'Read peer review assignments visible to you; Canvas enforces access.',
  a => `/courses/${a.course_id}/assignments/${a.assignment_id}/peer_reviews`,
  { course_id: id, assignment_id: id },
  ['course_id', 'assignment_id'],
);
add(
  'discussions',
  'Read discussion topics in a course or group.',
  a => ctx(a) + '/discussion_topics',
  { ...context, search_term: text },
  Object.keys(context),
  a => ({ search_term: a.search_term }),
);
add(
  'discussion',
  'Read one discussion or announcement without marking it read.',
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
  'Read replies to one discussion entry.',
  a => ctx(a) + `/discussion_topics/${a.topic_id}/entries/${a.entry_id}/replies`,
  { ...context, topic_id: id, entry_id: id },
  [...Object.keys(context), 'topic_id', 'entry_id'],
);
add(
  'conversations',
  'List Canvas Inbox conversations. This is Canvas messaging, not Gmail.',
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
add('unread_count', 'Read Canvas Inbox unread count.', '/conversations/unread_count');
add(
  'calendar_events',
  'Read personal, course or group calendar events or assignment deadlines. Omit context_codes for personal calendar.',
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
  'Read one accessible calendar event or reservation.',
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
  'Read one appointment group and its slots.',
  a => `/appointment_groups/${a.appointment_group_id}`,
  { appointment_group_id: id },
  ['appointment_group_id'],
);
add(
  'planner_notes',
  'Read personal to-do notes.',
  '/planner_notes',
  { start_date: date, end_date: date },
  [],
  a => ({ start_date: a.start_date, end_date: a.end_date }),
);
add(
  'planner_overrides',
  'Read completion and dismissal flags on your planner items.',
  '/planner/overrides',
);
add('todo', 'Read your Canvas to-do items.', '/users/self/todo');
add('upcoming_events', 'Read upcoming Canvas events.', '/users/self/upcoming_events');
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
  'Read personal, course, group or child folders.',
  a =>
    a.context_type === 'user'
      ? '/users/self/folders'
      : `/${a.context_type}s/${a.context_id}/folders`,
  { context_type: choice('user', 'course', 'group', 'folder'), context_id: id },
  ['context_type'],
);
add('folder', 'Read folder metadata.', a => `/folders/${a.folder_id}`, { folder_id: id }, [
  'folder_id',
]);
add(
  'file_content',
  'Read text from a Canvas file: PDF text, DOCX, PPTX, XLSX XML text, plain text or code. Max download 15 MiB; paginated text. For scanned or handwritten PDFs use canvas_file_original. No external URL input.',
  a => `/files/${a.file_id}`,
  {
    file_id: id,
    offset: { type: 'integer', minimum: 0, maximum: 5000000 },
    max_chars: { type: 'integer', minimum: 1000, maximum: 30000 },
  },
  ['file_id'],
);
add('groups', 'Read groups you belong to.', '/users/self/groups');
add('group', 'Read group information.', a => `/groups/${a.group_id}`, { group_id: id }, [
  'group_id',
]);
add(
  'group_members',
  'Read members visible to you in a group.',
  a => `/groups/${a.group_id}/users`,
  { group_id: id },
  ['group_id'],
);
add(
  'module',
  'Read one course module and your progress; does not mark completion.',
  a => `/courses/${a.course_id}/modules/${a.module_id}`,
  { course_id: id, module_id: id },
  ['course_id', 'module_id'],
);
add(
  'module_item',
  'Read one module item and completion requirement.',
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
  'Read your personal Canvas settings without changing them.',
  '/users/self/settings',
);
add('user', 'Read your own user profile including timezone and locale.', '/users/self');
add(
  'communication_channels',
  'Read your configured Canvas notification channels.',
  '/users/self/communication_channels',
);
add(
  'notification_preferences',
  'Read delivery frequency for a notification channel obtained from communication_channels.',
  a => `/users/self/communication_channels/${a.channel_id}/notification_preferences`,
  { channel_id: id },
  ['channel_id'],
);
add('favorites', 'Read your favorite courses.', '/users/self/favorites/courses');
add('favorite_groups', 'Read your favorite groups.', '/users/self/favorites/groups');
add('course_nicknames', 'Read your personal course nicknames.', '/users/self/course_nicknames');
