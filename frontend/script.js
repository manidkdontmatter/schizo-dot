import renderChart from './chart-display.js';

let realSentiment = 0;  // The actual value from backend
let displaySentiment = 0;  // The lerped value shown to user
let targetSentiment = 0;  // The fluctuating target
let lerpStartTime = 0;  // Timestamp for lerp start
let lerpDuration = 180000;  // 90 seconds (1.5 minutes) for lerp; adjust as needed
let targetUpdateInterval = 5000;  // 60 seconds between target changes; adjust as needed
let lastTargetUpdate = 0;

// Helper: Linear interpolation
function lerp(start, end, t) {
	return start + (end - start) * t;
}

// Update the target periodically
function updateTarget() {
	const now = Date.now();
	if (now - lastTargetUpdate > targetUpdateInterval) {
		// Random offset: ±0.01, clamped to not exceed real ±0.01
		const offset = (Math.random() - 0.5) * 0.01;
		targetSentiment = Math.max(realSentiment - 0.01, Math.min(realSentiment + 0.01, realSentiment + offset));
		lerpStartTime = now;
		lastTargetUpdate = now;
	}
}

let maxDoomLabel = (['IT\'S SO OVER', 'EXTREME DOOM', 'WE\'RE ALL GOING TO DIE', 'IT\'S SCHIZO TIME'])[Math.floor(Math.random() * 4)]

// Animation loop for lerping
function animateSentiment() {
	updateTarget();
	const now = Date.now();
	const elapsed = now - lerpStartTime;
	const t = Math.min(elapsed / lerpDuration, 1);  // 0 to 1 over duration
	displaySentiment = lerp(displaySentiment, targetSentiment, t);

	// Update DOM only if changed significantly
	const sentimentEl = document.getElementById('sentiment');
	const currentText = sentimentEl.innerHTML;
	let label;
	if (displaySentiment < -0.5) label = maxDoomLabel;
	else if (displaySentiment < -0.35) label = 'Doom';
	else if (displaySentiment < -0.2) label = 'Mild Doom';
	else if (displaySentiment <= 0.2) label = 'Nothing Ever Happens';
	else if (displaySentiment <= 0.35) label = 'Mild Hope';
	else if (displaySentiment <= 0.5) label = 'Hope'
	else label = 'We\'re so back';
	const newValue = displaySentiment.toFixed(3);
	const newText = `Sentiment: ${newValue} (${label})<br><a href="#" onclick="showReasoningModal()">View Reasoning</a> | <a href="#" onclick="showChartModal()">View Chart</a>`;
	if (newText !== currentText) {
		sentimentEl.innerHTML = newText;
	}

	requestAnimationFrame(animateSentiment);
}

function interpolateColor(score) {
	// Normalize score: -0.5 becomes -1, 0 becomes 0, 0.5 becomes 1
	const norm = Math.max(-1, Math.min(1, score * 2));

	// Define the three colors (RGB arrays) - change these to customize
	const lowColor = [255, 0, 0];    // Red for lowest sentiment
	const midColor = [255, 255, 255];  // mid color
	const highColor = [0, 255, 0];   // Green for highest sentiment

	let color1, color2, t;
	if (norm <= 0) {
		// Interpolate from low to mid
		color1 = lowColor;
		color2 = midColor;
		t = (norm + 1) / 1; // 0 to 1
	} else {
		// Interpolate from mid to high
		color1 = midColor;
		color2 = highColor;
		t = norm / 1; // 0 to 1
	}

	// Calculate interpolated RGB values
	const r = color1[0] + (color2[0] - color1[0]) * t;
	const g = color1[1] + (color2[1] - color1[1]) * t;
	const b = color1[2] + (color2[2] - color1[2]) * t;

	return [Math.round(r), Math.round(g), Math.round(b)];
}

function clamp(value) {
	return Math.max(0, Math.min(255, value));
}

async function updateDot() {
	try {
		const response = await fetch('/sentiment');
		const data = await response.json();

		realSentiment = data.average || 0;

		// On first load, set display and target with initial offset
		if (displaySentiment === 0 && targetSentiment === 0) {
			displaySentiment = realSentiment;
			const offset = (Math.random() - 0.5) * 0.02;  // -0.01 to +0.01
			targetSentiment = Math.max(realSentiment - 0.01, Math.min(realSentiment + 0.01, realSentiment + offset));
			lerpStartTime = Date.now();
			lastTargetUpdate = Date.now();
			animateSentiment();  // Start the loop
		}

		const dot = document.getElementById('dot');

		// Get base color
		let [r, g, b] = interpolateColor(realSentiment);

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

		// Size based on absolute sentiment, scaled for mobile
		const isMobile = window.innerWidth < 768;
		const size = isMobile ? 100 + Math.abs(realSentiment) * 30 : 150 + Math.abs(realSentiment) * 50;
		dot.style.width = `${size}px`;
		dot.style.height = `${size}px`;

		// Handle moon overlay
		const moonAlpha = (realSentiment < 0 ? -realSentiment : 0) / 5;
		if (moonAlpha < -0.5) moonAlpha = -0.5
		if (realSentiment > -0.5) moonAlpha = 0

		let moonImg = dot.querySelector('.moon-overlay');
		if (moonAlpha > 0) {
			if (!moonImg) {
				moonImg = document.createElement('img');
				moonImg.className = 'moon-overlay';
				moonImg.src = 'moon.png';
				moonImg.style.position = 'absolute';
				moonImg.style.top = '0';
				moonImg.style.left = '0';
				moonImg.style.width = '100%';
				moonImg.style.height = '100%';
				moonImg.style.borderRadius = '50%';
				moonImg.style.pointerEvents = 'none';
				moonImg.style.zIndex = '1'; // Above background, below particles
				dot.appendChild(moonImg);
			}
			moonImg.style.opacity = moonAlpha;
		} else if (moonImg) {
			moonImg.remove();
		}

	} catch (error) {
		console.error('Error loading sentiment:', error);
		document.getElementById('sentiment').textContent = 'Error loading data';
	}
}

updateDot();

function generateStars() {
	const starsContainer = document.querySelector('.stars');
	for (let i = 0; i < 30; i++) {
		const star = document.createElement('div');
		star.className = 'star';
		star.style.position = 'absolute';
		star.style.top = Math.random() * 100 + '%';
		star.style.left = Math.random() * 100 + '%';
		star.style.width = (1 + Math.random() * 3) + 'px';
		star.style.height = star.style.width;
		star.style.animationDelay = Math.random() * 20 + 's';
		starsContainer.appendChild(star);
	}
}

generateStars();

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
		content.innerHTML = `<div style="text-align: center; font-size: 18px; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</div>`;
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