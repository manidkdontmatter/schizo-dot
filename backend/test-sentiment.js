// Simple test script for analyzeSentiment
import { analyzeSentiment } from './sentiment.js';

async function testSentiment() {
  const samplePosts = [
    "The world is ending tomorrow!",
    "Everything is peaceful and great.",
    "I think things are getting better.",
    "Apocalypse is coming soon.",
    "Life is harmonious and optimistic."
  ];

  console.log('Testing analyzeSentiment with sample posts...');
  try {
    const result = await analyzeSentiment(samplePosts);
    console.log('Test passed. Results:');
    console.log(`Total Posts: ${result.totalPosts}`);
    console.log(`Average Spectrum: ${result.averageSpectrum.toFixed(2)}`);
    console.log('Individual Results:');
    result.results.forEach((r, i) => {
      console.log(`${i + 1}. Post: "${r.post}" | Spectrum: ${r.spectrumScore.toFixed(2)} | Label: ${r.topLabel}`);
    });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSentiment();