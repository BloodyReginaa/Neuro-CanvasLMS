// Loaded before every test file (npm test): a neutral example school, as a deployment's vars would set.
import { applyConfig } from './config.mjs';
applyConfig({
  CANVAS_HOST: 'canvas.example.edu',
  SCHOOL_NAME: 'Example University',
  ACCENT_COLOR: '#881c1c',
});
