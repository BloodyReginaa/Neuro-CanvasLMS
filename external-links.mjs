// Files that teachers link from other sites (module ExternalUrl items). A share link opens a web
// page ABOUT the file; this turns the well-known ones into the address that returns the file
// itself. Only the URL Canvas stored for the module item is ever used, never one from the AI, and
// the download still goes through downloadOriginal's checks (HTTPS, public DNS, no credentials,
// size limit, web pages rejected).
//   purpose 'text':     the smallest readable form (Docs/Slides as plain text, a Sheet as CSV)
//   purpose 'original': a real file (Docs → .docx, Slides → .pptx, Sheets → .xlsx)
const ID = '([A-Za-z0-9_-]{10,})';
const GOOGLE_DOC = new RegExp(`^/(document|presentation|spreadsheets)/d/${ID}(?:/|$)`);
const DRIVE_FILE = new RegExp(`^/file/d/${ID}(?:/|$)`);

export function directFileURL(u, purpose = 'original') {
  const host = u.hostname.toLowerCase();
  if (host === 'docs.google.com') {
    const m = u.pathname.match(GOOGLE_DOC);
    if (!m) return u;
    const [, kind, id] = m;
    const base = `https://docs.google.com/${kind}/d/${id}`;
    if (kind === 'document')
      return new URL(`${base}/export?format=${purpose === 'text' ? 'txt' : 'docx'}`);
    if (kind === 'presentation')
      return new URL(`${base}/export/${purpose === 'text' ? 'txt' : 'pptx'}`);
    // A Sheet: CSV of the tab the link points at (text), or the whole workbook (original).
    if (purpose !== 'text') return new URL(`${base}/export?format=xlsx`);
    const gid = (u.hash.match(/gid=(\d+)/) ?? u.search.match(/[?&]gid=(\d+)/))?.[1] ?? '0';
    return new URL(`${base}/export?format=csv&gid=${gid}`);
  }
  if (host === 'drive.google.com') {
    const id =
      u.pathname.match(DRIVE_FILE)?.[1] ??
      (/^\/(open|uc)$/.test(u.pathname) ? u.searchParams.get('id') : null);
    if (id && /^[A-Za-z0-9_-]{10,}$/.test(id))
      // confirm=t skips the "can't scan this large file for viruses" page.
      return new URL(
        `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
      );
    return u;
  }
  if (host === 'www.dropbox.com' || host === 'dropbox.com') {
    // Files (/s/, /scl/fi/) and folders (/sh/, /scl/fo/: Dropbox sends a folder as a ZIP).
    if (/^\/(s|sh|scl\/fi|scl\/fo)\//.test(u.pathname)) {
      const d = new URL(u.href);
      d.searchParams.delete('raw');
      d.searchParams.set('dl', '1');
      return d;
    }
    return u;
  }
  if (host === 'github.com' || host === 'www.github.com') {
    const [owner, repo, kind, ref, ...rest] = u.pathname.split('/').filter(Boolean);
    const name = /^[A-Za-z0-9_.-]+$/;
    if (!owner || !repo || !name.test(owner) || !name.test(repo)) return u;
    const r = repo.replace(/\.git$/, '');
    if (kind === 'blob' && ref && rest.length)
      return new URL(`https://raw.githubusercontent.com/${owner}/${r}/${ref}/${rest.join('/')}`);
    // The repository (or a folder of it): the whole repository as a ZIP.
    if (!kind || (kind === 'tree' && ref))
      return new URL(`https://codeload.github.com/${owner}/${r}/zip/${kind ? ref : 'HEAD'}`);
    return u;
  }
  return u;
}

// Files the other site builds anew on every download (Google's Docs/Slides/Sheets exports, GitHub
// repository ZIPs): the bytes, and so the SHA-256, differ between two downloads of the same file.
export function regeneratedOnDownload(raw) {
  try {
    const host = directFileURL(new URL(raw), 'original').hostname;
    return host === 'docs.google.com' || host === 'codeload.github.com';
  } catch {
    return false;
  }
}

// "Google Slides" etc. for a Docs/Slides/Sheets link, else null.
export function googleKind(raw) {
  try {
    const u = new URL(raw);
    if (u.hostname.toLowerCase() !== 'docs.google.com') return null;
    const kind = u.pathname.match(GOOGLE_DOC)?.[1];
    return (
      { document: 'Google Docs', presentation: 'Google Slides', spreadsheets: 'Google Sheets' }[
        kind
      ] ?? null
    );
  } catch {
    return null;
  }
}

// Why a link gave a web page instead of a file, in words the AI can pass on.
export function webPageReason(raw) {
  let host = '';
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {}
  if (host === 'drive.google.com' && /\/folders\//.test(raw))
    return 'it is a Google Drive folder, which can only be browsed, not downloaded. Give the user the link to open it.';
  if (host.endsWith('google.com'))
    return 'the Google file is not shared as "Anyone with the link" (or it is a published web page), so it cannot be read without signing in. Give the user the link to open it.';
  if (host.endsWith('dropbox.com'))
    return 'the Dropbox link is not public or has expired. Give the user the link to open it.';
  if (host.endsWith('github.com'))
    return 'the GitHub page is private, missing, or not a file or repository. Give the user the link to open it.';
  return 'the link opens a web page, not a file. Give the user the link to open it in the browser.';
}
