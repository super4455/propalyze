const express = require('express');
const database = require('./database/database');
const adresserRouter = require('./routes/adresser');
const ejendommeRouter = require('./routes/ejendomme');
const casesRouter = require('./routes/cases');
const caseSimuleringRouter = require('./routes/caseSimulering');
const caseSammenligningRouter = require('./routes/caseSammenligning');
const kortRouter = require('./routes/kort');
const koebRouter = require('./routes/caseformular/koeb');
const finansieringRouter = require('./routes/caseformular/finansiering');
const renoveringRouter = require('./routes/caseformular/renovering');
const driftsbudgetRouter = require('./routes/caseformular/driftsbudget');
const udlejningRouter = require('./routes/caseformular/udlejning');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/adresser', adresserRouter);
app.use('/api/ejendomme', ejendommeRouter);
app.use('/api/cases', casesRouter);
app.use('/api/cases', caseSimuleringRouter);
app.use('/api/cases', caseSammenligningRouter);
app.use('/api/kort', kortRouter);
app.use('/api/koeb', koebRouter);
app.use('/api/finansiering', finansieringRouter);
app.use('/api/renovering', renoveringRouter);
app.use('/api/driftsbudget', driftsbudgetRouter);
app.use('/api/udlejning', udlejningRouter);

// Start serveren efter databaseforbindelsen er oprettet
async function start() {
  try {
    await database.connect(); // Kalder connect-metode fra database-objektet. Objektet oprettes og eksporteres i database.js men variabel defineres i index.js
    app.listen(PORT, () => {
      console.log(`Server koerer paa http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log('Kunne ikke starte serveren:', err.message);
  }
}

start();