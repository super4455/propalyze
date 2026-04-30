const sql = require('mssql');
const config = require('./config');

class Database {

  constructor() {
    // Holder pool-objektet når vi har forbundet.
    // En pool genbruger forbindelser i stedet for at oprette en ny pr. query.
    this.pool = null;
  }

  // Opretter forbindelse til databasen. Kaldes én gang når serveren starter.
  async connect() {
    try {
      // Opretter en connection pool og gemmer den
      this.pool = await sql.connect(config);
      console.log('Forbundet til Azure SQL');
    } catch (err) {
      // Hvis forbindelsen fejler, log det og kast fejlen videre
      console.log('Database-forbindelse fejlede:', err.message);
      throw err;
    }
  }

  // Generel query-metode med support for parametre.
  // Bruges af de mere specifikke metoder herunder.
  async query(sqlTekst, parametre = {}) {
    try {
      // Lav et "request"-objekt - det er sådan mssql laver queries
      const request = this.pool.request();

      // Tilføj alle parametre til requesten
      // Det er sådan vi undgår SQL injection (jf. F19 slide 55)
      for (const navn in parametre) {
        request.input(navn, parametre[navn]);
      }

      // Eksekver SQL'en og returner resultatet
      const result = await request.query(sqlTekst);
      return result.recordset; // Result indeholder de returnerede rækker og metadata; vi vil kun have rækkerne.
    } catch (err) {
      console.log('Query fejlede:', err.message);
      throw err;
    }
  }
}

// Eksportér én delt instans (singleton)
// Det betyder at hele appen bruger samme pool
module.exports = new Database();