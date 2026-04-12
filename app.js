// Initialize Lucide icons
lucide.createIcons();

// Car Data
const cars = [
    {
        id: 1,
        model: "Citroen Berlingo",
        tag: "7 Kişilik • Geniş Bagaj",
        fuel: "%85",
        dist: "1.2 km",
        price: "8,50 ₺",
        coords: [41.0082, 28.9784],
        img: "https://www.citroen.com.tr/content/dam/citroen/turkey/b2c/models/berlingo-van/product/berlingo-van_product-hero.png" // Mock URL
    },
    {
        id: 2,
        model: "Renault Clio",
        tag: "Otomatik • Benzin",
        fuel: "%42",
        dist: "0.5 km",
        price: "7,20 ₺",
        coords: [41.0122, 28.9744],
        img: "https://www.renault.com.tr/content/dam/Renault/TR/personal-cars/clio/clio-5/clio5-discovery/renault-clio-v-discovery-001.jpg"
    },
    {
        id: 3,
        model: "Fiat Egea",
        tag: "Dizel • Manuel",
        fuel: "%68",
        dist: "2.1 km",
        price: "6,90 ₺",
        coords: [41.0052, 28.9824],
        img: "https://auto.fiat.com.tr/content/dam/fiat/tr/modeller/egea-sedan/egea-sedan-my23/tasarim/egea-sedan-my23-tasarim-v2.png"
    },
    {
        id: 4,
        model: "Opel Mokka",
        tag: "Elektrikli • Premium",
        fuel: "%92",
        dist: "0.8 km",
        price: "10,50 ₺",
        coords: [41.0152, 28.9884],
        img: "https://www.opel.com.tr/content/dam/opel/turkey/mokka/mokka-e/product/mokka-e-product-hero.png"
    }
];

// App State
let activeCar = null;

// Initialize Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([41.0082, 28.9784], 14);

// Use a clean map style (Voyager)
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
}).addTo(map);

// Custom Marker Helper
function createCustomMarker(car) {
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="pin" id="marker-${car.id}">
                <i data-lucide="car"></i>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });

    const marker = L.marker(car.coords, { icon }).addTo(map);
    
    marker.on('click', () => {
        showCarDetails(car);
    });

    return marker;
}

// Render Cars
cars.forEach(car => createCustomMarker(car));
lucide.createIcons(); // Re-render icons for dynamic markers

// Splash Screen Logic
window.addEventListener('load', () => {
    // Initial map size check
    setTimeout(() => { map.invalidateSize(); }, 100);

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app');
        
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.classList.remove('hidden');
            app.style.opacity = '1';
            
            // Critical for Leaflet: invalidate size after the container becomes visible
            setTimeout(() => {
                map.invalidateSize();
                console.log("Map size invalidated");
            }, 300);
        }, 800);
    }, 2500);
});

// UI Interaction Handlers
const sheet = document.getElementById('bottom-sheet');
const overlay = document.querySelector('.bottom-nav');

function showCarDetails(car) {
    activeCar = car;
    
    document.getElementById('car-model').textContent = car.model;
    document.getElementById('car-tag').textContent = car.tag;
    document.getElementById('car-fuel').textContent = car.fuel;
    document.getElementById('car-dist').textContent = car.dist;
    document.getElementById('car-price').textContent = car.price;
    document.getElementById('car-img').src = car.img;
    
    sheet.classList.add('active');
    overlay.style.transform = 'translateY(100%)';
    overlay.style.opacity = '0';
    
    // Center map on car
    map.panTo(car.coords);
}

// Close sheet on map click
map.on('click', () => {
    sheet.classList.remove('active');
    overlay.style.transform = 'translateY(0)';
    overlay.style.opacity = '1';
});

// Rental Flow
document.getElementById('start-rent').addEventListener('click', () => {
    document.getElementById('rental-modal').classList.remove('hidden');
});

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('rental-modal').classList.add('hidden');
    sheet.classList.remove('active');
    overlay.style.transform = 'translateY(0)';
    overlay.style.opacity = '1';
});

// Filter Buttons
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Locate Button
document.getElementById('btn-locate').addEventListener('click', () => {
    map.setView([41.0082, 28.9784], 15);
});

// Navigation items
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});
