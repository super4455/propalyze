-- Dannelse af Ejendomsprofil table

CREATE TABLE Propalyze.ejendomsprofil (
	ejendomID INT IDENTITY(1,1) PRIMARY KEY,
	husnummer VARCHAR(10) NOT NULL,
	bynavn VARCHAR(50) NOT NULL,
	ejendomstype VARCHAR(50) NOT NULL,
	byggeaar INT NOT NULL CHECK (byggeaar BETWEEN 1000 AND 2100),
	boligareal INT NOT NULL CHECK (boligareal > 0),
	grundareal INT,
	vaerelser INT NOT NULL CHECK (vaerelser > 0),
	postnummer CHAR(4) NOT NULL,
	oprettet_dato DATETIME2 NOT NULL DEFAULT GETDATE(),
	sidste_data_hentning DATETIME2,
	dawaID VARCHAR(50) UNIQUE,
	vejnavn VARCHAR(255) NOT NULL,
	doer VARCHAR(10),
	etage INT,
	koordinat_x DECIMAL(12,4) NULL,
	koordinat_y DECIMAL(12,4) NULL
)

-- Dannelse af Investeringscase table
CREATE TABLE Propalyze.investeringscase (
	caseID INT IDENTITY(1,1) PRIMARY KEY,
	ejendomsID INT NOT NULL,
	navn VARCHAR(50),
	beskrivelse VARCHAR(255),
	start_dato DATETIME2 NOT NULL DEFAULT GETDATE(),

	CONSTRAINT fk_ejendom
	FOREIGN KEY (ejendomsID)
	REFERENCES Propalyze.ejendomsprofil(ejendomID)
	ON DELETE CASCADE
)


-- Dannelse af Køb table
CREATE TABLE Propalyze.koeb (
	koebID INT IDENTITY(1,1) PRIMARY KEY,
	caseID INT NOT NULL,
	ejendomspris DECIMAL(10,2) NOT NULL CHECK (ejendomspris > 0),
	koeb_omkostninger DECIMAL(10,2) NOT NULL CHECK (koeb_omkostninger > 0),
	advokat_udgifter DECIMAL(10,2) NOT NULL CHECK (advokat_udgifter > 0),
	koeber_raadgivning BIT NOT NULL DEFAULT 0,
	tinglysning DECIMAL(10,2) NOT NULL,

	CONSTRAINT fk_koeb_caseID
	FOREIGN KEY (caseID)
	REFERENCES Propalyze.investeringscase(caseID)
	ON DELETE CASCADE
)


-- Dannelse af Driftsbudget table
CREATE TABLE Propalyze.driftsbudget (
	driftsbudgetID INT IDENTITY(1,1) PRIMARY KEY,
	caseID INT NOT NULL,
	oprettet_dato DATETIME2 NOT NULL DEFAULT GETDATE(),

	CONSTRAINT fk_driftsbudget_caseID
	FOREIGN KEY (caseID)
	REFERENCES Propalyze.investeringscase(caseID)
	ON DELETE CASCADE
)

-- Dannelse af Renovering table
CREATE TABLE Propalyze.renovering (
	renoveringID INT IDENTITY(1,1) PRIMARY KEY,
	caseID INT NOT NULL,
	type_renovering VARCHAR(30) NOT NULL,
	renovering_omkostninger DECIMAL(10,2) NOT NULL CHECK(renovering_omkostninger >= 0),
	planlagt_aar INT NOT NULL CHECK(planlagt_aar >= YEAR(GETDATE())),

	CONSTRAINT fk_renovering_caseID
	FOREIGN KEY (caseID)
	REFERENCES Propalyze.investeringscase(caseID)
	ON DELETE CASCADE
)


-- Dannelse af Udlejning table
CREATE TABLE Propalyze.udlejning (
	udlejningsID INT IDENTITY(1,1) PRIMARY KEY,
	caseID INT NOT NULL,
	udlejning_status BIT NOT NULL DEFAULT 0,
	maanedlig_husleje DECIMAL(10,2) NOT NULL,
	maanedlig_udgifter DECIMAL(10,2) NOT NULL,

	CONSTRAINT fk_udlejning_caseID
	FOREIGN KEY (caseID)
	REFERENCES Propalyze.investeringscase(caseID)
	ON DELETE CASCADE
)


-- Dannelse af Udgift table
CREATE TABLE Propalyze.udgift (
	udgiftID INT IDENTITY(1,1) PRIMARY KEY,
	driftsbudgetID INT NOT NULL,
	kategori VARCHAR(30) NOT NULL,
	beloeb DECIMAL(10,2) NOT NULL,
	frekvens VARCHAR(30) NOT NULL,

	CONSTRAINT fk_udgift_driftsbudgetID
	FOREIGN KEY (driftsbudgetID)
	REFERENCES Propalyze.driftsbudget(driftsbudgetID)
	ON DELETE CASCADE
)


-- Dannelse af Indtægt table
CREATE TABLE Propalyze.indtaegt (
	indtaegtID INT IDENTITY(1,1) PRIMARY KEY,
	driftsbudgetID INT NOT NULL,
	kategori VARCHAR(30) NOT NULL,
	beloeb DECIMAL(10,2) NOT NULL,
	frekvens VARCHAR(30) NOT NULL,

	CONSTRAINT fk_indtaegt_driftsbudgetID
	FOREIGN KEY (driftsbudgetID)
	REFERENCES Propalyze.driftsbudget(driftsbudgetID)
	ON DELETE CASCADE
)


-- Dannelse af Finansiering table
CREATE TABLE Propalyze.finansiering (
	finansieringID INT IDENTITY(1,1) PRIMARY KEY,
	caseID INT NOT NULL,
	laanebeloeb DECIMAL(10,2) NOT NULL,
	rente DECIMAL(5,2) NOT NULL,
	loebetid_aar INT NOT NULL,
	afdragsfriaar INT NOT NULL,
	laanetype VARCHAR(50) NOT NULL,

	CONSTRAINT fk_finansiering_caseID
	FOREIGN KEY (caseID)
	REFERENCES Propalyze.investeringscase(caseID)
	ON DELETE CASCADE
)
