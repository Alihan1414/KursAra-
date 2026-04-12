// Initialize Lucide Icons
if (window.lucide) {
    lucide.createIcons();
}

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

// --- MAP INIT ---
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([41.0082, 28.9784], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    renderMarkers('all');
}

function renderMarkers(filter) {
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
    lucide.createIcons();
}

// --- VIEW MANAGEMENT ---
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.app-view');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        switchView(targetView);
        
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    if (viewId === 'map') {
        setTimeout(() => map.invalidateSize(), 100);
    } else if (viewId === 'trips') {
        renderTrips();
    } else if (viewId === 'services') {
        renderReservations();
    }
}

// --- UI INTERACTIONS ---

// Search
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value.toLowerCase();
        const found = cars.find(c => c.model.toLowerCase().includes(query));
        if (found) {
            map.flyTo(found.coords, 16);
            showCarSheet(found);
        }
    }
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMarkers(btn.getAttribute('data-type'));
    });
});

// Sheet Logic
const carSheet = document.getElementById('car-sheet');
function showCarSheet(car) {
    activeCar = car;
    document.getElementById('sheet-car-model').textContent = car.model;
    document.getElementById('sheet-car-tag').textContent = car.tag;
    document.getElementById('sheet-car-fuel').textContent = car.fuel;
    document.getElementById('sheet-car-dist').textContent = car.dist;
    document.getElementById('sheet-car-price').textContent = car.price.toFixed(2).replace('.', ',') + " ₺";
    document.getElementById('sheet-car-img').src = car.img;
    
    carSheet.classList.add('active');
    map.panTo([car.coords[0] - 0.002, car.coords[1]]); // Offset for sheet
}

map.on('click', () => carSheet.classList.remove('active'));

// Radar
document.getElementById('btn-radar').addEventListener('click', () => {
    const center = map.getCenter();
    const pulse = document.createElement('div');
    pulse.className = 'radar-pulse';
    pulse.style.left = '50%';
    pulse.style.top = '50%';
    pulse.style.transform = 'translate(-50%, -50%)';
    document.getElementById('map').appendChild(pulse);
    
    setTimeout(() => pulse.remove(), 2000);
});

// Locate
document.getElementById('btn-locate').addEventListener('click', () => {
    map.flyTo([41.0082, 28.9784], 15);
});

// --- RENTAL FLOW ---

// 1. Request Rental
document.getElementById('btn-request-rental').addEventListener('click', () => {
    carSheet.classList.remove('active');
    document.getElementById('inspection-overlay').classList.remove('hidden');
});

// 2. Inspection
const inspectButtons = document.querySelectorAll('.inspect-btn');
const startDrivingBtn = document.getElementById('btn-start-driving');

inspectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const angle = btn.getAttribute('data-angle');
        inspectionSteps[angle] = true;
        btn.classList.add('done');
        btn.querySelector('i').remove();
        const checkIcon = document.createElement('i');
        checkIcon.setAttribute('data-lucide', 'check-circle');
        btn.prepend(checkIcon);
        lucide.createIcons();
        
        if (Object.values(inspectionSteps).every(v => v)) {
            startDrivingBtn.disabled = false;
            startDrivingBtn.classList.remove('disabled');
        }
    });
});

document.getElementById('btn-cancel-inspection').addEventListener('click', () => {
    document.getElementById('inspection-overlay').classList.add('hidden');
    // Reset steps
    inspectionSteps = { front: false, back: false, right: false, left: false };
    inspectButtons.forEach(btn => btn.classList.remove('done'));
});

// 3. Start Driving
startDrivingBtn.addEventListener('click', () => {
    document.getElementById('inspection-overlay').classList.add('hidden');
    document.getElementById('active-trip-hud').classList.remove('hidden');
    startTrip();
});

function startTrip() {
    tripData = { startTime: new Date(), seconds: 0, distance: 0, cost: 0, speeds: [] };
    document.getElementById('hud-model').textContent = activeCar.model;
    
    tripTimer = setInterval(() => {
        tripData.seconds++;
        
        // Simulating speed and distance
        const speed = Math.floor(Math.random() * 40) + 40; // 40-80 km/h
        tripData.speeds.push(speed);
        tripData.distance += (speed / 3600); // dist per second
        tripData.cost = (tripData.seconds / 60) * activeCar.price;
        
        // Update HUD
        document.getElementById('hud-speed').textContent = speed;
        document.getElementById('hud-timer').textContent = formatTime(tripData.seconds);
        document.getElementById('hud-dist').textContent = tripData.distance.toFixed(1) + " km";
        document.getElementById('hud-cost').textContent = tripData.cost.toFixed(2).replace('.', ',') + " ₺";
    }, 1000);
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
}

// 4. End Trip
document.getElementById('btn-end-trip').addEventListener('click', () => {
    clearInterval(tripTimer);
    document.getElementById('active-trip-hud').classList.add('hidden');
    showSummary();
});

function showSummary() {
    const avgSpeed = Math.floor(tripData.speeds.reduce((a,b) => a+b, 0) / tripData.speeds.length);
    document.getElementById('sum-time').textContent = Math.ceil(tripData.seconds / 60) + " dk";
    document.getElementById('sum-dist').textContent = tripData.distance.toFixed(1) + " km";
    document.getElementById('sum-avg').textContent = avgSpeed + " km/h";
    document.getElementById('sum-cost').textContent = tripData.cost.toFixed(2).replace('.', ',') + " ₺";
    
    document.getElementById('summary-modal').classList.remove('hidden');
}

document.getElementById('btn-close-summary').addEventListener('click', () => {
    document.getElementById('summary-modal').classList.add('hidden');
    switchView('map');
});

// --- LIST RENDERERS ---

function renderTrips() {
    const list = document.getElementById('trips-list');
    list.innerHTML = '';
    pastTrips.forEach(trip => {
        list.innerHTML += `
            <div class="trip-card">
                <div class="trip-info">
                    <h4>${trip.model}</h4>
                    <span>${trip.date} • ${trip.duration}</span>
                </div>
                <div class="trip-price">${trip.cost}</div>
            </div>
        `;
    });
}

function renderReservations() {
    const list = document.getElementById('reservation-list');
    if (reservations.length > 0) {
        list.innerHTML = '';
        reservations.forEach(res => {
            list.innerHTML += `
                <div class="trip-card">
                    <div class="trip-info">
                        <h4>${res.model}</h4>
                        <span>${res.date}</span>
                    </div>
                    <div class="badge">${res.status}</div>
                </div>
            `;
        });
    }
}

// --- BOOTSTRAP ---
function startApp() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    
    if (app && app.classList.contains('hidden')) {
        console.log("Starting YurtAraç App...");
        splash.style.opacity = '0';
        
        setTimeout(() => {
            splash.style.display = 'none';
            app.classList.remove('hidden');
            
            try {
                initMap();
            } catch (err) {
                console.error("Map initialization failed, but app is starting.", err);
            }
        }, 600);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Basic initialization that shouldn't crash
    if (window.lucide) lucide.createIcons();
    
    // Auto-start after delay
    setTimeout(startApp, 2500);
});

// Hard fallback
setTimeout(startApp, 5000);
