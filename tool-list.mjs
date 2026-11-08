// Every MCP tool the connector offers, in the order tools/list returns them. One list shared by
// the Worker (worker.mjs) and the listing-only server Glama inspects (scripts/glama-stdio.mjs),
// so the two can never disagree.
import { tools } from './canvas.mjs';
import { moduleFileTool, moduleFileContentTool, fileOriginalTool } from './module-file.mjs';
import { findFilesTool } from './find-files.mjs';
import { linkContentTool } from './link-content.mjs';
import { versionTool } from './update-check.mjs';
import { fileDownloadLinkTool } from './download-link.mjs';

// What a parameter means wherever a tool declares it without its own description, so the AI
// knows where each id comes from. A description written on the tool itself always wins.
const PARAM_DOCS = {
  course_id: 'Canvas course id, from canvas_courses.',
  assignment_id: 'Assignment id, from canvas_assignments or a module item.',
  module_id: 'Module id, from canvas_modules.',
  item_id: 'Module item id, from canvas_module_items.',
  page_url: 'The page_url of the page, from canvas_pages or a module item.',
  context_type: 'Where to look: course or group (files and folders also take user or folder).',
  context_id: 'Id of the course, group, user or folder named by context_type.',
  rubric_id: 'Rubric id, from canvas_rubrics.',
  search_term: 'Only return items whose name contains this text.',
  topic_id: 'Discussion or announcement topic id, from canvas_discussions or canvas_announcements.',
  entry_id: 'Discussion entry id, from canvas_discussion_entries.',
  scope: 'Which conversations: unread, starred, archived or sent. Leave out for the inbox.',
  conversation_id: 'Conversation id, from canvas_conversations.',
  start_date: 'First day to include, YYYY-MM-DD in your Canvas time zone.',
  end_date: 'Last day to include, YYYY-MM-DD in your Canvas time zone.',
  type: 'event (default): calendar events such as lectures and office hours; assignment: deadlines.',
  context_codes:
    'Calendars to read, such as course_123 or group_45. Leave out for your personal calendar only.',
  event_id: 'Calendar event id, from canvas_calendar_events.',
  appointment_group_id: 'Appointment group id, from canvas_appointment_groups.',
  file_id: 'Canvas file id, from canvas_files, canvas_find_files or a module item.',
  folder_id: 'Folder id, from canvas_folders.',
  offset: 'Character to start reading from; pass next_offset from the previous call to continue.',
  max_chars: 'Most characters of text to return in this call (default 20000).',
  group_id: 'Group id, from canvas_groups.',
  quiz_id: 'Quiz id, from canvas_quizzes.',
  quiz_submission_id: 'Quiz submission id, from canvas_quiz_submission.',
  channel_id: 'Notification channel id, from canvas_communication_channels.',
  source: 'Where the link is written: syllabus, front_page, page, assignment or discussion.',
  url: 'The link exactly as it appears in that Canvas content.',
};

const documented = tool => {
  const properties = Object.fromEntries(
    Object.entries(tool.inputSchema.properties ?? {}).map(([k, p]) => [
      k,
      p.description || !PARAM_DOCS[k] ? p : { ...p, description: PARAM_DOCS[k] },
    ]),
  );
  return { ...tool, inputSchema: { ...tool.inputSchema, properties } };
};

export const allTools = [
  ...tools,
  moduleFileTool,
  fileOriginalTool,
  findFilesTool,
  moduleFileContentTool,
  linkContentTool,
  versionTool,
  fileDownloadLinkTool,
].map(documented);
