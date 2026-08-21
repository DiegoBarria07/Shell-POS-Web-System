let db = JSON.parse(localStorage.getItem('shellData')) || {
    workers: [], 
    deposits: {}, 
    history: []   
};

function saveDB() { localStorage.setItem('shellData', JSON.stringify(db)); }

// --- NAVEGACIÓN ---
function navTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    if(viewId === 'view-deposit' || viewId === 'view-cuadratura' || viewId === 'view-admin-delete') {
        updateWorkerSelects();
        if(db.workers.length === 0 && viewId !== 'view-admin-delete') {
            alert("No hay trabajadores creados. Vaya a 'Administrar' para crear uno.");
            navTo('view-menu');
        }
    }
    if(viewId === 'view-cuadratura') {
        checkCurrentDeposit();
        calculateCuadratura(); // Reactividad inicial
    }
    if(viewId === 'view-login') {
        const passInput = document.getElementById('admin-pass');
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
    }
    if(viewId === 'view-admin-history') renderHistory();
}

// --- TEMA CLARO/OSCURO ---
const themeToggleBtn = document.getElementById('theme-toggle');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcons(currentTheme);

themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcons(currentTheme);
});

function updateThemeIcons(theme) {
    iconSun.style.display = theme === 'dark' ? 'block' : 'none';
    iconMoon.style.display = theme === 'dark' ? 'none' : 'block';
}

// --- NAVEGACIÓN POR TECLADO Y ENTER ---
document.getElementById('admin-pass').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') checkAdmin();
});

// Flechas en los inputs de depósito
const depInputs = document.querySelectorAll('#deposit-grid input');
depInputs.forEach((input, index) => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (index < depInputs.length - 1) depInputs[index + 1].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (index > 0) depInputs[index - 1].focus();
        }
    });
});

// --- LÓGICA DE TRABAJADORES ---
function updateWorkerSelects() {
    const selects = document.querySelectorAll('.worker-select');
    const sortedWorkers = [...db.workers].sort((a, b) => a.localeCompare(b));
    
    selects.forEach(select => {
        const isFilter = select.id === 'filter-worker';
        select.innerHTML = isFilter ? '<option value="ALL">Todos</option>' : '';
        sortedWorkers.forEach(w => select.innerHTML += `<option value="${w}">${w}</option>`);
    });
}

function getVal(id) {
    let val = document.getElementById(id).value;
    return val === "" ? 0 : parseInt(val);
}

// --- DEPÓSITOS ---
function calcDeposit() {
    let total = 
        getVal('b20000') * 20000 + getVal('b10000') * 10000 +
        getVal('b5000') * 5000 + getVal('b2000') * 2000 +
        getVal('b1000') * 1000 + getVal('b500') * 500 +
        getVal('b100') * 100 + getVal('b50') * 50 + getVal('b10') * 10;
    
    document.getElementById('dep-total').innerText = total.toLocaleString('es-CL');
    return total;
}

function saveDeposit() {
    const worker = document.getElementById('dep-worker').value;
    const amount = calcDeposit();
    if(!worker || amount === 0) return;

    db.deposits[worker] = (db.deposits[worker] || 0) + amount;
    saveDB();
    
    document.querySelectorAll('.den-item input').forEach(inp => inp.value = '');
    document.getElementById('dep-total').innerText = '0';
    navTo('view-menu');
}

// --- CUADRATURA (Reactiva) ---
let tempCuadratura = null;

function checkCurrentDeposit() {
    const worker = document.getElementById('cuad-worker').value;
    const dep = db.deposits[worker] || 0;
    document.getElementById('cuad-deposito-actual').innerText = dep.toLocaleString('es-CL');
    calculateCuadratura();
}

function calculateCuadratura() {
    const worker = document.getElementById('cuad-worker').value;
    if(!worker) return;

    const currentDeposit = db.deposits[worker] || 0;
    const ventas = getVal('c-ventas');
    const totalIngresado = currentDeposit + getVal('c-transbank') + getVal('c-shellcard') + getVal('c-app') + getVal('c-transf');
    const diferencia = totalIngresado - ventas;

    const resBox = document.getElementById('cuad-resultado');
    const resText = document.getElementById('res-texto');
    const btnAceptar = document.getElementById('btn-aceptar-cuad');
    
    resBox.classList.remove('hidden');

    const fechaActual = new Date().toLocaleDateString('es-CL'); // 21-08-2026

    tempCuadratura = {
        date: fechaActual,
        worker: worker,
        turno: document.getElementById('cuad-turno').value,
        ventas: ventas,
        ingresado: totalIngresado,
        diferencia: diferencia
    };

    resBox.style.backgroundColor = "var(--bg-card)";
    if (ventas === 0 && totalIngresado === 0) {
        resText.innerHTML = `Ingrese los valores del turno.`;
        resBox.style.border = "1px solid var(--border)";
        btnAceptar.classList.add('hidden');
    } else {
        btnAceptar.classList.remove('hidden');
        if(diferencia > 0) {
            resText.innerHTML = `SOBRA DINERO: +$${diferencia.toLocaleString('es-CL')}`;
            resBox.style.border = "3px solid #2196F3";
            resText.style.color = "#2196F3";
        } else if (diferencia < 0) {
            resText.innerHTML = `FALTA DINERO: $${diferencia.toLocaleString('es-CL')}`;
            resBox.style.border = "3px solid var(--shell-red)";
            resText.style.color = "var(--shell-red)";
        } else {
            resText.innerHTML = `CUADRADO PERFECTAMENTE ($0)`;
            resBox.style.border = "3px solid #4CAF50";
            resText.style.color = "#4CAF50";
        }
    }
}

