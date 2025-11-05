import renderChart from './chart-display.js';

function interpolateColor(score) {
	// Normalize score: -0.5 becomes -1, 0 becomes 0, 0.5 becomes 1
	const norm = Math.max(-1, Math.min(1, score * 2));
	// Now interpolate from red (-1) to yellow (0) to green (1)
	if (norm <= -1) return [255, 0, 0]; // Red
	if (norm >= 1) return [0, 255, 0]; // Green
	if (norm <= 0) {
		// From red to yellow
		const t = (norm + 1) / 1; // 0 to 1
		const r = 255;
		const g = t * 255;
		const b = 0;
		return [r, g, b];
	} else {
		// From yellow to green
		const t = norm / 1; // 0 to 1
		const r = 255 - t * 255;
		const g = 255;
		const b = 0;
		return [r, g, b];
	}
}

function clamp(value) {
	return Math.max(0, Math.min(255, value));
}

async function updateDot() {
	try {
		const response = await fetch('/sentiment');
		const data = await response.json();

		const avgSentiment = data.average || 0;

		const dot = document.getElementById('dot');
		const sentimentEl = document.getElementById('sentiment');

		// Get base color
		let [r, g, b] = interpolateColor(avgSentiment);

		// Calculate lighter and darker for metallic gradient
		const lighterR = clamp(r * 1.3);
		const lighterG = clamp(g * 1.3);
		const lighterB = clamp(b * 1.3);
		const darkerR = clamp(r * 0.7);
		const darkerG = clamp(g * 0.7);
		const darkerB = clamp(b * 0.7);

		const color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
		const lighterColor = `rgb(${Math.round(lighterR)}, ${Math.round(lighterG)}, ${Math.round(lighterB)})`;
		const darkerColor = `rgb(${Math.round(darkerR)}, ${Math.round(darkerG)}, ${Math.round(darkerB)})`;

		// Set CSS variables for auras and particles
		dot.style.setProperty('--aura-color', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.5)`);
		dot.style.setProperty('--particle-bg', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.9)`);
		dot.style.setProperty('--particle-shadow', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.8)`);

		// Set metallic background with 3D layering (blend with base radial)
		dot.style.background = `radial-gradient(circle at 40% 40%, ${lighterColor}, ${color} 50%, ${darkerColor} 80%)`;

		// Update box-shadow to match color
		dot.style.boxShadow = `inset 30px 30px 80px rgba(255, 255, 255, 0.5), inset -30px -30px 80px rgba(0, 0, 0, 0.6), 0 0 150px rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.6), 0 0 250px rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.4)`;

		// Size based on absolute sentiment
		const size = 150 + Math.abs(avgSentiment) * 50;
		dot.style.width = `${size}px`;
		dot.style.height = `${size}px`;

		// Update sentiment text
		let label;
		if (avgSentiment < -0.5) label = 'Extreme Doom';
		else if (avgSentiment < -0.35) label = 'Doom';
		else if (avgSentiment < -0.2) label = 'Mild Doom';
		else if (avgSentiment <= 0.2) label = 'Neutral';
		else if (avgSentiment <= 0.35) label = 'Mild Hope';
		else if (avgSentiment <= 0.5) label = 'Hope';
		else label = 'Extreme Hope';
		sentimentEl.innerHTML = `Sentiment: ${avgSentiment.toFixed(2)} (${label})<br><a href="#" onclick="showReasoningModal()">View Reasoning</a> | <a href="#" onclick="showChartModal()">View Chart</a>`;

	} catch (error) {
		console.error('Error loading sentiment:', error);
		document.getElementById('sentiment').textContent = 'Error loading data';
	}
}

updateDot();
function showModal() {
	document.getElementById('modal').style.display = 'block';
}

function closeModal() {
	document.getElementById('modal').style.display = 'none';
}

function showReasoningModal() {
	document.getElementById('reasoning-modal').style.display = 'block';
	fetchReasoning();
}

function closeReasoningModal() {
	document.getElementById('reasoning-modal').style.display = 'none';
}

async function fetchReasoning() {
	try {
		const response = await fetch('/reasoning');
		const text = await response.text();
		const content = document.getElementById('reasoning-content');
		content.innerHTML = text.split('\n\n').map(p => `<p style="text-align: center;">${p}</p>`).join('');
	} catch (error) {
		document.getElementById('reasoning-content').innerHTML = '<p style="text-align: center;">Error loading reasoning data</p>';
	}
}

// Close modal when clicking outside
window.onclick = function (event) {
	if (event.target == document.getElementById('modal')) {
		closeModal();
	} else if (event.target == document.getElementById('reasoning-modal')) {
		closeReasoningModal();
	} else if (event.target == document.getElementById('chart-modal')) {
		closeChartModal();
	}
}
function showChartModal() {
	document.getElementById('chart-modal').style.display = 'block';
	renderChart('chart');
}

function closeChartModal() {
	document.getElementById('chart-modal').style.display = 'none';
}

setInterval(updateDot, 15 * 60 * 1000);
window.showModal = showModal;
window.closeModal = closeModal;
window.showReasoningModal = showReasoningModal;
window.closeReasoningModal = closeReasoningModal;
window.showChartModal = showChartModal;
window.closeChartModal = closeChartModal;