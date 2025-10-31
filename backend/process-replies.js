import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { deHtml } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processReplies() {
  const dataDir = path.join(__dirname, '..', 'data');
  const boards = ['pol', 'x'];
  const overallStart = Date.now();

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
    const boardStart = Date.now();

    if (!fs.existsSync(repliesDir)) {
      console.log(`Directory ${repliesDir} does not exist.`);
      continue;
    }

    const files = fs.readdirSync(repliesDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const fileStart = Date.now();
      const filePath = path.join(repliesDir, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const posts = JSON.parse(data);

      const processed = posts.map(post => ({
        text: deHtml((post.sub || '') + ' ' + post.com)
      }));

      const processedFilePath = path.join(processedDir, file);
      fs.writeFileSync(processedFilePath, JSON.stringify(processed, null, 2));
      const fileEnd = Date.now();
      console.log(`Processed ${file} to ${processedDir} (${fileEnd - fileStart} ms)`);
    }

    const boardEnd = Date.now();
    console.log(`Processed board /${board}/ in ${boardEnd - boardStart} ms`);
  }

  const overallEnd = Date.now();
  console.log(`All replies processed in ${overallEnd - overallStart} ms`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processReplies()
}

export { processReplies };
