// --- REGISTRO DE LA PWA E INSTALACIÓN INTELIGENTE ---
let deferredPrompt;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => {
        console.log("Service Worker Registrado.");
    });
}

// 1. Escuchar el evento de instalación si el navegador lo permite
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e; // Guardamos el evento para usarlo en el botón
});

// 2. Ocultar el botón SOLAMENTE si estamos dentro de la App instalada (Standalone)
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('btn-install-app');
    
    // Detectar si es la PWA instalada
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        if (installBtn) installBtn.style.display = 'none';
    }
});

// 3. Función al hacer clic en el botón
function installApp() {
    // Si el navegador nos dio el evento automático, lo usamos
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                document.getElementById('btn-install-app').style.display = 'none';
            }
            deferredPrompt = null;
        });
    } else {
        // PLAN B: Si el navegador bloqueó el popup automático (ej. Brave o Chrome estricto)
        alert("Tu navegador bloquea las descargas automáticas o la app ya está instalada en tu sistema.\n\nPara instalar manualmente: Busca el ícono de una pantalla con una flechita hacia abajo en la barra de direcciones de tu navegador (arriba a la derecha) o en el menú de opciones.");
    }
}

// --- BASE DE DATOS Y NAVEGACIÓN ---
let db = JSON.parse(localStorage.getItem('shellData')) || { workers: [], deposits: {}, history: [] };
function saveDB() { localStorage.setItem('shellData', JSON.stringify(db)); }

function navTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    if(viewId === 'view-deposit' || viewId === 'view-cuadratura' || viewId === 'view-admin-delete') {
        updateWorkerSelects();
        if(db.workers.length === 0 && viewId !== 'view-admin-delete') {
            alert("No hay trabajadores creados. Vaya a 'Administrar'.");
            navTo('view-menu');
        }
    }
    if(viewId === 'view-cuadratura') { checkCurrentDeposit(); calculateCuadratura(); }
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

// --- TECLADO ---
document.getElementById('admin-pass').addEventListener('keypress', function(e) { if (e.key === 'Enter') checkAdmin(); });
const depInputs = document.querySelectorAll('#deposit-grid input');
depInputs.forEach((input, index) => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (index < depInputs.length - 1) depInputs[index + 1].focus(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (index > 0) depInputs[index - 1].focus(); }
    });
});

function updateWorkerSelects() {
    const selects = document.querySelectorAll('.worker-select');
    const sortedWorkers = [...db.workers].sort((a, b) => a.localeCompare(b));
    selects.forEach(select => {
        select.innerHTML = select.id === 'filter-worker' ? '<option value="ALL">Todos</option>' : '';
        sortedWorkers.forEach(w => select.innerHTML += `<option value="${w}">${w}</option>`);
    });
}
function getVal(id) { let val = document.getElementById(id).value; return val === "" ? 0 : parseInt(val); }

// --- LÓGICA DE TRANSACCIONES PENDIENTES ---
let pendingTransaction = null;
let viewBeforePrint = '';

function calcDeposit() {
    let total = getVal('b20000')*20000 + getVal('b10000')*10000 + getVal('b5000')*5000 + getVal('b2000')*2000 + getVal('b1000')*1000 + getVal('b500')*500 + getVal('b100')*100 + getVal('b50')*50 + getVal('b10')*10;
    document.getElementById('dep-total').innerText = total.toLocaleString('es-CL');
    return total;
}

function previewDeposit() {
    const worker = document.getElementById('dep-worker').value;
    const amount = calcDeposit();
    if(!worker || amount === 0) {
        alert("Ingrese un monto válido para depositar.");
        return;
    }

    const fechaStr = new Date().toLocaleString('es-CL');
    const ticketHTML = `
        <div class="ticket-container">
            <div class="ticket-header">SHELL POS<br>COMPROBANTE DEPÓSITO</div>
            <div class="ticket-divider"></div>
            <div class="ticket-row"><span>Fecha:</span><span>${fechaStr}</span></div>
            <div class="ticket-row"><span>Trabajador:</span><span>${worker}</span></div>
            <div class="ticket-divider"></div>
            <div class="ticket-row" style="font-weight:bold; font-size: 16px;"><span>TOTAL INGRESADO:</span><span>$${amount.toLocaleString('es-CL')}</span></div>
            <div class="ticket-divider"></div>
            <div class="ticket-firma">Firma Trabajador</div>
        </div>
    `;

    pendingTransaction = { type: 'deposit', worker: worker, amount: amount, html: ticketHTML };
    viewBeforePrint = 'view-deposit';
    document.getElementById('receipt-preview-container').innerHTML = ticketHTML;
    navTo('view-print-preview');
}

