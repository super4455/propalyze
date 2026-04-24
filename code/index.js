// index.js - Serverens indgangspunkt

const express = require('express');
const database = require('./database/database');
const addressesRouter = require('./routes/addresses');
const propertiesRouter = require('./routes/properties');
const casesRouter = require('./routes/cases');
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
app.use('/api/addresses', addressesRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/cases', casesRouter);
app.use('/api/kort', kortRouter);
app.use('/api/koeb', koebRouter);
app.use('/api/finansiering', finansieringRouter);
app.use('/api/renovering', renoveringRouter);
app.use('/api/driftsbudget', driftsbudgetRouter);
app.use('/api/udlejning', udlejningRouter);

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