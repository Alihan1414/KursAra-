// YurtAraç App Logic - Defensive Version 
// Ensures the app starts even if some components (like maps or icons) fail.

// --- DATA ---
const cars = [
    { id: 1, model: "Citroen Berlingo", plate: "34 YRT 01", type: "daily", tag: "7 Kişilik • Geniş Bagaj", fuel: "%85", dist: "1.2 km", price: 8.50, coords: [41.0082, 28.9784], img: "https://www.citroen.com.tr/content/dam/citroen/turkey/b2c/models/berlingo-van/product/berlingo-van_product-hero.png" },
    { id: 2, model: "Renault Clio", plate: "34 YRT 02", type: "minute", tag: "Otomatik • Benzin", fuel: "%42", dist: "0.5 km", price: 7.20, coords: [41.0122, 28.9744], img: "https://cdn.renault.com.tr/renault-assets/vehicules/clio/clio-5/clio5-discovery/renault-clio-v-discovery-001.jpg" },
    { id: 3, model: "Fiat Egea", plate: "34 YRT 03", type: "minute", tag: "Dizel • Manuel", fuel: "%68", dist: "2.1 km", price: 6.90, coords: [41.0052, 28.9824], img: "https://auto.fiat.com.tr/content/dam/fiat/tr/modeller/egea-sedan/egea-sedan-my23/tasarim/egea-sedan-my23-tasarim-v2.png" },
    { id: 4, model: "Opel Mokka", plate: "34 YRT 04", type: "neo", tag: "Elektrikli • Premium", fuel: "%92", dist: "0.8 km", price: 10.50, coords: [41.0152, 28.9884], img: "https://www.opel.com.tr/content/dam/opel/turkey/mokka/mokka-e/product/mokka-e-product-hero.png" }
];

const pastTrips = [
    { id: 101, model: "Renault Clio", date: "12 Nisan 2026", duration: "45 dk", cost: "324.00 ₺" },
    { id: 102, model: "Fiat Egea", date: "10 Nisan 2026", duration: "1 sa 12 dk", cost: "496.80 ₺" }
];

const reservations = [
    { id: 201, model: "Citroen Berlingo", date: "15 Nisan 2026", status: "Beklemede" }
];

// --- APP STATE ---
let map = null;
let markers = [];
let activeCar = null;
let inspectionSteps = { front: false, back: false, right: false, left: false };
let tripTimer = null;
let tripData = { startTime: null, seconds: 0, distance: 0, cost: 0, speeds: [] };

// --- HELPERS ---
function safelyAddEvent(id, event, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
}

// --- MAP INIT ---
function initMap() {
    try {
        if (typeof L === 'undefined') {
            console.warn("Leaflet (L) not defined. Map will not be initialized.");
            return;
        }
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([41.0082, 28.9784], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        renderMarkers('all');
    } catch (e) {
        console.error("Map error:", e);
    }
}

function renderMarkers(filter) {
    if (!map) return;
    // Clear existing
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    cars.forEach(car => {
        if (filter !== 'all' && car.type !== filter) return;

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="pin"><i data-lucide="car"></i></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        const marker = L.marker(car.coords, { icon }).addTo(map);
        marker.on('click', () => showCarSheet(car));
        markers.push(marker);
    });
    if (window.lucide) lucide.createIcons();
}

// --- UI LOGIC ---

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');
    
    if (viewId === 'map' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    } else if (viewId === 'trips') {
        renderTrips();
    } else if (viewId === 'services') {
        renderReservations();
    }
}

function showCarSheet(car) {
    activeCar = car;
    const modelEl = document.getElementById('sheet-car-model');
    if (modelEl) modelEl.textContent = car.model;
    
    const tagEl = document.getElementById('sheet-car-tag');
    if (tagEl) tagEl.textContent = car.tag;
    
    const fuelEl = document.getElementById('sheet-car-fuel');
    if (fuelEl) fuelEl.textContent = car.fuel;
    
    const distEl = document.getElementById('sheet-car-dist');
    if (distEl) distEl.textContent = car.dist;
    
    const priceEl = document.getElementById('sheet-car-price');
    if (priceEl) priceEl.textContent = car.price.toFixed(2).replace('.', ',') + " ₺";
    
    const imgEl = document.getElementById('sheet-car-img');
    if (imgEl) imgEl.src = car.img;
    
    const sheet = document.getElementById('car-sheet');
    if (sheet) sheet.classList.add('active');
    
    if (map) map.panTo([car.coords[0] - 0.002, car.coords[1]]);
}

