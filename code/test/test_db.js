const database = require('../code/database/database');

async function test() {
  try {
    // Opret forbindelse
    await database.connect();

    // Lav en simpel query der bare beder databasen om at returnere et tal
    // Hvis vi får 1 retur, virker forbindelsen
    const resultat = await database.query('SELECT 1 AS tal');
    console.log('Query resultat:', resultat);

    // Bonus: list jeres tabeller for at bekræfte at vi rammer rigtig database
    const tabeller = await database.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'Propalyze'
    `);
    console.log('Tabeller i Propalyze schema:', tabeller);

  } catch (err) {
    console.log('Test fejlede:', err.message);
  }
}

test();