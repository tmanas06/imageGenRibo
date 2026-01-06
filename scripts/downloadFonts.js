/**
 * Font Download Script
 * Downloads Noto Sans fonts for Hindi (Devanagari) and Tamil
 *
 * Run: node scripts/downloadFonts.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../fonts');

const FONTS = [
  {
    name: 'NotoSansDevanagari-Regular.ttf',
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf'
  },
  {
    name: 'NotoSansDevanagari-Bold.ttf',
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf'
  },
  {
    name: 'NotoSansTamil-Regular.ttf',
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf'
  },
  {
    name: 'NotoSansTamil-Bold.ttf',
    url: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Bold.ttf'
  }
];

const ALTERNATIVE_FONTS = [
  {
    name: 'NotoSansDevanagari-Regular.ttf',
    url: 'https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQC.ttf'
  },
  {
    name: 'NotoSansDevanagari-Bold.ttf',
    url: 'https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQu.ttf'
  },
  {
    name: 'NotoSansTamil-Regular.ttf',
    url: 'https://fonts.gstatic.com/s/notosanstamil/v27/ieVc2YdFI3GCY6SyQy1KfStzYKZgzN1z4LKDbeZce-0429tBManUktuex7v0rQ.ttf'
  },
  {
    name: 'NotoSansTamil-Bold.ttf',
    url: 'https://fonts.gstatic.com/s/notosanstamil/v27/ieVc2YdFI3GCY6SyQy1KfStzYKZgzN1z4LKDbeZce-0429tBManUktuex7ujqw.ttf'
  }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function downloadFonts() {
  console.log('📥 Downloading fonts for Hindi and Tamil text rendering...\n');

  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
    console.log(`📁 Created directory: ${FONTS_DIR}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const font of FONTS) {
    const destPath = path.join(FONTS_DIR, font.name);

    if (fs.existsSync(destPath)) {
      console.log(`✅ ${font.name} already exists, skipping`);
      successCount++;
      continue;
    }

    console.log(`⬇️  Downloading ${font.name}...`);

    try {
      await downloadFile(font.url, destPath);
      console.log(`✅ ${font.name} downloaded successfully`);
      successCount++;
    } catch (err) {
      console.log(`⚠️  Primary URL failed, trying alternative...`);

      const altFont = ALTERNATIVE_FONTS.find(f => f.name === font.name);
      if (altFont) {
        try {
          await downloadFile(altFont.url, destPath);
          console.log(`✅ ${font.name} downloaded from alternative URL`);
          successCount++;
        } catch (altErr) {
          console.log(`❌ Failed to download ${font.name}: ${altErr.message}`);
          failCount++;
        }
      } else {
        console.log(`❌ Failed to download ${font.name}: ${err.message}`);
        failCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Download Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  if (failCount > 0) {
    console.log('\n⚠️  Some fonts failed to download.');
    console.log('   You can manually download them from:');
    console.log('   https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari');
    console.log('   https://fonts.google.com/noto/specimen/Noto+Sans+Tamil');
    console.log(`\n   Place the .ttf files in: ${FONTS_DIR}`);
  } else {
    console.log('\n✅ All fonts downloaded successfully!');
    console.log('   You can now start the overlay server with: npm run server');
  }
}

downloadFonts().catch(console.error);
