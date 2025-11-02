import { pipeline } from '@xenova/transformers';

let classifier = null;
async function initClassifier() {
	if (!classifier) {
		try {
			// classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli'); // 110 seconds for 91 posts
			// classifier = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-base'); // 59 seconds for 95 posts
			classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli'); // 14 seconds for 96 posts
			// classifier = await pipeline('zero-shot-classification', 'Xenova/DeBERTa-v3-base-mnli-fever-anli'); // 52 seconds for 90 posts
			console.log('Classifier loaded');
		} catch (err) {
			console.error('Failed to load model:', err);
			throw err;
		}
	}
	return classifier;
}

export async function classifyPosts(posts) {
	console.log(`Post classification in progress on ${posts.length} posts...`)
	const startTime = Date.now();
	if (!Array.isArray(posts) || posts.length === 0) {
		return { totalPosts: 0, results: [], averageScore: 0 };
	}

	await initClassifier();

	const labels = [
		// 'major worldwide disaster',
		// 'not major worldwide disaster',
		'bad news',
		'good news',
		'not news'
		// 'neutral'
	];

	const results = [];
	const BATCH_SIZE = 20;
	let processed = 0;
	for (let i = 0; i < posts.length; i += BATCH_SIZE) {
		const batch = posts.slice(i, i + BATCH_SIZE);
		const promises = batch.map(async (post) => {
			if (!post || typeof post !== 'string' || post.trim().length === 0) {
				return { text: post || '', topLabel: labels[2], topScore: 0 }; // Neutral fallback
			}

			try {
				// Prompt to guide focus (comment out to test without)
				// const prompted = `Overall feelings about the future: ${post}`;
				const prompted = post
				const result = await classifier(prompted, labels);

				// Top label is already sorted descending by scores
				const topLabel = result.labels[0];
				let topScore = result.scores[0];

				// Negate for doom
				if (topLabel === labels[0]) {
					topScore = -topScore;
				}

				return { text: post, topLabel, topScore };
			} catch (err) {
				console.warn('Classification failed for post:', post.substring(0, 50), err.message);
				return { text: post, topLabel: labels[2], topScore: 0 };
			}
		});

		const batchResults = await Promise.all(promises);
		results.push(...batchResults);
		processed += batchResults.length;

		// Progress log every batch
		const elapsed = (Date.now() - startTime) / 1000; // seconds
		const avgPerPost = elapsed / processed;
		const eta = Math.round((posts.length - processed) * avgPerPost / 60); // minutes
		// console.log(`Processed ${processed}/${posts.length} posts (${Math.round((processed / posts.length) * 100)}%) – ETA ~${eta}min`);
	}

	const totalPosts = results.length;
	const nonNeutralResults = results.filter(r => r.topLabel !== 'neutral');
	const nonNeutralCount = nonNeutralResults.length;
	const averageScore = nonNeutralCount > 0 ? nonNeutralResults.reduce((a, b) => a + b.topScore, 0) / nonNeutralCount : 0;

	const totalTime = (Date.now() - startTime) / 1000;
	const logMessage = `Post classification complete. Average score: ${averageScore.toFixed(3)}. Took ${totalTime.toFixed(2)} seconds`;

	return { totalPosts, averageScore, results, logMessage };
}