// index.js - Serverens indgangspunkt

const express = require('express');
const database = require('./database/database');
const addressesRouter = require('./routes/addresses');
const propertiesRouter = require('./routes/properties');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/addresses', addressesRouter);
app.use('/api/properties', propertiesRouter);

// Start serveren efter databaseforbindelsen er oprettet
async function start() {
  try {
    await database.connect();
    app.listen(PORT, () => {
      console.log(`Server koerer paa http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log('Kunne ikke starte serveren:', err.message);
  }
}

start();