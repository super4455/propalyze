// index.js - Serverens indgangspunkt

const express = require('express');
const database = require('./database/database');
const addressesRouter = require('./routes/addresses');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/addresses', addressesRouter);




// Start serveren EFTER databaseforbindelsen er oprettet.
// Vi pakker det ind i en async-funktion så vi kan bruge await.
async function start() {
  try {
    // Forbind til databasen først
    await database.connect();

    // Når databasen er klar, start serveren
    app.listen(PORT, () => {
      console.log(`Server koerer paa http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log('Kunne ikke starte serveren:', err.message);
  }
}

start();