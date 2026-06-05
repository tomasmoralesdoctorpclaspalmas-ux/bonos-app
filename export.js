const fs = require('fs');
const https = require('https');

const projectId = 'bonos-491fa';
const apiKey = 'AIzaSyBgR3v69PQnoUwe60O9AbXeFqxpg6aEQkQ';
const collections = ['empresas', 'users', 'bonos', 'interventions', 'punctual_interventions'];

const logFile = 'export.log';
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
}

fs.writeFileSync(logFile, ''); // clear log

function fetchCollection(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?key=${apiKey}&pageSize=300`;
    log(`HTTP GET: ${url.replace(apiKey, 'API_KEY')}`);
    https.get(url, (res) => {
      log(`Response status for ${collectionName}: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          const parsed = JSON.parse(data);
          resolve(parsed.documents || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      log(`HTTP Error for ${collectionName}: ${err.message}`);
      reject(err);
    });
  });
}

async function run() {
  log('Starting export...');
  const result = {};
  for (const col of collections) {
    log(`Fetching ${col}...`);
    try {
      result[col] = await fetchCollection(col);
      log(`Fetched ${result[col].length} documents from ${col}`);
    } catch (e) {
      log(`Error fetching ${col}: ${e.message}`);
    }
  }
  fs.writeFileSync('firestore_data.json', JSON.stringify(result, null, 2));
  log('Saved all data to firestore_data.json');
}

run();