let tempCuadratura = null;

function checkCurrentDeposit() {
    const worker = document.getElementById('cuad-worker').value;
    document.getElementById('cuad-deposito-actual').innerText = (db.deposits[worker] || 0).toLocaleString('es-CL');
    calculateCuadratura();
}

function calculateCuadratura() {
    const worker = document.getElementById('cuad-worker').value;
    if(!worker) return;
    const ventas = getVal('c-ventas');
    const totalIngresado = (db.deposits[worker] || 0) + getVal('c-transbank') + getVal('c-shellcard') + getVal('c-app') + getVal('c-transf');
    const diferencia = totalIngresado - ventas;

    const resBox = document.getElementById('cuad-resultado');
    const resText = document.getElementById('res-texto');
    const btnAceptar = document.getElementById('btn-aceptar-cuad');
    resBox.classList.remove('hidden');

    tempCuadratura = { date: new Date().toLocaleDateString('es-CL'), worker: worker, turno: document.getElementById('cuad-turno').value, ventas: ventas, ingresado: totalIngresado, diferencia: diferencia };

    resBox.style.backgroundColor = "var(--bg-card)";
    if (ventas === 0 && totalIngresado === 0) {
        resText.innerHTML = `Ingrese los valores del turno.`;
        resBox.style.border = "1px solid var(--border)";
        btnAceptar.classList.add('hidden');
    } else {
        btnAceptar.classList.remove('hidden');
        if(diferencia > 0) { resText.innerHTML = `SOBRA DINERO: +$${diferencia.toLocaleString('es-CL')}`; resBox.style.border = "3px solid #2196F3"; resText.style.color = "#2196F3"; } 
        else if (diferencia < 0) { resText.innerHTML = `FALTA DINERO: $${diferencia.toLocaleString('es-CL')}`; resBox.style.border = "3px solid var(--shell-red)"; resText.style.color = "var(--shell-red)"; } 
        else { resText.innerHTML = `CUADRADO PERFECTAMENTE ($0)`; resBox.style.border = "3px solid #4CAF50"; resText.style.color = "#4CAF50"; }
    }
}

function previewCuadratura() {
    if(!tempCuadratura) return;
    const fechaStr = new Date().toLocaleString('es-CL');
    let difTxt = tempCuadratura.diferencia === 0 ? "CUADRADO ($0)" : (tempCuadratura.diferencia > 0 ? `SOBRA +$${tempCuadratura.diferencia.toLocaleString('es-CL')}` : `FALTA -$${Math.abs(tempCuadratura.diferencia).toLocaleString('es-CL')}`);
    
    const ticketHTML = `
        <div class="ticket-container">
            <div class="ticket-header">SHELL POS<br>CIERRE DE TURNO</div>
            <div class="ticket-divider"></div>
            <div class="ticket-row"><span>Fecha:</span><span>${fechaStr}</span></div>
            <div class="ticket-row"><span>Trabajador:</span><span>${tempCuadratura.worker}</span></div>
            <div class="ticket-row"><span>Turno:</span><span>${tempCuadratura.turno}</span></div>
            <div class="ticket-divider"></div>
            <div class="ticket-row"><span>Ventas Turno:</span><span>$${tempCuadratura.ventas.toLocaleString('es-CL')}</span></div>
            <div class="ticket-row"><span>Total Ingresado:</span><span>$${tempCuadratura.ingresado.toLocaleString('es-CL')}</span></div>
            <div class="ticket-divider"></div>
            <div class="ticket-row" style="font-weight:bold; font-size: 16px;"><span>RESULTADO:</span><span>${difTxt}</span></div>
            <div class="ticket-divider"></div>
            <div class="ticket-firma">Firma Trabajador</div>
        </div>
    `;

    pendingTransaction = { type: 'cuadratura', data: tempCuadratura, html: ticketHTML };
    viewBeforePrint = 'view-cuadratura';
    document.getElementById('receipt-preview-container').innerHTML = ticketHTML;
    navTo('view-print-preview');
}

