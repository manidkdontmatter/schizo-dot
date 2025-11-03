import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { fetchAllCatalogs } from './fetch-catalogs.js';
import { fetchAllReplies } from './fetch-replies.js';
import { processReplies } from './process-replies.js';
import { BOARDS } from './utils.js';
import config from './config.js';
import { classifyPostsGrok } from './classify-posts-grok.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Serve frontend static files

// Basic route
app.get('/', (req, res) => {
  res.send('Schizo Dot Backend - 4chan collective consciousness');
});

// Sentiment route
app.get('/sentiment', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sentiment-results.json'), 'utf8'));
    res.json({ average: data.averageScore });
  } catch (error) {
    res.status(500).json({ error: 'Sentiment data not available' });
  }
});


// Scheduled task function
async function runScheduledTask() {
  console.log('Running scheduled data collection...');
  try {
    await fetchAllCatalogs();
    if (config.classificationMode == 'all') {
      await fetchAllReplies();
      await processReplies();
    }

    // Perform sentiment analysis
    const dataDir = path.join(__dirname, '..', 'data');
    const boards = BOARDS;
    let posts = [];
    if (config.classificationMode === 'catalog') {
      const polData = JSON.parse(fs.readFileSync(path.join(dataDir, 'pol-catalog-processed.json'), 'utf8'));
      const xData = JSON.parse(fs.readFileSync(path.join(dataDir, 'x-catalog-processed.json'), 'utf8'));
      posts = [...polData, ...xData].map(item => item.text);
    } else {
      for (const board of boards) {
        const repliesDir = path.join(dataDir, `${board}-replies-processed`);
        if (!fs.existsSync(repliesDir)) continue;
        const files = fs.readdirSync(repliesDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(repliesDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          posts.push(...data.map(item => item.text));
        }
      }
    }
    let sentimentResults;
    if (config.classification === 'grok') {
      sentimentResults = await classifyPostsGrok(posts);
    } else {
      sentimentResults = await new Promise((resolve, reject) => {
        const worker = new Worker('./sentiment-worker.js', { workerData: null });

        worker.postMessage(posts);

        worker.on('message', (message) => {
          worker.terminate();
          if (message.success) {
            const { logMessage, ...dataToSave } = message.result;
            console.log(logMessage);
            resolve(dataToSave);
          } else {
            reject(new Error(message.error));
          }
        });

        worker.on('error', (err) => {
          worker.terminate();
          reject(err);
        });
      });
    }
    const { logMessage, ...dataToSave } = sentimentResults;
    if (logMessage) console.log(logMessage);
    fs.writeFileSync(path.join(dataDir, 'sentiment-results.json'), JSON.stringify(sentimentResults, null, 2));
    console.log('Data collection and sentiment analysis complete.');
  } catch (error) {
    console.error('Error in scheduled task:', error);
  }

  // Schedule next run x minutes after completion
  setTimeout(runScheduledTask, 1 * 60 * 60 * 1000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Scheduled to run data collection loop every 5 minutes after completion.');
  runScheduledTask(); // Start the loop
});