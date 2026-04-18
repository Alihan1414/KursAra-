// YurtAraç Institutional Management System - V2 Core Logic
// Integrated with Firebase Realtime Database (TopClean DB)

// ---------- FIREBASE CONFIGURATION ----------
const firebaseConfig = {
    apiKey: "AIzaSyCO88ONQpL3vFRMSY-jyhRImbsNC1ngcmQ",
    authDomain: "topclean-ce4e6.firebaseapp.com",
    databaseURL: "https://topclean-ce4e6-default-rtdb.firebaseio.com",
    projectId: "topclean-ce4e6",
    storageBucket: "topclean-ce4e6.firebaseastorage.app",
    messagingSenderId: "413118182506",
    appId: "1:413118182506:web:4e1897da948b8348030613"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("Firebase connected successfully.");
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// ---------- APP STATE ----------
let state = {
    kurum: null,
    user: null,
    role: null,
    vehicles: {},
    activeTrip: null,
    activeRequest: null,
    camera: {
        stream: null,
        steps: ['Ön Sol', 'Arka Sağ', 'Sol Yan', 'Sağ Yan', 'İç Ön', 'İç Arka'],
        currentStep: 0,
        photos: []
    },
    drive: {
        timer: null,
        startTime: null,
        startPos: null,
        distance: 0,
        lastPos: null
    },
    maps: {
        personnel: null,
        adminLive: null,
        markers: {}
    }
};

// ---------- UI HELPERS ----------
function showGate(id) {
    document.querySelectorAll('.gate-view').forEach(g => g.classList.remove('active'));
    document.getElementById(`gate-${id}`).classList.add('active');
}

function showPanel(id) {
    const panels = document.getElementById('panel-container');
    panels.classList.remove('hidden');
    document.querySelectorAll('.role-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`panel-${id}`).classList.remove('hidden');
}

// ---------- BOOTSTRAP ----------
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
        }
        document.getElementById('app').classList.remove('hidden');
        checkStoredSession();
    }, 1500);

    initEventListeners();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

function checkStoredSession() {
    const saved = localStorage.getItem('yurtarac_session');
    if (saved) {
        const session = JSON.parse(saved);
        state.kurum = session.kurum;
        state.user = session.user;
        state.role = session.role;
        startInstitutionalSession();
    } else {
        showGate('institution');
    }
}

// ---------- EVENT LISTENERS ----------
function initEventListeners() {
    document.getElementById('btn-enter-institution').addEventListener('click', handleInstitutionEntry);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const role = btn.getAttribute('data-role');
            document.querySelectorAll('.login-form-container').forEach(f => f.classList.remove('active'));
            document.getElementById(`login-${role}`).classList.add('active');
        });
    });

    document.getElementById('btn-login-admin').addEventListener('click', handleAdminLogin);
    document.getElementById('btn-login-personnel').addEventListener('click', handlePersonnelLogin);
    document.getElementById('btn-back-to-institution').addEventListener('click', () => {
        state.kurum = null;
        showGate('institution');
    });

    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });

    document.getElementById('btn-capture').addEventListener('click', capturePhoto);
    document.getElementById('btn-cancel-camera').addEventListener('click', stopCamera);
    document.getElementById('btn-action-main').addEventListener('click', () => startRequestFlow());
    document.getElementById('btn-finish-drive').addEventListener('click', handleFinishDriveRequest);

    // Nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const view = item.getAttribute('data-pview');
            // Simplified: only main map is functional in this V2
        });
    });
}

// ---------- INSTITUTION LOGIC ----------
async function handleInstitutionEntry() {
    const code = document.getElementById('institution-code').value.trim().toUpperCase();
    if (!code) return Swal.fire('Hata', 'Lütfen bir kurum kodu girin.', 'error');

    state.kurum = code;
    document.getElementById('display-institution-name').textContent = code;

    const snapshot = await db.ref(`institutions/${code}/config`).once('value');
    const config = snapshot.val();

    if (!config) {
        document.getElementById('admin-note').innerHTML = "<span class='text-warning'>Bu kurum henüz kayıtlı değil.</span> İlk girişte belirlediğiniz şifre İdareci şifresi olacaktır.";
        loadPersonnelList(null); // Clear list
    } else {
        document.getElementById('admin-note').textContent = "Lütfen idareci şifresini girin.";
        loadPersonnelList(config.personnel);
    }
    showGate('login');
}

