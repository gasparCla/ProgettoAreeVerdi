const API_BASE = '/aree';
let map;
let markersLayer;
let currentAreas = [];
let displayedAreas = [];
let currentAreaToDelete = null;
let zoneCoordinates = {};
let displayOffset = 0;
const ITEMS_PER_PAGE = 500;

// Load zone coordinates
async function loadZoneCoordinates() {
    try {
	const response = await fetch('/data/zoneCoords.json');
	const zones = await response.json();
	
	// Convert array to object for easier lookup
	zones.forEach(zone => {
	    zoneCoordinates[zone.Zona] = {
		lat: zone.Lat,
		lon: zone.Lon,
		municipio: zone.Municipio
	    };
	});
    } catch (error) {
	console.error('Error loading zone coordinates:', error);
    }
}

// Calculate next available ID
function calculateNextId(areas) {
    if (!areas || areas.length === 0) return 1;
    
    const existingIds = areas.map(area => area.idLoc).filter(id => id != null);
    if (existingIds.length === 0) return 1;
    
    const maxId = Math.max(...existingIds);
    return maxId + 1;
}

// Initialize map
function initMap() {
    // Center on Milan
    map = L.map('map').setView([45.4642, 9.1900], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	maxZoom: 19
    }).addTo(map);
    
    markersLayer = L.layerGroup().addTo(map);
}

// Color coding for different types of green areas
function getMarkerColor(tipo) {
    switch(tipo?.toLowerCase()) {
	case 'parco': return '#48bb78';
	case 'filare': return '#ed8936';
	case 'scuola': return '#9f7aea';
	default: return '#9f7aea';
    }
}

// Create custom marker
function createMarker(area) {
    const color = getMarkerColor(area.tipo);
    
    const marker = L.circleMarker([area.lat, area.lon], {
	radius: 8,
	fillColor: color,
	color: '#fff',
	weight: 2,
	opacity: 1,
	fillOpacity: 0.8
    });

    const zoneName = zoneCoordinates[area.zona]?.municipio || `Zona ${area.zona}`;
    
    const popupContent = `
	<div style="font-family: 'Segoe UI', sans-serif;">
	    <div style="font-weight: bold; color: #2d3748; margin-bottom: 8px;">
		${area.nome_loc || 'Area Verde'}
	    </div>
	    <div style="color: #4a5568; line-height: 1.4;">
		<strong>Tipo:</strong> ${area.tipo || 'N/A'}<br>
		<strong>Zona:</strong> ${area.zona} - ${zoneName}<br>
		<strong>Area:</strong> ${area.area || 'N/A'}<br>
		<strong>Superficie:</strong> ${area.superficie_totale || 'N/A'} mq<br>
		<strong>Classificazione:</strong> ${area.classificazione || 'N/A'}<br>
		<strong>Affidatario:</strong> ${area.affidatario || 'N/A'}<br>
		<strong>Descrizione:</strong> ${area.descrizione || 'N/A'}
	    </div>
	</div>
    `;
    
    marker.bindPopup(popupContent);
    return marker;
}

// Add areas to map with real zone coordinates
function addAreasToMap(areas) {
    markersLayer.clearLayers();
    
    if (!areas || areas.length === 0) {
	return;
    }

    areas.forEach((area) => {
	let coords;
	
	if (area.zona && zoneCoordinates[area.zona]) {
	    const zoneCoord = zoneCoordinates[area.zona];
	    // Add random offset within the zone (approximately 500m radius)
	    coords = {
		lat: zoneCoord.lat + (Math.random() - 0.5) * 0.008,
		lon: zoneCoord.lon + (Math.random() - 0.5) * 0.008
	    };
	} else {
	    // Fallback to Milan center with random offset
	    coords = {
		lat: 45.4642 + (Math.random() - 0.5) * 0.05,
		lon: 9.1900 + (Math.random() - 0.5) * 0.05
	    };
	}

	const areaWithCoords = { ...area, lat: coords.lat, lon: coords.lon };
	const marker = createMarker(areaWithCoords);
	markersLayer.addLayer(marker);
    });
}

