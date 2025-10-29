import { pipeline } from '@xenova/transformers';

// Your custom labels for the spectrum
const candidateLabels = ['the world is ending or getting worse or an apocalypse is coming or a bad event is coming or disaster is coming', 'the world is getting better or the world is at peace and in harmony and bad things are not about to happen and everything about the world is optimistic'];

// Exported function for sentiment analysis
export async function analyzeSentiment(posts) {
  const startTime = Date.now();

  // Load the classifier (downloads ~500MB first time, then cached)
  const classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli');

  // Process each post
  const results = [];
  for (const post of posts) {
    const output = await classifier(post, candidateLabels);

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