function confirmAndPrint() {
    if(!pendingTransaction) return;

    if(pendingTransaction.type === 'deposit') {
        db.deposits[pendingTransaction.worker] = (db.deposits[pendingTransaction.worker] || 0) + pendingTransaction.amount;
        saveDB();
        document.querySelectorAll('.den-item input').forEach(inp => inp.value = '');
        document.getElementById('dep-total').innerText = '0';
    } 
    else if (pendingTransaction.type === 'cuadratura') {
        db.history.unshift(pendingTransaction.data); 
        db.deposits[pendingTransaction.data.worker] = 0; 
        saveDB();
        document.querySelectorAll('.cuadratura-inputs input').forEach(inp => inp.value = '');
        document.getElementById('cuad-resultado').classList.add('hidden');
        tempCuadratura = null;
    }

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `<div class="receipt-paper">${pendingTransaction.html}</div>`;
    window.print();
    printArea.innerHTML = '';
    pendingTransaction = null;
    navTo('view-menu');
}

function cancelTransaction() {
    pendingTransaction = null;
    navTo(viewBeforePrint);
}

// --- ADMINISTRADOR ---
function checkAdmin() { if(document.getElementById('admin-pass').value === 'Shell2026') { navTo('view-admin-menu'); } else { alert("Contraseña incorrecta."); } }

function addWorker() {
    const nameInput = document.getElementById('new-worker-name');
    let name = nameInput.value.trim().toUpperCase();
    if(name === "") return;
    if(db.workers.includes(name)) { alert("El trabajador ya existe."); return; }
    db.workers.push(name); db.deposits[name] = 0; saveDB();
    nameInput.value = ''; alert("Trabajador agregado correctamente."); navTo('view-admin-menu');
}

function validarRUT(rutCompleto) {
    if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rutCompleto)) return false;
    let tmp = rutCompleto.split('-'), digv = tmp[1].toLowerCase(), rut = tmp[0], M=0, S=1;
    for(;rut;rut=Math.floor(rut/10)) S=(S+rut%10*(9-M++%6))%11;
    return (S?S-1:'k') == digv;
}

function removeWorker() {
    const worker = document.getElementById('delete-worker-select').value, rut = document.getElementById('delete-rut').value.trim(), pass = document.getElementById('delete-pass').value;
    if(!worker) return;
    if(!validarRUT(rut)) { alert("El RUT ingresado no es válido. Formato requerido: 12345678-9"); return; }
    if(pass !== 'Shell2026') { alert("Clave de administrador incorrecta."); return; }
    db.workers = db.workers.filter(w => w !== worker); delete db.deposits[worker]; saveDB();
    document.getElementById('delete-rut').value = ''; document.getElementById('delete-pass').value = '';
    alert(`Trabajador eliminado.`); navTo('view-admin-menu');
}

function renderHistory() {
    const container = document.getElementById('history-container'); container.innerHTML = '';
    const filterWorker = document.getElementById('filter-worker').value, filterDate = document.getElementById('filter-date').value; 
    let filtered = [...db.history];
    if(filterWorker !== 'ALL') filtered = filtered.filter(h => h.worker === filterWorker);
    if(filterDate) { const partes = filterDate.split('-'); filtered = filtered.filter(h => h.date === `${partes[2]}-${partes[1]}-${partes[0]}`); }
    
    if(filtered.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); margin-top:10px;">No hay registros.</p>'; return; }
    filtered.forEach(h => {
        let borderClass = 'hist-perfect', resText = '$0';
        if(h.diferencia > 0) { borderClass = 'hist-sobra'; resText = `+$${h.diferencia.toLocaleString('es-CL')}`; }
        else if (h.diferencia < 0) { borderClass = 'hist-falta'; resText = `-$${Math.abs(h.diferencia).toLocaleString('es-CL')}`; }
        container.innerHTML += `
            <div class="history-card ${borderClass}">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>${h.date} - ${h.worker}</strong><span>Turno: ${h.turno}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Ventas: $${h.ventas.toLocaleString('es-CL')}</span><strong>Dif: ${resText}</strong></div>
            </div>`;
    });
}

function exportarExcel() {
    if(db.history.length === 0) { alert("No hay registros en el historial para exportar."); return; }
    let csv = "Fecha;Trabajador;Turno;Ventas del Turno;Monto Ingresado;Diferencia\n";
    db.history.forEach(h => { csv += `${h.date};${h.worker};${h.turno};${h.ventas};${h.ingresado};${h.diferencia}\n`; });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Shell_${new Date().toLocaleDateString('es-CL').replaceAll('-', '_')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}