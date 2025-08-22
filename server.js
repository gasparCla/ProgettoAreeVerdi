const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));
const jsonFilePath = path.join(__dirname, "src/data/data.json");

// Field mapping for data transformation
const campiArea = {
  idLoc: "ID Localita",
  zona: "Zona",
  tipo: "Tipo",
  area: "Area",
  classificazione: "Classificazione",
  affidatario: "AFFIDATARIO",
  classificazione_istat: "Classificazione ISTAT",
  superficie_totale: "Superficie totale in mq",
  nome_loc: "Nome Localita",
  descrizione: "Descrizione",
};

// Serve main page
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "src/index.html"))
);

// Load and transform data from JSON
function loadAreasFromJSON() {
  const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
  const rawData = JSON.parse(jsonData);

  return rawData.map(entry => {
    const area = {};

    for (const [key, originalKey] of Object.entries(campiArea)) {
      if (key === "superficie_totale") {
        // Convert superficie to float properly
        const value = entry[originalKey];
        area[key] = value ? parseFloat(value.toString().replace(',', '.')) : null;
      } else if (key === "zona" || key === "area" || key === "idLoc") {
        // Convert zona/area/idLoc to int properly
        area[key] = entry[originalKey] ? parseInt(entry[originalKey]) : null;
      } else {
        // Keep as string for all other fields
        area[key] = entry[originalKey];
      }
    }

    return area;
  });
}

// Save data with proper transformation
function saveData(data, jsonFilePath) {
  const mappedData = data.map(entry => {
    const mapped = {};
    for (const [key, originalKey] of Object.entries(campiArea)) {
      if (key === "superficie_totale") {
        // Convert back to string with comma decimal separator for save
        mapped[originalKey] = entry[key] ? entry[key].toString().replace('.', ',') : '';
      } else {
        mapped[originalKey] = entry[key];
      }
    }
    return mapped;
  });

  fs.writeFile(jsonFilePath, JSON.stringify(mappedData, null, 2), err => {
    if (err) {
      console.error("Errore nel salvataggio:", err);
    } else {
      console.log("File salvato correttamente!");
    }
  });
}

// GET /aree - Read all areas or filter by query parameters
app.get('/aree', (req, res) => {
  try {
    console.log(`\n---\nRequest:\nGET ${req.originalUrl}\n`);

    const queryKeys = Object.keys(req.query);
    const data = loadAreasFromJSON();

    // If no query parameters, return all areas
    if (queryKeys.length === 0) {
      const response = {
        success: true,
        message: `Tutti i ${data.length} aree restituiti con successo`,
        results: data
      };

      console.log(`Response:\n${JSON.stringify(response, null, 2)}\n---`);
      return res.json(response);
    }

    // Filter areas based on query parameters
    const filtered = data.filter(area =>
      queryKeys.every(key =>
        area[key] && String(area[key]).trim().toLowerCase() === String(req.query[key]).trim().toLowerCase()
      )
    );

    const response = {
      success: true,
      message: filtered.length > 0 
        ? `${filtered.length} aree trovate con successo` 
        : 'Nessun area trovata corrispondente ai parametri',
      results: filtered
    };

    console.log(`Response:\n${JSON.stringify(response, null, 2)}\n---`);
    res.json(response);

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Errore nella lettura dei dati' });
  }
});

// POST /aree - Create new area
app.post('/aree', (req, res) => {
  console.log(`\n---\nRequest:\nPOST ${req.originalUrl}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const newArea = req.body;
  const data = loadAreasFromJSON();

  // Check if area with same idLoc already exists
  if (data.some(area => area.idLoc === newArea.idLoc)) {
    return res.status(409).json({ 
      success: false, 
      error: 'Area già esistente con questo ID Località' 
    });
  }

  data.push(newArea);

  try {
    saveData(data, jsonFilePath);
    const response = { 
      success: true, 
      message: 'Area aggiunta con successo', 
      area: newArea 
    };
    
    console.log(`Response:\n${JSON.stringify(response, null, 2)}\n---`);
    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Errore nel salvataggio del file' });
  }
});

// PUT /aree/:idLoc - Update existing area
app.put('/aree/:idLoc', (req, res) => {
  console.log(`\n---\nRequest:\nPUT ${req.originalUrl}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const idLoc = req.params.idLoc;
  const updatedArea = req.body;
  const data = loadAreasFromJSON();
  const index = data.findIndex(area => area.idLoc == idLoc);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Area non trovata' });
  }

  data[index] = updatedArea;
  
  try {
    saveData(data, jsonFilePath);
    const response = { 
      success: true, 
      message: 'Area aggiornata con successo', 
      area: updatedArea 
    };
    
    console.log(`Response:\n${JSON.stringify(response, null, 2)}\n---`);
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Errore nel salvataggio del file' });
  }
});

// DELETE /aree/:idLoc - Delete area
app.delete('/aree/:idLoc', (req, res) => {
  console.log(`\n---\nRequest:\nDELETE ${req.originalUrl}`);

  const idLoc = req.params.idLoc;
  let data = loadAreasFromJSON();
  const originalLength = data.length;
  
  data = data.filter(area => area.idLoc != idLoc);
  
  if (data.length === originalLength) {
    return res.status(404).json({ success: false, error: 'Area non trovata' });
  }

  try {
    saveData(data, jsonFilePath);
    const response = { 
      success: true, 
      message: `Area con ID Località ${idLoc} eliminata con successo` 
    };
    
    console.log(`Response:\n${JSON.stringify(response, null, 2)}\n---`);
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Errore nel salvataggio del file' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Sistema Gestione Aree Verdi avviato sulla porta ${PORT}`);
  console.log(`Apri http://localhost:${PORT} per utilizzare`);
});