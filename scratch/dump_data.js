const fs = require('fs');

async function getCollection(name) {
  let docs = [];
  let url = `https://firestore.googleapis.com/v1/projects/bonos-491fa/databases/(default)/documents/${name}?pageSize=300`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.documents) {
      docs = json.documents.map(d => {
        const fields = {};
        for (const [k, v] of Object.entries(d.fields || {})) {
          if ('stringValue' in v) fields[k] = v.stringValue;
          else if ('integerValue' in v) fields[k] = parseInt(v.integerValue, 10);
          else if ('doubleValue' in v) fields[k] = parseFloat(v.doubleValue);
          else if ('timestampValue' in v) fields[k] = v.timestampValue;
          else if ('booleanValue' in v) fields[k] = v.booleanValue;
          else fields[k] = v;
        }
        return {
          id: d.name.split('/').pop(),
          ...fields
        };
      });
    }
  } catch (err) {
    console.error(`Error fetching ${name}:`, err);
  }
  return docs;
}

async function run() {
  const [empresas, users, interventions, punctual, bonos] = await Promise.all([
    getCollection('empresas'),
    getCollection('users'),
    getCollection('interventions'),
    getCollection('punctual_interventions'),
    getCollection('bonos')
  ]);

  console.log('--- EMPRESAS ---');
  empresas.forEach(e => console.log(`ID: ${e.id} | Name: ${e.name}`));

  console.log('\n--- USERS ---');
  users.forEach(u => console.log(`ID: ${u.uid || u.id} | Name: ${u.name} | EmpresaId: ${u.empresaId} | CompanyName: ${u.companyName}`));

  console.log('\n--- BONOS ---');
  bonos.forEach(b => console.log(`ID: ${b.id} | ClientId: ${b.clientId} | ClientName: ${b.clientName} | Service: ${b.service}`));

  console.log('\n--- INTERVENTIONS ---');
  interventions.forEach(i => {
    console.log(`ID: ${i.id} | ClientId: ${i.clientId} | clientName: ${i.clientName} | HoursUsed: ${i.hoursUsed}`);
  });

  console.log('\n--- PUNCTUAL INTERVENTIONS ---');
  punctual.forEach(p => {
    console.log(`ID: ${p.id} | ClientId: ${p.clientId} | ClientName: ${p.clientName} | Hours: ${p.hours} | Date: ${p.date} | Notes: ${p.notes}`);
  });
}

run();
