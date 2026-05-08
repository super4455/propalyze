// dotenv læser .env-filen og lægger værdierne ind i process.env
require('dotenv').config();

// Vi har her brugt Microsofts quickstart guide til, hvordan man bruger Node.js til at lave database querys.
// Henvisning: https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-nodejs
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),

  // Options er specifikt til Azure SQL
  options: {
    // Azure kræver krypteret forbindelse
    encrypt: true
  }
};

// Eksportér konfigurationen så andre filer kan bruge den
module.exports = config;