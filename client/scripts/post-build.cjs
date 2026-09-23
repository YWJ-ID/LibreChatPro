const fs = require('fs-extra');

async function postBuild() {
  try {
    await fs.copy('public/assets', 'dist/assets');
    await fs.copy('public/robots.txt', 'dist/robots.txt');
    await fs.copy('public/privacy.html', 'dist/privacy.html');
    await fs.copy('public/terms.html', 'dist/terms.html');
    console.log('✅ PWA icons, robots.txt and legal pages copied successfully.');
  } catch (err) {
    console.error('❌ Error copying files:', err);
    process.exit(1);
  }
}

postBuild();