// Show message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="${type}">${text}</div>`;
    setTimeout(() => {
	messageDiv.innerHTML = '';
    }, 5000);
}

// Update load more button and counter
function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreButton = document.getElementById('loadMoreResults');
    const counter = document.getElementById('resultsCounter');
    
    if (currentAreas.length > displayedAreas.length) {
        loadMoreContainer.style.display = 'block';
        const remaining = currentAreas.length - displayedAreas.length;
        counter.textContent = `Visualizzati ${displayedAreas.length} di ${currentAreas.length} risultati (${remaining} rimanenti)`;
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// Display results with pagination
function displayResults(areas, append = false) {
    const resultsDiv = document.getElementById('results');
    
    if (!areas || areas.length === 0) {
	resultsDiv.innerHTML = '<p>Nessuna area trovata.</p>';
	document.getElementById('loadMoreContainer').style.display = 'none';
	return;
    }

    // Reset display state if not appending
    if (!append) {
        currentAreas = areas;
        displayedAreas = [];
        displayOffset = 0;
    }

    // Get the next batch of areas to display
    const nextBatch = currentAreas.slice(displayOffset, displayOffset + ITEMS_PER_PAGE);
    displayedAreas = displayedAreas.concat(nextBatch);
    displayOffset += ITEMS_PER_PAGE;

    let html = '';
    if (!append) {
        html = `<h4>Trovate ${areas.length} aree verdi:</h4>`;
    }
    
    nextBatch.forEach(area => {
	html += `
	    <div class="area-item">
		<div class="area-header">
		    <div class="area-name">${area.nome_loc || 'Area Verde'}</div>
		    <div class="area-type">${area.tipo || 'N/A'}</div>
		</div>
		<div class="area-details">
		    <div><strong>ID:</strong> ${area.idLoc}</div>
		    <div><strong>Zona:</strong> ${area.zona || 'N/A'}</div>
		    <div><strong>Area:</strong> ${area.area || 'N/A'}</div>
		    <div><strong>Superficie:</strong> ${area.superficie_totale || 'N/A'} mq</div>
		    <div><strong>Classificazione:</strong> ${area.classificazione || 'N/A'}</div>
		    <div><strong>Affidatario:</strong> ${area.affidatario || 'N/A'}</div>
		</div>
		${area.descrizione ? `<div style="margin-top: 10px;"><strong>Descrizione:</strong> ${area.descrizione}</div>` : ''}
		<div class="action-buttons">
		    <button class="btn btn-small" onclick="editArea(${area.idLoc})">Modifica</button>
		    <button class="btn btn-small btn-danger" onclick="confirmDeleteArea(${area.idLoc}, '${(area.nome_loc || 'Area').replace(/'/g, "\\'")}')">Elimina</button>
		</div>
	    </div>
	`;
    });
    
    if (append) {
        resultsDiv.innerHTML += html;
    } else {
        resultsDiv.innerHTML = html;
        // Add displayed areas to map on first load
        addAreasToMap(displayedAreas);
    }
    
    updateLoadMoreButton();
}

// Load more results
function loadMoreResults() {
    if (displayOffset < currentAreas.length) {
        displayResults(currentAreas, true);
        // Add new batch to map
        const newBatch = displayedAreas.slice(displayedAreas.length - ITEMS_PER_PAGE);
        addAreasToMap(displayedAreas); // Re-add all displayed areas to map
    }
}

// Load initial areas (first 10 only)
async function loadInitialAreas() {
    try {
	showMessage('Caricamento prime aree in corso...', 'loading');
	const response = await fetch(API_BASE);
	const data = await response.json();
	
	if (data.success) {
	    displayResults(data.results);
	    showMessage(`Prime ${Math.min(ITEMS_PER_PAGE, data.results.length)} aree caricate`, 'success');
	    
	    // Set default ID for new area form
	    const nextId = calculateNextId(data.results);
	    document.getElementById('newIdLoc').value = nextId;
	} else {
	    showMessage(data.error || 'Errore nel caricamento', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Load all areas and set up default ID
async function loadAllAreas() {
    try {
	showMessage('Caricamento tutte le aree in corso...', 'loading');
	const response = await fetch(API_BASE);
	const data = await response.json();
	
	if (data.success) {
	    currentAreas = data.results;
	    displayedAreas = data.results; // Show all areas
	    displayOffset = data.results.length; // Set offset to prevent load more
	    
	    let html = `<h4>Trovate ${data.results.length} aree verdi:</h4>`;
	    
	    data.results.forEach(area => {
		html += `
		    <div class="area-item">
			<div class="area-header">
			    <div class="area-name">${area.nome_loc || 'Area Verde'}</div>
			    <div class="area-type">${area.tipo || 'N/A'}</div>
			</div>
			<div class="area-details">
			    <div><strong>ID:</strong> ${area.idLoc}</div>
			    <div><strong>Zona:</strong> ${area.zona || 'N/A'}</div>
			    <div><strong>Area:</strong> ${area.area || 'N/A'}</div>
			    <div><strong>Superficie:</strong> ${area.superficie_totale || 'N/A'} mq</div>
			    <div><strong>Classificazione:</strong> ${area.classificazione || 'N/A'}</div>
			    <div><strong>Affidatario:</strong> ${area.affidatario || 'N/A'}</div>
			</div>
			${area.descrizione ? `<div style="margin-top: 10px;"><strong>Descrizione:</strong> ${area.descrizione}</div>` : ''}
			<div class="action-buttons">
			    <button class="btn btn-small" onclick="editArea(${area.idLoc})">Modifica</button>
			    <button class="btn btn-small btn-danger" onclick="confirmDeleteArea(${area.idLoc}, '${(area.nome_loc || 'Area').replace(/'/g, "\\'")}')">Elimina</button>
			</div>
		    </div>
		`;
	    });
	    
	    document.getElementById('results').innerHTML = html;
	    addAreasToMap(data.results);
	    showMessage(data.message, 'success');
	    
	    // Hide load more button when all results are shown
	    document.getElementById('loadMoreContainer').style.display = 'none';
	    
	    // Set default ID for new area form
	    const nextId = calculateNextId(currentAreas);
	    document.getElementById('newIdLoc').value = nextId;
	} else {
	    showMessage(data.error || 'Errore nel caricamento', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Search areas
async function searchAreas(params) {
    try {
	showMessage('Ricerca in corso...', 'loading');
	const url = new URL(API_BASE, window.location.origin);
	Object.keys(params).forEach(key => {
	    if (params[key]) url.searchParams.append(key, params[key]);
	});
	
	const response = await fetch(url);
	const data = await response.json();
	
	if (data.success) {
	    displayResults(data.results);
	    showMessage(data.message, 'success');
	} else {
	    showMessage(data.error || 'Errore nella ricerca', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Add new area
async function addArea(areaData) {
    try {
	showMessage('Aggiunta area in corso...', 'loading');
	const response = await fetch(API_BASE, {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/json'
	    },
	    body: JSON.stringify(areaData)
	});
	
	const data = await response.json();
	
	if (data.success) {
	    showMessage(data.message, 'success');
	    document.getElementById('addForm').reset();
	    loadInitialAreas(); // Refresh the list
	} else {
	    showMessage(data.error || 'Errore nell\'aggiunta', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Update area
async function updateArea(idLoc, areaData) {
    try {
	showMessage('Aggiornamento in corso...', 'loading');
	const response = await fetch(`${API_BASE}/${idLoc}`, {
	    method: 'PUT',
	    headers: {
		'Content-Type': 'application/json'
	    },
	    body: JSON.stringify(areaData)
	});
	
	const data = await response.json();
	
	if (data.success) {
	    showMessage(data.message, 'success');
	    document.getElementById('modifyAreaInfo').style.display = 'none';
	    document.getElementById('modifySearch').value = '';
	    loadInitialAreas(); // Refresh the list
	} else {
	    showMessage(data.error || 'Errore nell\'aggiornamento', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Delete area
async function deleteAreaById(idLoc) {
    try {
	showMessage('Eliminazione in corso...', 'loading');
	const response = await fetch(`${API_BASE}/${idLoc}`, {
	    method: 'DELETE'
	});
	
	const data = await response.json();
	
	if (data.success) {
	    showMessage(data.message, 'success');
	    document.getElementById('deleteAreaInfo').style.display = 'none';
	    document.getElementById('deleteSearch').value = '';
	    currentAreaToDelete = null;
	    loadInitialAreas(); // Refresh the list
	} else {
	    showMessage(data.error || 'Errore nell\'eliminazione', 'error');
	}
    } catch (error) {
	console.error('Error:', error);
	showMessage('Errore di connessione al server', 'error');
    }
}

// Find area by ID Località (idLoc)
async function findAreaById(idLoc) {
    try {
	// Search specifically by idLoc parameter
	const response = await fetch(`${API_BASE}?idLoc=${idLoc}`);
	const data = await response.json();
	
	if (data.success && data.results.length > 0) {
	    // Return the first matching area with this idLoc
	    return data.results[0];
	}
	return null;
    } catch (error) {
	console.error('Error finding area by ID Località:', error);
	return null;
    }
}

// Edit area (populate modal or form)
async function editArea(idLoc) {
    const area = await findAreaById(idLoc);
    if (!area) {
	showMessage('Area non trovata', 'error');
	return;
    }

    // Populate modify form
    document.getElementById('modifySearch').value = idLoc;
    document.getElementById('searchForModify').click();
}

// Confirm delete area
function confirmDeleteArea(idLoc, areaName) {
    currentAreaToDelete = idLoc;
    document.getElementById('deleteSearch').value = idLoc;
    document.getElementById('searchForDelete').click();
}

// Form data to object with validation
function formDataToObject(formData) {
    const obj = {};
    for (let [key, value] of formData.entries()) {
	if (key === 'zona' || key === 'idLoc') {
	    const numValue = parseInt(value);
	    if (key === 'zona' && (numValue < 1 || numValue > 9)) {
		throw new Error('Zona deve essere compresa tra 1 e 9');
	    }
	    obj[key] = numValue || null;
	} else if (key === 'superficie_totale') {
	    const floatValue = parseFloat(value);
	    if (floatValue <= 0) {
		throw new Error('Superficie deve essere maggiore di 0');
	    }
	    obj[key] = floatValue || null;
	} else {
	    obj[key] = value || null;
	}
    }
    return obj;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async function() {
    await loadZoneCoordinates();
    initMap();
    loadInitialAreas(); // Load only first 10 results initially
    
    // Search form
    document.getElementById('searchForm').addEventListener('submit', function(e) {
	e.preventDefault();
	const formData = new FormData(this);
	const params = {};
	
	for (let [key, value] of formData.entries()) {
	    if (value.trim()) {
		params[key] = value;
	    }
	}
	
	searchAreas(params);
    });

    // Load all button
    document.getElementById('loadAll').addEventListener('click', function() {
	loadAllAreas();
    });

    // Load more results button
    document.getElementById('loadMoreResults').addEventListener('click', function() {
	loadMoreResults();
    });

    // Add form
    document.getElementById('addForm').addEventListener('submit', function(e) {
	e.preventDefault();
	try {
	    const formData = new FormData(this);
	    const areaData = formDataToObject(formData);
	    addArea(areaData);
	} catch (error) {
	    showMessage(error.message, 'error');
	}
    });

    // Search for modify
    document.getElementById('searchForModify').addEventListener('click', async function() {
	const idLoc = document.getElementById('modifySearch').value;
	if (!idLoc) {
	    showMessage('Inserisci un ID Località', 'error');
	    return;
	}

	// Validate that input is a number
	const idLocNum = parseInt(idLoc);
	if (isNaN(idLocNum)) {
	    showMessage('ID Località deve essere un numero', 'error');
	    return;
	}

	const area = await findAreaById(idLocNum);
	if (!area) {
	    showMessage(`Area con ID Località ${idLocNum} non trovata`, 'error');
	    return;
	}

	const zoneName = zoneCoordinates[area.zona]?.municipio || `Zona ${area.zona}`;

	// Show area details with more information for clarity
	document.getElementById('foundAreaDetails').innerHTML = `
	    <strong>${area.nome_loc || 'Nome non specificato'}</strong><br>
	    <strong>ID Località:</strong> ${area.idLoc}<br>
	    <strong>Tipo:</strong> ${area.tipo || 'N/A'} | <strong>Zona:</strong> ${area.zona} - ${zoneName}<br>
	    <strong>Area:</strong> ${area.area || 'N/A'} | <strong>Superficie:</strong> ${area.superficie_totale || 'N/A'} mq<br>
	    <strong>Classificazione:</strong> ${area.classificazione || 'N/A'}
	`;

	// Populate form with current values
	document.getElementById('modifyIdLoc').value = area.idLoc;
	document.getElementById('modifyNomeLoc').value = area.nome_loc || '';
	document.getElementById('modifyZona').value = area.zona || '';
	document.getElementById('modifyTipo').value = area.tipo || '';
	document.getElementById('modifyArea').value = area.area || '';
	document.getElementById('modifyClassificazione').value = area.classificazione || '';
	document.getElementById('modifyAffidatario').value = area.affidatario || '';
	document.getElementById('modifySuperficieTotale').value = area.superficie_totale || '';
	document.getElementById('modifyDescrizione').value = area.descrizione || '';
	document.getElementById('modifyClassificazioneIstat').value = area.classificazione_istat || '';

	document.getElementById('modifyAreaInfo').style.display = 'block';
	showMessage(`Area con ID Località ${idLocNum} caricata per modifica`, 'success');
    });

    // Modify form
    document.getElementById('modifyForm').addEventListener('submit', function(e) {
	e.preventDefault();
	try {
	    const formData = new FormData(this);
	    const areaData = formDataToObject(formData);
	    const idLoc = areaData.idLoc;
	    updateArea(idLoc, areaData);
	} catch (error) {
	    showMessage(error.message, 'error');
	}
    });

    // Cancel modify
    document.getElementById('cancelModify').addEventListener('click', function() {
	document.getElementById('modifyAreaInfo').style.display = 'none';
	document.getElementById('modifySearch').value = '';
    });

    // Search for delete
    document.getElementById('searchForDelete').addEventListener('click', async function() {
	const idLoc = document.getElementById('deleteSearch').value;
	if (!idLoc) {
	    showMessage('Inserisci un ID Località', 'error');
	    return;
	}

	// Validate that input is a number
	const idLocNum = parseInt(idLoc);
	if (isNaN(idLocNum)) {
	    showMessage('ID Località deve essere un numero', 'error');
	    return;
	}

	const area = await findAreaById(idLocNum);
	if (!area) {
	    showMessage(`Area con ID Località ${idLocNum} non trovata`, 'error');
	    return;
	}

	const zoneName = zoneCoordinates[area.zona]?.municipio || `Zona ${area.zona}`;

	// Show area details with clear ID Località reference
	document.getElementById('deleteAreaDetails').innerHTML = `
	    <strong>${area.nome_loc || 'Nome non specificato'}</strong><br>
	    <strong>ID Località:</strong> ${area.idLoc}<br>
	    <strong>Tipo:</strong> ${area.tipo || 'N/A'} | <strong>Zona:</strong> ${area.zona} - ${zoneName}<br>
	    <strong>Area:</strong> ${area.area || 'N/A'} | <strong>Superficie:</strong> ${area.superficie_totale || 'N/A'} mq
	`;

	currentAreaToDelete = area.idLoc;
	document.getElementById('deleteAreaInfo').style.display = 'block';
	showMessage(`Area con ID Località ${idLocNum} trovata e pronta per eliminazione`, 'success');
    });

    // Confirm delete
    document.getElementById('confirmDelete').addEventListener('click', function() {
	if (currentAreaToDelete) {
	    deleteAreaById(currentAreaToDelete);
	}
    });

    // Cancel delete
    document.getElementById('cancelDelete').addEventListener('click', function() {
	document.getElementById('deleteAreaInfo').style.display = 'none';
	document.getElementById('deleteSearch').value = '';
	currentAreaToDelete = null;
    });

    // Map controls
    document.getElementById('centerMilan').addEventListener('click', function() {
	map.setView([45.4642, 9.1900], 11);
    });
});