function loadPersonnelList(personnelObj) {
    const select = document.getElementById('personnel-select');
    if (!select) return;
    select.innerHTML = '<option value="">Lütfen İsminizi Seçin</option>';
    if (personnelObj && typeof personnelObj === 'object') {
        Object.values(personnelObj).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = "(Personel Listesi Boş)";
        select.appendChild(opt);
    }
}

// ---------- AUTH LOGIC ----------
async function handleAdminLogin() {
    const pass = document.getElementById('admin-password').value.trim();
    if (!pass) return;

    const ref = db.ref(`institutions/${state.kurum}/config`);
    const snap = await ref.once('value');
    const config = snap.val();

    if (!config) {
        await ref.set({ adminPass: pass, created: new Date().toISOString() });
    } else {
        if (config.adminPass !== pass) return Swal.fire('Hata', 'Şifre Geçersiz!', 'error');
    }

    state.user = { name: "Yönetici", id: "admin" };
    state.role = 'admin';
    startInstitutionalSession();
}

async function handlePersonnelLogin() {
    const id = document.getElementById('personnel-select').value;
    const pin = document.getElementById('personnel-pin').value;
    
    if (!id) return Swal.fire('Hata', 'Lütfen listeden isminizi seçin.', 'warning');
    if (!pin) return Swal.fire('Hata', 'PIN kodunuzu girin.', 'warning');

    const snap = await db.ref(`institutions/${state.kurum}/config/personnel/${id}`).once('value');
    const pData = snap.val();

    if (!pData || pData.pin !== pin) return Swal.fire('Hata', 'PIN kodu hatalı!', 'error');

    state.user = pData;
    state.role = 'personnel';
    startInstitutionalSession();
}

function startInstitutionalSession() {
    localStorage.setItem('yurtarac_session', JSON.stringify({
        kurum: state.kurum,
        user: state.user,
        role: state.role
    }));

    if (state.role === 'admin') {
        showPanel('admin');
        initAdminDashboard();
    } else {
        showPanel('personnel');
        initPersonnelDashboard();
    }
}

function handleLogout() {
    localStorage.removeItem('yurtarac_session');
    location.reload();
}

// ---------- PERSONNEL DASHBOARD ----------
function initPersonnelDashboard() {
    document.getElementById('user-display-name').textContent = state.user.name;
    initPersonnelMap();
    listenToMyStatus();
}

function initPersonnelMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    state.maps.personnel = L.map('map', { zoomControl: false, attributionControl: false }).setView([41.0082, 28.9784], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(state.maps.personnel);

    // Watch Vehicles
    db.ref(`institutions/${state.kurum}/config/vehicles`).on('value', snap => {
        const vehs = snap.val() || {};
        state.vehicles = vehs;
        renderVehicleMarkers(vehs);
    });
}

