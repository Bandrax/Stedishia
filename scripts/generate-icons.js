const sharp = require('sharp');
const path = require('path');

const PRIMARY = '#0F4C3A';
const ACCENT = '#D4AF37';
const ACCENT_LIGHT = '#E8C84A';
const WHITE = '#FFFFFF';

// Generate SVG for the icon
function generateIconSVG(size) {
  const center = size / 2;
  const coinRadius = size * 0.38;
  const borderWidth = size * 0.025;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F4C3A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0A3528;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${ACCENT};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8942E;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>

  <!-- Outer coin circle -->
  <circle cx="${center}" cy="${center}" r="${coinRadius}" fill="url(#coin)" />

  <!-- Inner coin border -->
  <circle cx="${center}" cy="${center}" r="${coinRadius - borderWidth * 2}" fill="none" stroke="url(#coinInner)" stroke-width="${borderWidth}" opacity="0.6"/>

  <!-- Stylized S letter -->
  <text x="${center}" y="${center + size * 0.13}"
        font-family="Georgia, serif"
        font-size="${size * 0.42}"
        font-weight="bold"
        fill="${PRIMARY}"
        text-anchor="middle"
        opacity="0.9">S</text>

  <!-- Small decorative dots on coin edge -->
  <circle cx="${center}" cy="${center - coinRadius + borderWidth * 3}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center}" cy="${center + coinRadius - borderWidth * 3}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center - coinRadius + borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center + coinRadius - borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
</svg>`;
}

// Generate the foreground only (for adaptive icon - no background, just the coin)
function generateAdaptiveForegroundSVG(size) {
  const center = size / 2;
  // Adaptive icons need safe zone: the foreground is 108dp, visible area is 72dp (66%)
  // So the coin should be within the inner 66%
  const coinRadius = size * 0.28;
  const borderWidth = size * 0.02;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${ACCENT};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8942E;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Outer coin circle -->
  <circle cx="${center}" cy="${center}" r="${coinRadius}" fill="url(#coin)" />

  <!-- Inner coin border -->
  <circle cx="${center}" cy="${center}" r="${coinRadius - borderWidth * 2}" fill="none" stroke="url(#coinInner)" stroke-width="${borderWidth}" opacity="0.6"/>

  <!-- Stylized S letter -->
  <text x="${center}" y="${center + size * 0.095}"
        font-family="Georgia, serif"
        font-size="${size * 0.32}"
        font-weight="bold"
        fill="${PRIMARY}"
        text-anchor="middle"
        opacity="0.9">S</text>

  <!-- Small decorative dots -->
  <circle cx="${center}" cy="${center - coinRadius + borderWidth * 3}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center}" cy="${center + coinRadius - borderWidth * 3}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center - coinRadius + borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
  <circle cx="${center + coinRadius - borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${PRIMARY}" opacity="0.3"/>
</svg>`;
}

// Splash icon - just the coin on transparent background
function generateSplashSVG(size) {
  const center = size / 2;
  const coinRadius = size * 0.3;
  const borderWidth = size * 0.018;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${ACCENT};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${ACCENT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8942E;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Outer coin circle -->
  <circle cx="${center}" cy="${center}" r="${coinRadius}" fill="url(#coin)" />

  <!-- Inner coin border -->
  <circle cx="${center}" cy="${center}" r="${coinRadius - borderWidth * 2}" fill="none" stroke="url(#coinInner)" stroke-width="${borderWidth}" opacity="0.6"/>

  <!-- Stylized S letter -->
  <text x="${center}" y="${center + size * 0.1}"
        font-family="Georgia, serif"
        font-size="${size * 0.36}"
        font-weight="bold"
        fill="${WHITE}"
        text-anchor="middle"
        opacity="0.95">S</text>

  <!-- Small decorative dots -->
  <circle cx="${center}" cy="${center - coinRadius + borderWidth * 3}" r="${borderWidth * 0.8}" fill="${WHITE}" opacity="0.4"/>
  <circle cx="${center}" cy="${center + coinRadius - borderWidth * 3}" r="${borderWidth * 0.8}" fill="${WHITE}" opacity="0.4"/>
  <circle cx="${center - coinRadius + borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${WHITE}" opacity="0.4"/>
  <circle cx="${center + coinRadius - borderWidth * 3}" cy="${center}" r="${borderWidth * 0.8}" fill="${WHITE}" opacity="0.4"/>
</svg>`;
}

async function generate() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  // icon.png - 1024x1024 (iOS/general)
  const iconSVG = Buffer.from(generateIconSVG(1024));
  await sharp(iconSVG)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // adaptive-icon.png - 1024x1024 (Android foreground)
  const adaptiveSVG = Buffer.from(generateAdaptiveForegroundSVG(1024));
  await sharp(adaptiveSVG)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Generated adaptive-icon.png (1024x1024)');

  // splash-icon.png - 1024x1024 (splash screen)
  const splashSVG = Buffer.from(generateSplashSVG(1024));
  await sharp(splashSVG)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('Generated splash-icon.png (1024x1024)');

  // favicon.png - 48x48
  await sharp(iconSVG)
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');

  console.log('\nAll icons generated!');
}

generate().catch(console.error);
