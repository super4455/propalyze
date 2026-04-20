// config.js - Læser database-forbindelsesoplysninger fra .env-filen
// og eksporterer dem som et objekt der kan bruges af mssql-pakken.

// dotenv læser .env-filen og lægger værdierne ind i process.env
require('dotenv').config();

// Konfigurations-objekt som mssql forventer
// Felterne her skal hedde præcis user, password, server, database, port
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),

  // Options er specifikt til Azure SQL
  options: {
    // Azure kræver krypteret forbindelse
    encrypt: true,
    // Vi stoler på Azures certifikat
    trustServerCertificate: false
  }
};

// Eksportér konfigurationen så andre filer kan bruge den
module.exports = config;