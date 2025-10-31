import { pipeline } from '@xenova/transformers';

// Your custom labels for the spectrum
const candidateLabels = ['the world is ending or an apocalypse is coming or a huge bad event is coming or worldwide disaster is coming', 'the world is getting better or the world is at peace or harmony or bad things are not about to happen or everything about the world is optimistic'];

// Exported function for sentiment analysis
export async function analyzeSentiment(posts) {
  const startTime = Date.now();
  const batchSize = 10; // Adjust based on hardware; higher for more parallelism, lower for memory

  // Load the classifier (downloads ~500MB first time, then cached)
  console.time('loadClassifier');
  const classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli');
  console.timeEnd('loadClassifier');

  // Process posts in batches with parallelism
  console.time('processPosts');
  const batches = [];
  for (let i = 0; i < posts.length; i += batchSize) {
    batches.push(posts.slice(i, i + batchSize));
  }

  const promises = batches.map(batch => classifier(batch, candidateLabels));
  const batchOutputs = await Promise.all(promises);
  const allOutputs = batchOutputs.flat(); // Flatten array of batch results

  const results = [];
  for (let i = 0; i < posts.length; i++) {
    const output = allOutputs[i];
    const post = posts[i];

    // Map to spectrum score: hope = positive, doom = negative
    const scores = output.scores;
    const labels = output.labels;

    let spectrumScore;
    if (labels[0] === candidateLabels[1]) { // hope
      spectrumScore = scores[0];
    } else if (labels[0] === candidateLabels[0]) { // doom
      spectrumScore = -scores[0];
    } else {
      spectrumScore = 0; // Fallback, though unlikely with 2 labels
    }

    // Clamp to -1 to 1 (though scores are 0-1, this ensures bounds)
    spectrumScore = Math.max(-1, Math.min(1, spectrumScore));

    results.push({
      post,
      topLabel: output.labels[0],
      topScore: output.scores[0],
      spectrumScore // Your -1 (doom) to +1 (hope) metric
    });
  }
  console.timeEnd('processPosts');

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`Analyzed ${posts.length} posts in ${duration.toFixed(2)} seconds.`);

  // Aggregate overall
  const avgSpectrum = results.reduce((sum, r) => sum + r.spectrumScore, 0) / results.length;

  // Return results
  return {
    totalPosts: posts.length,
    averageSpectrum: avgSpectrum,
    results: results
  };
}