function renderVehicleMarkers(vehs) {
    // Clear old markers if any
    Object.values(state.maps.markers).forEach(m => m.remove());
    state.maps.markers = {};

    Object.keys(vehs).forEach(id => {
        const v = vehs[id];
        const icon = L.divIcon({
            className: 'veh-marker',
            html: `<div class="pin shadow-lg ${v.onRide ? 'bg-danger' : ''}"><i data-lucide="car"></i></div>`,
            iconSize: [44, 44]
        });

        const m = L.marker([v.lat || 41.0082, v.lng || 28.9784], { icon }).addTo(state.maps.personnel);
        m.on('click', () => {
            if (v.onRide) return Swal.fire('Dolu', 'Bu araç şu an kullanımda.', 'warning');
            selectVehicle(id, v);
        });
        state.maps.markers[id] = m;
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectVehicle(id, v) {
    Swal.fire({
        title: v.model,
        text: `${v.plate} - Bu aracı talep etmek istiyor musunuz?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet, Talep Et',
        cancelButtonText: 'Vazgeç',
        background: 'var(--bg-main)',
        color: 'white'
    }).then(res => {
        if (res.isConfirmed) startRequestFlow(v);
    });
}

async function startRequestFlow(vehicle = null) {
    const { value: purpose } = await Swal.fire({
        title: 'Gidiş Amacı',
        input: 'text',
        inputPlaceholder: 'Nereye / Ne için?',
        showCancelButton: true,
        confirmButtonText: 'Fotoğraflara Geç',
        background: 'var(--bg-main)',
        color: 'white'
    });

    if (purpose) {
        state.activeRequest = { 
            vehicle: vehicle || { model: 'Araç', plate: 'Belirtilmedi' }, 
            purpose 
        };
        startCameraSequence();
    }
}

// ---------- CAMERA SYSTEM ----------
function startCameraSequence() {
    state.camera.currentStep = 0;
    state.camera.photos = [];
    document.getElementById('camera-overlay').classList.remove('hidden');
    updateCameraUI();
    startCamera();
}

async function startCamera() {
    try {
        state.camera.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: 1280, height: 720 } 
        });
        document.getElementById('camera-video').srcObject = state.camera.stream;
    } catch (e) {
        Swal.fire('Kamera Hatası', 'Erişim verilmedi.', 'error');
        stopCamera();
    }
}

function stopCamera() {
    if (state.camera.stream) state.camera.stream.getTracks().forEach(t => t.stop());
    document.getElementById('camera-overlay').classList.add('hidden');
}

function updateCameraUI() {
    document.getElementById('camera-step-title').textContent = state.camera.steps[state.camera.currentStep];
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const data = canvas.toDataURL('image/jpeg', 0.6);
    state.camera.photos.push(data);
    
    state.camera.currentStep++;
    if (state.camera.currentStep < state.camera.steps.length) {
        updateCameraUI();
    } else {
        finishCamera();
    }
}

function finishCamera() {
    stopCamera();
    submitRequest();
}

async function submitRequest() {
    const ref = db.ref(`institutions/${state.kurum}/requests`).push();
    await ref.set({
        userId: state.user.id,
        userName: state.user.name,
        vehiclePlate: state.activeRequest.vehicle.plate,
        vehicleModel: state.activeRequest.vehicle.model,
        purpose: state.activeRequest.purpose,
        photos: state.camera.photos,
        status: 'pending',
        timestamp: new Date().toISOString()
    });
    Swal.fire('Talep Gönderildi', 'İdareci onayladığında sürüş başlayacak.', 'success');
}

// ---------- DRIVE LOGIC ----------
function listenToMyStatus() {
    db.ref(`institutions/${state.kurum}/requests`).on('value', snap => {
        const reqs = snap.val();
        if (!reqs) return;
        
        const myActive = Object.values(reqs).find(r => r.userId === state.user.id && (r.status === 'pending' || r.status === 'approved'));
        
        if (myActive) {
            if (myActive.status === 'pending') {
                document.getElementById('req-pending-card').classList.remove('hidden');
                document.getElementById('btn-action-main').classList.add('hidden');
            } else if (myActive.status === 'approved') {
                document.getElementById('req-pending-card').classList.add('hidden');
                startDriveSession(myActive);
            }
        } else {
            document.getElementById('req-pending-card').classList.add('hidden');
            document.getElementById('btn-action-main').classList.remove('hidden');
        }
    });
}

function startDriveSession(req) {
    if (state.activeTrip) return;
    state.activeTrip = req;
    
    const panel = document.getElementById('driving-panel');
    panel.classList.remove('hidden');
    document.getElementById('drive-veh-name').textContent = req.vehiclePlate;
    
    state.drive.startTime = new Date();
    state.drive.timer = setInterval(updateDriveUI, 1000);
    
    startLiveTracking();
}

function startLiveTracking() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(pos => {
            const { latitude, longitude, speed } = pos.coords;
            const kmh = speed ? Math.round(speed * 3.6) : 0;
            document.getElementById('current-speed').textContent = kmh;
            
            // Sync to Firebase
            db.ref(`institutions/${state.kurum}/trips/${state.user.id}`).set({
                userName: state.user.name,
                plate: state.activeTrip.vehiclePlate,
                lat: latitude,
                lng: longitude,
                speed: kmh,
                active: true,
                lastUpdate: new Date().toISOString()
            });
        }, null, { enableHighAccuracy: true });
    }
}

function updateDriveUI() {
    const diff = Math.floor((new Date() - state.drive.startTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    document.getElementById('drive-time').textContent = `${m}:${s}`;
}

async function handleFinishDriveRequest() {
    const res = await Swal.fire({
        title: 'Sürüşü Bitir',
        text: 'Aracı teslim etmek için son kontrolleri ve fotoğrafları çekeceğiz.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Teslime Başla',
        background: 'var(--bg-main)',
        color: 'white'
    });

    if (res.isConfirmed) {
        // Mocking end photos flow for speed in V2
        clearInterval(state.drive.timer);
        await db.ref(`institutions/${state.kurum}/trips/${state.user.id}`).remove();
        await db.ref(`institutions/${state.kurum}/requests`).orderByChild('userId').equalTo(state.user.id).once('value', snap => {
            const data = snap.val();
            if (data) {
                Object.keys(data).forEach(k => {
                    if (data[k].status === 'approved') db.ref(`institutions/${state.kurum}/requests/${k}`).update({ status: 'completed' });
                });
            }
        });
        
        state.activeTrip = null;
        document.getElementById('driving-panel').classList.add('hidden');
        Swal.fire('Teslim Edildi', 'Harika bir sürüş! Teşekkürler.', 'success');
    }
}

// ---------- ADMIN DASHBOARD ----------
function initAdminDashboard() {
    loadAdminStats();
    loadAdminView('approvals');
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadAdminView(btn.getAttribute('data-aview'));
        });
    });

    // Real-time Approval Counter
    db.ref(`institutions/${state.kurum}/requests`).on('value', snap => {
        const reqs = snap.val() || {};
        const pending = Object.values(reqs).filter(r => r.status === 'pending').length;
        const badge = document.getElementById('approval-count');
        badge.textContent = pending;
        badge.classList.toggle('hidden', pending === 0);
        document.getElementById('stat-pending-reqs').textContent = pending;
        if (document.querySelector('.menu-btn[data-aview="approvals"]').classList.contains('active')) renderApprovals(reqs);
    });
}

function loadAdminStats() {
    db.ref(`institutions/${state.kurum}/trips`).on('value', snap => {
        const trips = snap.val() || {};
        const count = Object.values(trips).filter(t => t.active).length;
        document.getElementById('stat-active-trips').textContent = count;
    });
}

function loadAdminView(view) {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<div class="p-4 text-center text-muted">Yükleniyor...</div>`;

    if (view === 'approvals') {
        db.ref(`institutions/${state.kurum}/requests`).once('value', snap => renderApprovals(snap.val()));
    } else if (view === 'live-fleet') {
        renderLiveFleet();
    } else if (view === 'vehicles') {
        renderVehicleManager();
    } else if (view === 'personnel') {
        renderPersonnelManager();
    }
}

function renderApprovals(reqs) {
    const container = document.getElementById('admin-content');
    if (!reqs) return container.innerHTML = '<div class="empty-state">Talep bulunmuyor.</div>';

    const html = Object.keys(reqs).map(id => {
        const r = reqs[id];
        if (r.status !== 'pending') return '';
        return `
            <div class="approval-card p-3 mb-3 rounded-4 animate-in">
                <div class="d-flex justify-content-between mb-3">
                    <div class="fw-bold text-emerald">${r.userName}</div>
                    <div class="x-small text-muted">${new Date(r.timestamp).toLocaleTimeString()}</div>
                </div>
                <div class="mb-3">
                    <div class="small fw-bold">${r.vehicleModel} (${r.vehiclePlate})</div>
                    <div class="x-small text-muted">Amacı: ${r.purpose}</div>
                </div>
                <div class="req-photos mb-3">
                    ${r.photos.map(p => `<img src="${p}" onclick="zoomImage('${p}')">`).join('')}
                </div>
                <div class="d-flex gap-2">
                    <button class="approve-btn btn text-white flex-grow-1 py-1 rounded-3" onclick="processRequest('${id}', 'approved')">ONAYLA</button>
                    <button class="reject-btn btn flex-grow-1 py-1 rounded-3" onclick="processRequest('${id}', 'rejected')">REDDET</button>
                </div>
            </div>
        `;
    }).join('');
    container.innerHTML = html || '<div class="empty-state">Bekleyen onay yok.</div>';
}

function renderLiveFleet() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<div id="admin-map" style="height: 400px; border-radius: 24px; overflow: hidden;"></div><div id="active-list" class="mt-4"></div>`;
    
    setTimeout(() => {
        const amap = L.map('admin-map', { zoomControl: false }).setView([41.0082, 28.9784], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(amap);
        
        db.ref(`institutions/${state.kurum}/trips`).on('value', snap => {
            const trips = snap.val() || {};
            const listEl = document.getElementById('active-list');
            listEl.innerHTML = '';
            
            Object.values(trips).forEach(t => {
                const icon = L.divIcon({
                    className: 'veh-marker',
                    html: `<div class="pin bg-danger"><i data-lucide="car"></i></div>`,
                    iconSize: [40, 40]
                });
                L.marker([t.lat, t.lng], { icon }).addTo(amap).bindPopup(`${t.userName} - ${t.speed} KM/H`);
                
                listEl.innerHTML += `
                    <div class="list-item rounded-4 p-3 animate-in">
                        <div>
                            <div class="fw-bold text-emerald">${t.userName}</div>
                            <div class="x-small text-muted">${t.plate}</div>
                        </div>
                        <div class="text-end">
                            <div class="fw-black fs-5">${t.speed}</div>
                            <div class="x-small text-muted">KM/H</div>
                        </div>
                    </div>
                `;
            });
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }, 100);
}

// Reuse Personnel/Vehicle managers from V1 logic but with V2 styling...
async function renderVehicleManager() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<div class="manager-card animate-in">
        <h4>Yeni Araç</h4>
        <div class="d-flex flex-column gap-2">
            <input type="text" id="v-model" placeholder="Model">
            <input type="text" id="v-plate" placeholder="Plaka">
            <button class="primary-btn py-2" onclick="addVehicle()">KAYDET</button>
        </div>
    </div><div id="v-list" class="mt-4"></div>`;
    const snap = await db.ref(`institutions/${state.kurum}/config/vehicles`).once('value');
    const vehs = snap.val() || {};
    document.getElementById('v-list').innerHTML = Object.values(vehs).map(v => `<div class="list-item rounded-4"><strong>${v.model}</strong><span>${v.plate}</span></div>`).join('');
}

window.addVehicle = async () => {
    const model = document.getElementById('v-model').value;
    const plate = document.getElementById('v-plate').value;
    if (!model || !plate) return;
    await db.ref(`institutions/${state.kurum}/config/vehicles`).push({ model, plate, onRide: false });
    loadAdminView('vehicles');
}

async function renderPersonnelManager() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<div class="manager-card animate-in">
        <h4>Yeni Personel</h4>
        <div class="d-flex flex-column gap-2">
            <input type="text" id="p-name" placeholder="Ad Soyad">
            <input type="text" id="p-pin" placeholder="PIN" maxlength="4">
            <button class="primary-btn py-2" onclick="addPersonnel()">EKLE</button>
        </div>
    </div><div id="p-list" class="mt-4"></div>`;
    const snap = await db.ref(`institutions/${state.kurum}/config/personnel`).once('value');
    const pers = snap.val() || {};
    document.getElementById('p-list').innerHTML = Object.values(pers).map(p => `<div class="list-item rounded-4"><strong>${p.name}</strong><span>${p.pin}</span></div>`).join('');
}

window.addPersonnel = async () => {
    const name = document.getElementById('p-name').value;
    const pin = document.getElementById('p-pin').value;
    if (!name || !pin) return;
    const ref = db.ref(`institutions/${state.kurum}/config/personnel`).push();
    await ref.set({ id: ref.key, name, pin });
    loadAdminView('personnel');
}

window.processRequest = async (id, status) => {
    await db.ref(`institutions/${state.kurum}/requests/${id}`).update({ status });
}

window.zoomImage = (src) => Swal.fire({ imageUrl: src, imageWidth: '100%', showConfirmButton: false, background: '#000' });
