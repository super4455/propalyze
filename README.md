# Propalyze

Webapplikation til analyse og simulering af ejendomsinvesteringscases. Backend i Node.js/Express, frontend som statiske HTML/CSS/JS-filer, og Azure SQL som database.

## Forudsætninger

For at web-applikationen skal køres, skal man have installeres Node.js og Node Package Manager (npm)

Desuden skal man have adgang til en Azure SQL-database. Loginoplysninger skal ligges i `/code/.env`.

Copy paste følgende ind i .env:

```env
DB_USER=serviceUser
DB_PASSWORD=CBSprog12345
DB_SERVER=prog-eksamen-server.database.windows.net
DB_NAME=free-sql-db-3172225
DB_PORT=1433

BBR_USERNAME=LFESAEPKGQ
BBR_PASSWORD=Mikkel2217!

DATAFORSYNINGEN_TOKEN=b1f172cfadfc99573aa12ed78eb87b60
```

Alternativt, hvis man vil oprette databasen fra bunden, kan man køre indholdet i `sql/createTables.sql` i en Azure SQL-database.


## Kørsel

Fra code-mappen, kør
    npm start
eller
    node index.js
i terminalen for at starte serveren.

Forventet output ved succes:
    Server koerer paa http://localhost:3000  
URL'en skal derefter åbnes i en vilkårlig browser for at bruge applikationen.

## Bemærkning
Det er ikke usædvanligt at det kan tage flere forsøg at få forbindelse til serveren grundet forbindelse til database. Det kan derfor godt tage 2-3 forsøg med npm start eller node index.js at starte serveren.

## Testing
Ved unit-testing, kør 
    npm test
i terminalen fra code-mappen.