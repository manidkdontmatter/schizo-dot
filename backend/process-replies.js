import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { deHtml } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processReplies() {
  const dataDir = path.join(__dirname, '..', 'data');
  const boards = ['pol', 'x'];

  // Cleanup processed folders
  boards.forEach(board => {
    const processedDir = path.join(dataDir, `${board}-replies-processed`);
    if (fs.existsSync(processedDir)) {
      fs.removeSync(processedDir);
    }
  });

  for (const board of boards) {
    const repliesDir = path.join(dataDir, `${board}-replies`);
    const processedDir = path.join(dataDir, `${board}-replies-processed`);
    fs.ensureDirSync(processedDir);

    if (!fs.existsSync(repliesDir)) {
      console.log(`Directory ${repliesDir} does not exist.`);
      continue;
    }

    const files = fs.readdirSync(repliesDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(repliesDir, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const posts = JSON.parse(data);

      const processed = posts.map(post => ({
        text: deHtml((post.sub || '') + ' ' + post.com)
      }));

      const processedFilePath = path.join(processedDir, file);
      fs.writeFileSync(processedFilePath, JSON.stringify(processed, null, 2));
      console.log(`Processed ${file} to ${processedDir}`);
    }
  }
  console.log('All replies processed.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processReplies()
}

export { processReplies };