function acceptCuadratura() {
    if(!tempCuadratura) return;
    db.history.unshift(tempCuadratura); // Añade primero
    db.deposits[tempCuadratura.worker] = 0; // Reinicia depósito
    saveDB();

    document.querySelectorAll('.cuadratura-inputs input').forEach(inp => inp.value = '');
    document.getElementById('cuad-resultado').classList.add('hidden');
    tempCuadratura = null;
    navTo('view-menu');
}

// --- ADMINISTRADOR ---
function checkAdmin() {
    if(document.getElementById('admin-pass').value === 'Shell2026') {
        navTo('view-admin-menu');
    } else {
        alert("Contraseña incorrecta.");
    }
}

function addWorker() {
    const nameInput = document.getElementById('new-worker-name');
    let name = nameInput.value.trim().toUpperCase();
    
    if(name === "") return;
    if(db.workers.includes(name)) {
        alert("El trabajador ya existe.");
        return;
    }

    db.workers.push(name);
    db.deposits[name] = 0;
    saveDB();
    nameInput.value = '';
    alert("Trabajador agregado correctamente.");
    navTo('view-admin-menu');
}

// Validador de RUT Chileno
function validarRUT(rutCompleto) {
    if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rutCompleto)) return false;
    let tmp = rutCompleto.split('-');
    let digv = tmp[1].toLowerCase();
    let rut = tmp[0];
    let M=0, S=1;
    for(;rut;rut=Math.floor(rut/10)) S=(S+rut%10*(9-M++%6))%11;
    return (S?S-1:'k') == digv;
}

function removeWorker() {
    const worker = document.getElementById('delete-worker-select').value;
    const rut = document.getElementById('delete-rut').value.trim();
    const pass = document.getElementById('delete-pass').value;

    if(!worker) return;
    
    if(!validarRUT(rut)) {
        alert("El RUT ingresado no es válido. Formato requerido: 12345678-9");
        return;
    }

    if(pass !== 'Shell2026') {
        alert("Clave de administrador incorrecta.");
        return;
    }

    db.workers = db.workers.filter(w => w !== worker);
    delete db.deposits[worker];
    saveDB();
    
    document.getElementById('delete-rut').value = '';
    document.getElementById('delete-pass').value = '';
    alert(`El trabajador ${worker} ha sido eliminado permanentemente.`);
    navTo('view-admin-menu');
}

function renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '';

    const filterWorker = document.getElementById('filter-worker').value;
    const filterDate = document.getElementById('filter-date').value; 

    // Ya están ordenados por defecto por el unshift, pero aseguramos
    let filtered = [...db.history];

    if(filterWorker !== 'ALL') {
        filtered = filtered.filter(h => h.worker === filterWorker);
    }

    if(filterDate) {
        const partes = filterDate.split('-');
        const formattedFilter = `${partes[2]}-${partes[1]}-${partes[0]}`;
        filtered = filtered.filter(h => h.date === formattedFilter);
    }

    if(filtered.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); margin-top:10px;">No hay registros para este filtro.</p>';
        return;
    }

    filtered.forEach(h => {
        let borderClass = 'hist-perfect';
        let resText = '$0';
        if(h.diferencia > 0) { borderClass = 'hist-sobra'; resText = `+$${h.diferencia.toLocaleString('es-CL')}`; }
        else if (h.diferencia < 0) { borderClass = 'hist-falta'; resText = `-$${Math.abs(h.diferencia).toLocaleString('es-CL')}`; }

        container.innerHTML += `
            <div class="history-card ${borderClass}">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong>${h.date} - ${h.worker}</strong>
                    <span>Turno: ${h.turno}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>Ventas: $${h.ventas.toLocaleString('es-CL')}</span>
                    <strong>Dif: ${resText}</strong>
                </div>
            </div>
        `;
    });
}