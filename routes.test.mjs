// Every Canvas tool's route, frozen: a changed path (a dropped `self`, swapped ids, a typo) fails
// here instead of quietly reading something else. Each required argument gets its own value
// (integers 101, 102, … in schema order), so swapped ids show too. A new tool must be added here
// with its route; a route may only change on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tools, endpoint } from './canvas.mjs';

const ROUTES = {
  canvas_profile: '/api/v1/users/self/profile',
  canvas_courses: '/api/v1/courses',
  canvas_assignments: '/api/v1/courses/101/assignments',
  canvas_assignment: '/api/v1/courses/101/assignments/102',
  canvas_announcements: '/api/v1/courses/101/discussion_topics',
  canvas_modules: '/api/v1/courses/101/modules',
  canvas_module_items: '/api/v1/courses/101/modules/102/items',
  canvas_page: '/api/v1/courses/101/pages/slug2',
  canvas_planner: '/api/v1/planner/items',
  canvas_course: '/api/v1/courses/101',
  canvas_pages: '/api/v1/courses/1/pages',
  canvas_context_page: '/api/v1/courses/1/pages/slug3',
  canvas_front_page: '/api/v1/courses/1/front_page',
  canvas_assignment_groups: '/api/v1/courses/101/assignment_groups',
  canvas_submission: '/api/v1/courses/101/assignments/102/submissions/self',
  canvas_course_submissions: '/api/v1/courses/101/students/submissions',
  canvas_enrollments: '/api/v1/users/self/enrollments',
  canvas_missing_submissions: '/api/v1/users/self/missing_submissions',
  canvas_rubrics: '/api/v1/courses/101/rubrics',
  canvas_rubric: '/api/v1/courses/101/rubrics/102',
  canvas_peer_reviews: '/api/v1/courses/101/assignments/102/peer_reviews',
  canvas_discussions: '/api/v1/courses/1/discussion_topics',
  canvas_discussion: '/api/v1/courses/1/discussion_topics/103',
  canvas_discussion_entries: '/api/v1/courses/1/discussion_topics/103/entries',
  canvas_discussion_replies: '/api/v1/courses/1/discussion_topics/103/entries/104/replies',
  canvas_conversations: '/api/v1/conversations',
  canvas_conversation: '/api/v1/conversations/101',
  canvas_unread_count: '/api/v1/conversations/unread_count',
  canvas_activity_stream: '/api/v1/users/self/activity_stream',
  canvas_calendar_events: '/api/v1/calendar_events',
  canvas_calendar_event: '/api/v1/calendar_events/101',
  canvas_appointment_groups: '/api/v1/appointment_groups',
  canvas_appointment_group: '/api/v1/appointment_groups/101',
  canvas_planner_notes: '/api/v1/planner_notes',
  canvas_planner_overrides: '/api/v1/planner/overrides',
  canvas_todo: '/api/v1/users/self/todo',
  canvas_upcoming_events: '/api/v1/users/self/upcoming_events',
  canvas_files: '/api/v1/users/self/files',
  canvas_file: '/api/v1/files/101',
  canvas_folders: '/api/v1/users/self/folders',
  canvas_folder: '/api/v1/folders/101',
  canvas_file_content: '/api/v1/files/101',
  canvas_groups: '/api/v1/users/self/groups',
  canvas_group: '/api/v1/groups/101',
  canvas_group_members: '/api/v1/groups/101/users',
  canvas_module: '/api/v1/courses/101/modules/102',
  canvas_module_item: '/api/v1/courses/101/modules/102/items/103',
  canvas_quizzes: '/api/v1/courses/101/quizzes',
  canvas_quiz: '/api/v1/courses/101/quizzes/102',
  canvas_quiz_submission: '/api/v1/courses/101/quizzes/102/submission',
  canvas_quiz_submission_questions: '/api/v1/quiz_submissions/101/questions',
  canvas_settings: '/api/v1/users/self/settings',
  canvas_user: '/api/v1/users/self',
  canvas_communication_channels: '/api/v1/users/self/communication_channels',
  canvas_notification_preferences:
    '/api/v1/users/self/communication_channels/101/notification_preferences',
  canvas_favorites: '/api/v1/users/self/favorites/courses',
  canvas_favorite_groups: '/api/v1/users/self/favorites/groups',
  canvas_course_nicknames: '/api/v1/users/self/course_nicknames',
};

const argsFor = t => {
  const args = {};
  let n = 0;
  for (const key of t.inputSchema.required) {
    const p = t.inputSchema.properties[key];
    n++;
    args[key] =
      p.type === 'integer' ? 100 + n : p.enum ? p.enum[0] : p.pattern ? '2026-09-27' : 'slug' + n;
  }
  if (args.context_type && args.context_type !== 'user') args.context_id = 1;
  return args;
};

test('every Canvas tool reads exactly its frozen route', () => {
  assert.deepEqual(tools.map(t => t.name).sort(), Object.keys(ROUTES).sort());
  for (const t of tools) {
    const u = endpoint(t.name, argsFor(t));
    assert.equal(u.pathname, ROUTES[t.name], t.name);
    assert.ok(u.pathname.startsWith('/api/v1/'), t.name);
  }
});
