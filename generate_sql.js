const fs = require('fs');

function escapeString(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function escapeTimestamp(ts) {
  if (!ts) return 'NULL';
  // Firestore timestampValue is already ISO string
  return `'${ts}'`;
}

function escapeBoolean(b) {
  if (b === undefined || b === null) return 'FALSE';
  return b ? 'TRUE' : 'FALSE';
}

function escapeNumeric(num) {
  if (num === undefined || num === null) return '0';
  const parsed = parseFloat(num);
  return isNaN(parsed) ? '0' : parsed.toString();
}

function escapeArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "'{}'";
  const escapedElements = arr.map(el => `"${el.replace(/"/g, '\\"')}"`);
  return `'{${escapedElements.join(',')}}'`;
}

// Extract field values from Firestore JSON format
function getVal(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return parseFloat(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    const values = field.arrayValue.values || [];
    return values.map(v => getVal(v));
  }
  return null;
}

function run() {
  if (!fs.existsSync('firestore_data.json')) {
    console.error('Error: firestore_data.json no existe. Ejecuta primero "node export.js"');
    process.exit(1);
  }

  const raw = fs.readFileSync('firestore_data.json', 'utf8');
  const data = JSON.parse(raw);

  let sql = `-- MIGRACIÓN COMPLETA DE FIREBASE A SUPABASE --
-- Copia y pega este contenido en el SQL Editor de Supabase --

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Empresas
CREATE TABLE IF NOT EXISTS empresas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Usuarios (Sincronizada con Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
    company_name TEXT,
    empresa_id TEXT REFERENCES empresas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Bonos de Horas
CREATE TABLE IF NOT EXISTS bonos (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    client_name TEXT,
    service TEXT,
    hours NUMERIC NOT NULL,
    hours_used NUMERIC DEFAULT 0,
    hours_remaining NUMERIC,
    status TEXT NOT NULL CHECK (status IN ('active', 'depleted', 'expired')) DEFAULT 'active',
    never_expires BOOLEAN DEFAULT false,
    issue_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabla de Intervenciones vinculadas a un Bono
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    client_name TEXT,
    bono_id TEXT REFERENCES bonos(id) ON DELETE SET NULL,
    hours_used NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabla de Asistencias Puntuales (Soporta múltiples imágenes de evidencia)
CREATE TABLE IF NOT EXISTS punctual_interventions (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    client_name TEXT,
    hours NUMERIC NOT NULL,
    start_time TEXT,
    end_time TEXT,
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Configurar Bucket de Almacenamiento
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de lectura pública para el bucket
CREATE POLICY "Public Read Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'evidencias');

-- Políticas de inserción libre para usuarios autenticados
CREATE POLICY "Auth Insert Access" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'evidencias');

-- LIMPIAR TABLAS POR SI ACASO
TRUNCATE punctual_interventions, interventions, bonos, users, empresas CASCADE;

`;

  // === MIGRAR EMPRESAS ===
  sql += `\n-- ==============================================\n`;
  sql += `-- INSERCIÓN DE EMPRESAS\n`;
  sql += `-- ==============================================\n`;
  
  const empresas = data.empresas || [];
  empresas.forEach(doc => {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    const name = getVal(fields.name);
    const createdAt = getVal(fields.createdAt) || doc.createTime;
    const updatedAt = getVal(fields.updatedAt) || doc.updateTime;

    sql += `INSERT INTO empresas (id, name, created_at, updated_at) VALUES (
  ${escapeString(id)}, 
  ${escapeString(name)}, 
  ${escapeTimestamp(createdAt)}, 
  ${escapeTimestamp(updatedAt)}
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;\n`;
  });

  // === MIGRAR USUARIOS ===
  sql += `\n-- ==============================================\n`;
  sql += `-- INSERCIÓN DE USUARIOS\n`;
  sql += `-- ==============================================\n`;

  const users = data.users || [];
  users.forEach(doc => {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    const name = getVal(fields.name);
    const email = getVal(fields.email);
    const phone = getVal(fields.phone);
    const role = getVal(fields.role) || 'client';
    const companyName = getVal(fields.companyName);
    let empresaId = getVal(fields.empresaId);
    
    // Check if the referenced empresaId exists in our list, if not make it null
    if (empresaId && !empresas.some(e => e.name.endsWith('/' + empresaId))) {
      empresaId = null;
    }

    const createdAt = getVal(fields.createdAt) || doc.createTime;
    const updatedAt = getVal(fields.updatedAt) || doc.updateTime;

    sql += `INSERT INTO users (id, name, email, phone, role, company_name, empresa_id, created_at, updated_at) VALUES (
  ${escapeString(id)}, 
  ${escapeString(name)}, 
  ${escapeString(email)}, 
  ${escapeString(phone)}, 
  ${escapeString(role)}, 
  ${escapeString(companyName)}, 
  ${empresaId ? escapeString(empresaId) : 'NULL'}, 
  ${escapeTimestamp(createdAt)}, 
  ${escapeTimestamp(updatedAt)}
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  phone = EXCLUDED.phone, 
  role = EXCLUDED.role, 
  company_name = EXCLUDED.company_name, 
  empresa_id = EXCLUDED.empresa_id, 
  updated_at = EXCLUDED.updated_at;\n`;
  });

  // === MIGRAR BONOS ===
  sql += `\n-- ==============================================\n`;
  sql += `-- INSERCIÓN DE BONOS DE HORAS\n`;
  sql += `-- ==============================================\n`;

  const bonos = data.bonos || [];
  bonos.forEach(doc => {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    let clientId = getVal(fields.clientId);
    const clientName = getVal(fields.clientName);
    const service = getVal(fields.service);
    const hours = getVal(fields.hours);
    const hoursUsed = getVal(fields.hoursUsed) || 0;
    const hoursRemaining = getVal(fields.hoursRemaining);
    const status = getVal(fields.status) || 'active';
    const neverExpires = getVal(fields.neverExpires) || false;
    const issueDate = getVal(fields.issueDate);
    const expiryDate = getVal(fields.expiryDate);
    const notes = getVal(fields.notes);
    const createdAt = getVal(fields.createdAt) || doc.createTime;
    const updatedAt = getVal(fields.updatedAt) || doc.updateTime;

    // Check if referenced client_id exists in users list, if not set null
    if (clientId && !users.some(u => u.name.endsWith('/' + clientId))) {
      clientId = null;
    }

    sql += `INSERT INTO bonos (id, client_id, client_name, service, hours, hours_used, hours_remaining, status, never_expires, issue_date, expiry_date, notes, created_at, updated_at) VALUES (
  ${escapeString(id)}, 
  ${clientId ? escapeString(clientId) : 'NULL'}, 
  ${escapeString(clientName)}, 
  ${escapeString(service)}, 
  ${escapeNumeric(hours)}, 
  ${escapeNumeric(hoursUsed)}, 
  ${escapeNumeric(hoursRemaining)}, 
  ${escapeString(status)}, 
  ${escapeBoolean(neverExpires)}, 
  ${escapeTimestamp(issueDate)}, 
  ${escapeTimestamp(expiryDate)}, 
  ${escapeString(notes)}, 
  ${escapeTimestamp(createdAt)}, 
  ${escapeTimestamp(updatedAt)}
);\n`;
  });

  // === MIGRAR INTERVENCIONES ===
  sql += `\n-- ==============================================\n`;
  sql += `-- INSERCIÓN DE INTERVENCIONES\n`;
  sql += `-- ==============================================\n`;

  const interventions = data.interventions || [];
  interventions.forEach(doc => {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    let clientId = getVal(fields.clientId);
    const clientName = getVal(fields.clientName);
    let bonoId = getVal(fields.bonoId);
    const hoursUsed = getVal(fields.hoursUsed);
    const date = getVal(fields.date);
    const notes = getVal(fields.notes);
    const createdAt = getVal(fields.createdAt) || doc.createTime;
    const updatedAt = getVal(fields.updatedAt) || doc.updateTime;

    if (clientId && !users.some(u => u.name.endsWith('/' + clientId))) {
      clientId = null;
    }
    if (bonoId && !bonos.some(b => b.name.endsWith('/' + bonoId))) {
      bonoId = null;
    }

    sql += `INSERT INTO interventions (id, client_id, client_name, bono_id, hours_used, date, notes, created_at, updated_at) VALUES (
  ${escapeString(id)}, 
  ${clientId ? escapeString(clientId) : 'NULL'}, 
  ${escapeString(clientName)}, 
  ${bonoId ? escapeString(bonoId) : 'NULL'}, 
  ${escapeNumeric(hoursUsed)}, 
  ${escapeTimestamp(date)}, 
  ${escapeString(notes)}, 
  ${escapeTimestamp(createdAt)}, 
  ${escapeTimestamp(updatedAt)}
);\n`;
  });

  // === MIGRAR ASISTENCIAS PUNTUALES ===
  sql += `\n-- ==============================================\n`;
  sql += `-- INSERCIÓN DE ASISTENCIAS PUNTUALES\n`;
  sql += `-- ==============================================\n`;

  const punctual = data.punctual_interventions || [];
  punctual.forEach(doc => {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    let clientId = getVal(fields.clientId);
    const clientName = getVal(fields.clientName);
    const hours = getVal(fields.hours);
    const startTime = getVal(fields.startTime);
    const endTime = getVal(fields.endTime);
    const notes = getVal(fields.notes);
    const date = getVal(fields.date);
    const images = getVal(fields.images) || [];
    const createdAt = getVal(fields.createdAt) || doc.createTime;
    const updatedAt = getVal(fields.updatedAt) || doc.updateTime;

    if (clientId && !users.some(u => u.name.endsWith('/' + clientId))) {
      clientId = null;
    }

    sql += `INSERT INTO punctual_interventions (id, client_id, client_name, hours, start_time, end_time, notes, date, images, created_at, updated_at) VALUES (
  ${escapeString(id)}, 
  ${clientId ? escapeString(clientId) : 'NULL'}, 
  ${escapeString(clientName)}, 
  ${escapeNumeric(hours)}, 
  ${escapeString(startTime)}, 
  ${escapeString(endTime)}, 
  ${escapeString(notes)}, 
  ${escapeTimestamp(date)}, 
  ${escapeArray(images)}, 
  ${escapeTimestamp(createdAt)}, 
  ${escapeTimestamp(updatedAt)}
);\n`;
  });

  fs.writeFileSync('import.sql', sql);
  console.log('✅ Archivo import.sql generado con éxito.');
}

run();
