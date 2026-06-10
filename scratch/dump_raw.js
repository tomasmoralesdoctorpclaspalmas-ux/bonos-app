const fs = require('fs');
const path = require('path');

async function dumpRaw(name) {
  let url = `https://firestore.googleapis.com/v1/projects/bonos-491fa/databases/(default)/documents/${name}?pageSize=300`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const destDir = path.join(__dirname);
    fs.writeFileSync(path.join(destDir, `raw_${name}.json`), JSON.stringify(json, null, 2));
    console.log(`Saved raw_${name}.json successfully to ${destDir}`);
  } catch (err) {
    console.error(`Error fetching raw ${name}:`, err);
  }
}

async function run() {
  const destDir = path.join(__dirname);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  await Promise.all([
    dumpRaw('bonos'),
    dumpRaw('interventions'),
    dumpRaw('users'),
    dumpRaw('empresas')
  ]);
}

run();
