const sql = require('mssql');
const config = require('./config');

class Database {

  constructor() {
    // Connection-pooling gør, at vi kan håndtere flere samtidige forespørgsler mere effektivt.
    // Ved at oprette et pool objekt kan vi genbruge forbindelser
    this.pool = null;
  }

  // Opretter forbindelse til databasen. Kaldes én gang når serveren starter.
  async connect() {
    try {
      // .connect metoden opretter forbindelsen og tilhører mssql biblioteket
      this.pool = await sql.connect(config);
      console.log('Forbundet til Azure SQL');
    } catch (err) {
      console.log('Database-forbindelse fejlede:', err.message);
      throw err;
    }
  }

  // Generel query metode, der bruges af andre services til at lave SQL-forespørgsler
  async query(sqlTekst, parametre = {}) {
    try {
      // Et request-objekt oprettes, så vi kan lave en SQL-forespørgsel
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