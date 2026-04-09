import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadTemplate(templateName, data) {
  // 1. **The Fix:** Explicitly add the .html extension here
  const filename = `${templateName}.html`;

  // 2. Construct the full path
  // __dirname is .../emails, '..' moves up one folder to .../parv-backend
  const filePath = path.join(__dirname, '..', 'emails/templates', filename);

  let html = fs.readFileSync(filePath, 'utf8');

  // ... (rest of your placeholder replacement logic)
  for (const key in data) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  }

  return html;
}

export default loadTemplate;