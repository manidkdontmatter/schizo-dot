const BOARDS = ['x', 'pol'];

function sanitizePost(postString) {
	// Step 1: Strip HTML tags, but handle <br> specially for line breaks
	let text = postString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove scripts
	text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ''); // Remove styles
	text = text.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
	
	// Replace <br> and <br/> with a space to prevent word merging
	text = text.replace(/<br\s*\/?>/gi, ' ');
	
	text = text.replace(/<[^>]*>/g, ''); // Strip all other tags

	// Step 2: Decode HTML entities (named ones first, then dynamic numeric/hex)
	const namedEntityMap = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&nbsp;': ' ',
		'&copy;': '©',
		'&reg;': '®',
		'&trade;': '™'
	};
	for (const [entity, char] of Object.entries(namedEntityMap)) {
		const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
		text = text.replace(regex, char);
	}

	// Dynamic decode for numeric (&#39;, &#039;, etc.) and hex (&#x27;) entities
	text = text.replace(/&#x([0-9a-fA-F]+);/gi, (match, hex) => {
		return String.fromCharCode(parseInt(hex, 16));
	});
	text = text.replace(/&#([0-9]+);/g, (match, decimal) => {
		return String.fromCharCode(parseInt(decimal, 10));
	});

	// Step 3: Remove 4chan quote IDs (>> followed by digits, with optional spaces)
	text = text.replace(/\s*>>\d+\s*/g, ' ');

	// Step 4: Clean up whitespace (collapse multiples, trim)
	text = text.replace(/\s+/g, ' ').trim();

	return text;
}

function getHumanReadableDate() {
  const now = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();

  // Function to get the ordinal suffix
  function getOrdinalSuffix(d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  const suffix = getOrdinalSuffix(day);
  return `${month} ${day}${suffix} ${year}`;
}

// Example usage:
// console.log(getHumanReadableDate()); // e.g., "November 11th 2025"

export { sanitizePost, BOARDS, getHumanReadableDate };