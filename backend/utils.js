function deHtml2(htmlString) {
	if (!htmlString) return '';
	// Replace <br> with newline
	htmlString = htmlString.replace(/<br\s*\/?>/gi, '\n');
	// Remove all other HTML tags
	htmlString = htmlString.replace(/<[^>]*>/g, '');
	// Decode common HTML entities
	htmlString = htmlString.replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&').replace(/"/g, '"').replace(/&#039;/g, "'");
	// Remove all quote markers (>)
	htmlString = htmlString.replace(/>/g, '');
	// Collapse multiple newlines
	htmlString = htmlString.replace(/\n\n+/g, '\n');
	return htmlString.trim();
}

function deHtml(htmlString) {
	// Step 1: Strip HTML tags (more robust regex)
	let text = htmlString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove scripts first
	text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ''); // Remove styles
	text = text.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
	text = text.replace(/<[^>]*>/g, ''); // Strip all other tags

	// Step 2: Decode common HTML entities (add more if needed)
	const entityMap = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&nbsp;': ' ',
		'&copy;': '©',
		'&reg;': '®',
		'&trade;': '™',
		// Add numeric ones too
		'&#x27;': "'",
		'&#x2F;': '/',
		'&#x60;': '`'
	};
	for (const [entity, char] of Object.entries(entityMap)) {
		const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); // Escape regex chars
		text = text.replace(regex, char);
	}

	// Step 3: Clean up whitespace
	text = text.replace(/\s+/g, ' ').trim();

	return text;
}

export { deHtml };