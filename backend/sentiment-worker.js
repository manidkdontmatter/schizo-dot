import { parentPort } from 'worker_threads';
import { classifyPosts } from './classify-posts.js';

parentPort.on('message', async (posts) => {
  try {
    const result = await classifyPosts(posts);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});