function initUI() {
    // Nav Items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            switchView(targetView);
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMarkers(btn.getAttribute('data-type'));
        });
    });

    // Search
    safelyAddEvent('search-input', 'keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.toLowerCase();
            const found = cars.find(c => c.model.toLowerCase().includes(query));
            if (found && map) {
                map.flyTo(found.coords, 16);
                showCarSheet(found);
            }
        }
    });

    // Radar
    safelyAddEvent('btn-radar', 'click', () => {
        if (!map) return;
        const pulse = document.createElement('div');
        pulse.className = 'radar-pulse';
        pulse.style.left = '50%';
        pulse.style.top = '50%';
        pulse.style.transform = 'translate(-50%, -50%)';
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.appendChild(pulse);
        setTimeout(() => pulse.remove(), 2000);
    });

    // Locate
    safelyAddEvent('btn-locate', 'click', () => {
        if (map) map.flyTo([41.0082, 28.9784], 15);
    });

    // Map click to close sheet
    if (map) {
        map.on('click', () => {
            const sheet = document.getElementById('car-sheet');
            if (sheet) sheet.classList.remove('active');
        });
    }

    // Rental Flow
    safelyAddEvent('btn-request-rental', 'click', () => {
        const sheet = document.getElementById('car-sheet');
        if (sheet) sheet.classList.remove('active');
        const overlay = document.getElementById('inspection-overlay');
        if (overlay) overlay.classList.remove('hidden');
    });

    // Inspection
    document.querySelectorAll('.inspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const angle = btn.getAttribute('data-angle');
            inspectionSteps[angle] = true;
            btn.classList.add('done');
            const icon = btn.querySelector('i');
            if (icon) icon.remove();
            const checkIcon = document.createElement('i');
            checkIcon.setAttribute('data-lucide', 'check-circle');
            btn.prepend(checkIcon);
            if (window.lucide) lucide.createIcons();
            
            if (Object.values(inspectionSteps).every(v => v)) {
                const startBtn = document.getElementById('btn-start-driving');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.classList.remove('disabled');
                }
            }
        });
    });

    safelyAddEvent('btn-cancel-inspection', 'click', () => {
        const overlay = document.getElementById('inspection-overlay');
        if (overlay) overlay.classList.add('hidden');
        inspectionSteps = { front: false, back: false, right: false, left: false };
        document.querySelectorAll('.inspect-btn').forEach(btn => btn.classList.remove('done'));
    });

    safelyAddEvent('btn-start-driving', 'click', () => {
        const overlay = document.getElementById('inspection-overlay');
        if (overlay) overlay.classList.add('hidden');
        const hud = document.getElementById('active-trip-hud');
        if (hud) hud.classList.remove('hidden');
        startTrip();
    });

    safelyAddEvent('btn-end-trip', 'click', () => {
        clearInterval(tripTimer);
        const hud = document.getElementById('active-trip-hud');
        if (hud) hud.classList.add('hidden');
        showSummary();
    });

    safelyAddEvent('btn-close-summary', 'click', () => {
        const modal = document.getElementById('summary-modal');
        if (modal) modal.classList.add('hidden');
        switchView('map');
    });
}

// --- RENTAL FLOW CORE ---
function startTrip() {
    if (!activeCar) return;
    tripData = { startTime: new Date(), seconds: 0, distance: 0, cost: 0, speeds: [] };
    const hudModel = document.getElementById('hud-model');
    if (hudModel) hudModel.textContent = activeCar.model;
    
    tripTimer = setInterval(() => {
        tripData.seconds++;
        const speed = Math.floor(Math.random() * 40) + 40;
        tripData.speeds.push(speed);
        tripData.distance += (speed / 3600);
        tripData.cost = (tripData.seconds / 60) * activeCar.price;
        
        const speedEl = document.getElementById('hud-speed');
        if (speedEl) speedEl.textContent = speed;
        
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) timerEl.textContent = formatTime(tripData.seconds);
        
        const distEl = document.getElementById('hud-dist');
        if (distEl) distEl.textContent = tripData.distance.toFixed(1) + " km";
        
        const costEl = document.getElementById('hud-cost');
        if (costEl) costEl.textContent = tripData.cost.toFixed(2).replace('.', ',') + " ₺";
    }, 1000);
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
}

function showSummary() {
    const avgSpeed = tripData.speeds.length > 0 ? Math.floor(tripData.speeds.reduce((a,b) => a+b, 0) / tripData.speeds.length) : 0;
    
    const timeEl = document.getElementById('sum-time');
    if (timeEl) timeEl.textContent = Math.ceil(tripData.seconds / 60) + " dk";
    
    const distEl = document.getElementById('sum-dist');
    if (distEl) distEl.textContent = tripData.distance.toFixed(1) + " km";
    
    const avgEl = document.getElementById('sum-avg');
    if (avgEl) avgEl.textContent = avgSpeed + " km/h";
    
    const costEl = document.getElementById('sum-cost');
    if (costEl) costEl.textContent = tripData.cost.toFixed(2).replace('.', ',') + " ₺";
    
    const modal = document.getElementById('summary-modal');
    if (modal) modal.classList.remove('hidden');
}

// --- RENDERING ---
function renderTrips() {
    const list = document.getElementById('trips-list');
    if (!list) return;
    list.innerHTML = '';
    pastTrips.forEach(trip => {
        list.innerHTML += `<div class="trip-card"><div class="trip-info"><h4>${trip.model}</h4><span>${trip.date} • ${trip.duration}</span></div><div class="trip-price">${trip.cost}</div></div>`;
    });
}

function renderReservations() {
    const list = document.getElementById('reservation-list');
    if (!list) return;
    if (reservations.length > 0) {
        list.innerHTML = '';
        reservations.forEach(res => {
            list.innerHTML += `<div class="trip-card"><div class="trip-info"><h4>${res.model}</h4><span>${res.date}</span></div><div class="badge">${res.status}</div></div>`;
        });
    }
}

// --- BOOTSTRAP ---
function startApp() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    
    if (app && app.classList.contains('hidden')) {
        console.log("Starting YurtAraç App...");
        if (splash) splash.style.opacity = '0';
        
        setTimeout(() => {
            if (splash) splash.style.display = 'none';
            app.classList.remove('hidden');
            
            // Now safe to init map and UI
            initMap();
            initUI();
        }, 600);
    }
}

// Ensure the app starts regardless of library loading
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    setTimeout(startApp, 2000);
});

// Hard fallback for environments where DOMContentLoaded or load might be weird
setTimeout(() => {
    console.log("Fallback startup triggered");
    startApp();
}, 4000);
