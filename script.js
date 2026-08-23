// --- 1. MODALES PERSONALIZADOS ---
function showAlert(msg, isHTML = false) {
    const box = document.getElementById('alert-message');
    if (isHTML) { 
        box.innerHTML = msg; 
        box.style.textAlign = 'left'; 
    } else { 
        box.innerHTML = `<p>${msg.replace(/\n/g, '<br>')}</p>`; 
        box.style.textAlign = 'center'; 
    }
    document.getElementById('custom-alert').classList.remove('hidden');
}
function closeAlert() { document.getElementById('custom-alert').classList.add('hidden'); }

// --- 2. BASE DE DATOS Y MIGRACIÓN ---
let db = JSON.parse(localStorage.getItem('shellData')) || { workers: [], depositsList: [], history: [], folioDep: 0, folioCuad: 0 };

// Si los trabajadores vienen de la versión vieja, los actualizamos
if(db.workers.length > 0 && typeof db.workers[0] === 'string') { db.workers = db.workers.map(w => ({ name: w, rut: "Sin Registro" })); }
if(!db.depositsList) { db.depositsList = []; }
if(typeof db.folioDep === 'undefined' || db.folioDep > 10000) db.folioDep = 0; 
if(typeof db.folioCuad === 'undefined' || db.folioCuad > 10000) db.folioCuad = 0;
function saveDB() { localStorage.setItem('shellData', JSON.stringify(db)); }

// --- 3. PWA (Instalación Inteligente) ---
let deferredPrompt;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('btn-install-app');
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        if (installBtn) installBtn.style.display = 'none';
    }
    
    // Detectores automáticos: Si cambias fecha o turno, se actualiza el monto en cuadratura
    const cuadTurno = document.getElementById('cuad-turno');
    if(cuadTurno) cuadTurno.addEventListener('change', checkCurrentDeposit);
    
    const cuadDate = document.getElementById('cuad-date');
    if(cuadDate) cuadDate.addEventListener('change', checkCurrentDeposit);
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((c) => { if (c.outcome === 'accepted') document.getElementById('btn-install-app').style.display = 'none'; deferredPrompt = null; });
    } else {
        showAlert("Tu navegador bloquea los avisos automáticos o la app ya está instalada.\nPara instalar manualmente: Busca el ícono en la barra de direcciones.");
    }
}

// --- 4. NAVEGACIÓN Y LIMPIEZA AUTOMÁTICA ---
let editDepositId = null; 

function navTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    // Obtenemos la fecha de hoy para setearla por defecto
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateHoy = `${yyyy}-${mm}-${dd}`;

    // Limpiamos los formularios al entrar
    if(viewId === 'view-deposit') {
        document.querySelectorAll('#view-deposit input[type="number"]').forEach(i => i.value = '');
        document.getElementById('dep-date').value = dateHoy; 
        calcDeposit();
        if(!editDepositId) document.getElementById('title-deposit').innerText = 'Depositar Dinero';
    }
    
    if(viewId === 'view-cuadratura') {
        document.querySelectorAll('#view-cuadratura input[type="number"]').forEach(i => i.value = '');
        const cuadDateInput = document.getElementById('cuad-date');
        if (cuadDateInput) cuadDateInput.value = dateHoy;
        document.getElementById('cuad-resultado').classList.add('hidden');
    }
    
    if(viewId === 'view-edit-rut') { document.getElementById('edit-rut').value = ''; }

    // Validar que existan trabajadores antes de operar
    if(['view-deposit', 'view-cuadratura', 'view-admin-delete'].includes(viewId)) {
        updateWorkerSelects();
        if(db.workers.length === 0 && viewId !== 'view-admin-delete') {
            showAlert("No hay trabajadores creados. Vaya a 'Administrar'."); navTo('view-menu'); return;
        }
    }
    
    if(viewId === 'view-cuadratura') { checkCurrentDeposit(); }
    if(viewId === 'view-login') { document.getElementById('admin-pass').value = ''; setTimeout(() => document.getElementById('admin-pass').focus(), 100); }
    if(viewId === 'view-admin-history') renderHistory();
}

// --- 5. TEMA CLARO/OSCURO ---
const themeToggleBtn = document.getElementById('theme-toggle'), iconSun = document.getElementById('icon-sun'), iconMoon = document.getElementById('icon-moon');
let currentTheme = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', currentTheme); updateThemeIcons(currentTheme);
themeToggleBtn.addEventListener('click', () => { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', currentTheme); localStorage.setItem('theme', currentTheme); updateThemeIcons(currentTheme); });
function updateThemeIcons(theme) { iconSun.style.display = theme === 'dark' ? 'block' : 'none'; iconMoon.style.display = theme === 'dark' ? 'none' : 'block'; }

// --- 6. NAVEGACIÓN INTELIGENTE POR TECLADO ---
document.addEventListener('keydown', function(e) {
    // Solo aplicamos la lógica a casillas de NÚMEROS (no afecta contraseñas ni nombres)
    if(e.target.tagName === 'INPUT' && e.target.type === 'number') {
        const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
        
        if(moveKeys.includes(e.key)) {
            e.preventDefault(); // Evita sumar/restar el número o mover el cursor
            
            // Obtenemos todos los inputs numéricos y selectores de la vista actual
            const inputs = Array.from(document.querySelectorAll('.view.active input[type="number"]:not([disabled]), .view.active select:not([disabled])'));
            const index = inputs.indexOf(e.target);
            
            // Abajo, Derecha o Enter = Siguiente casilla
            if(['ArrowDown', 'ArrowRight', 'Enter'].includes(e.key) && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            // Arriba o Izquierda = Casilla anterior
            else if(['ArrowUp', 'ArrowLeft'].includes(e.key) && index > 0) {
                inputs[index - 1].focus();
            }
        }
    }
});

// Teclado para Admin
document.getElementById('admin-pass').addEventListener('keypress', function(e) { if (e.key === 'Enter') checkAdmin(); });

// --- 7. UTILIDADES ---
function updateWorkerSelects() {
    const selects = document.querySelectorAll('.worker-select');
    const sortedWorkers = [...db.workers].sort((a, b) => a.name.localeCompare(b.name));
    selects.forEach(select => {
        select.innerHTML = select.id === 'filter-worker' ? '<option value="ALL">Todos</option>' : '';
        sortedWorkers.forEach(w => select.innerHTML += `<option value="${w.name}">${w.name}</option>`);
    });
}
function getVal(id) { let val = document.getElementById(id).value; return val === "" ? 0 : parseInt(val); }
function fmt(num) { return num.toLocaleString('es-CL'); }

// --- 8. LÓGICAS DE TRANSACCIÓN ---
let pendingTransaction = null; let viewBeforePrint = '';

// A) EDICIÓN DE DEPÓSITOS (Con RUT)
function findDepositsByRut() {
    const rut = document.getElementById('edit-rut').value.trim();
    const workerObj = db.workers.find(w => w.rut === rut);
    if(!workerObj) { showAlert("RUT no encontrado o no registrado en el sistema."); return; }

    const pendingDeps = db.depositsList.filter(d => d.worker === workerObj.name && !d.squared);
    if(pendingDeps.length === 0) { showAlert("No tienes depósitos pendientes de cuadratura para editar."); return; }

    if(pendingDeps.length === 1) { 
        loadEditForm(pendingDeps[0].id); 
    } else {
        let html = '';
        pendingDeps.forEach(d => { html += `<button class="btn-main" onclick="loadEditForm('${d.id}')">Depósito #${d.folio} ($${fmt(d.amount)}) - Turno ${d.turno}</button>`; });
        document.getElementById('edit-list-container').innerHTML = html;
        navTo('view-edit-list');
    }
}

function loadEditForm(id) {
    const d = db.depositsList.find(x => x.id === id);
    if(!d) return;
    editDepositId = id;
    navTo('view-deposit');
    document.getElementById('title-deposit').innerText = 'Editando Depósito #' + d.folio;
    document.getElementById('dep-worker').value = d.worker;
    document.getElementById('dep-turno').value = d.turno;
    document.getElementById('dep-date').value = d.date;
    
    document.getElementById('b20000').value = d.billetes.b20 || ''; document.getElementById('b10000').value = d.billetes.b10 || '';
    document.getElementById('b5000').value = d.billetes.b5 || ''; document.getElementById('b2000').value = d.billetes.b2 || '';
    document.getElementById('b1000').value = d.billetes.b1 || ''; document.getElementById('b500').value = d.billetes.b05 || '';
    document.getElementById('b100').value = d.billetes.b01 || ''; document.getElementById('b50').value = d.billetes.b005 || '';
    document.getElementById('b10').value = d.billetes.b001 || '';
    calcDeposit();
}

// B) CREAR DEPÓSITOS
function calcDeposit() {
    let total = getVal('b20000')*20000 + getVal('b10000')*10000 + getVal('b5000')*5000 + getVal('b2000')*2000 + getVal('b1000')*1000 + getVal('b500')*500 + getVal('b100')*100 + getVal('b50')*50 + getVal('b10')*10;
    document.getElementById('dep-total').innerText = fmt(total); return total;
}

function previewDeposit() {
    const worker = document.getElementById('dep-worker').value;
    const turno = document.getElementById('dep-turno').value;
    const dateStr = document.getElementById('dep-date').value;
    const amount = calcDeposit();
    
    if(!worker || amount === 0 || !dateStr) { showAlert("Debe llenar fecha, turno y montos válidos."); return; }

    const isEdit = editDepositId !== null;
    let refDep = isEdit ? db.depositsList.find(x => x.id === editDepositId) : null;
    const curFolio = isEdit ? refDep.folio : (db.folioDep + 1);

    const formatD = dateStr.split('-');
    const fStr = `${formatD[2]}-${formatD[1]}-${formatD[0]}`;

    let bHTML = '';
    const billetes = [
        { nom: '$20.000', val: getVal('b20000'), mult: 20000, key: 'b20' }, { nom: '$10.000', val: getVal('b10000'), mult: 10000, key: 'b10' },
        { nom: '$5.000', val: getVal('b5000'), mult: 5000, key: 'b5' }, { nom: '$2.000', val: getVal('b2000'), mult: 2000, key: 'b2' },
        { nom: '$1.000', val: getVal('b1000'), mult: 1000, key: 'b1' }, { nom: '$500', val: getVal('b500'), mult: 500, key: 'b05' },
        { nom: '$100', val: getVal('b100'), mult: 100, key: 'b01' }, { nom: '$50', val: getVal('b50'), mult: 50, key: 'b005' }, { nom: '$10', val: getVal('b10'), mult: 10, key: 'b001' }
    ];
    let billSave = {};
    billetes.forEach(b => { if(b.val > 0) { bHTML += `<tr><td>${b.nom}</td><td style="text-align:center;">${b.val}</td><td style="text-align:right;">${fmt(b.val * b.mult)}</td></tr>`; billSave[b.key] = b.val; } });

    let wtrmk = isEdit ? '<div class="watermark-edit">EDITADO</div>' : '';

    const ticketHTML = `
        ${wtrmk}
        <div class="ticket-header">Deposito.......${curFolio}</div>
        <div class="ticket-info">Fecha : ${fStr} Turno : ${turno}<br>operador:${worker.toUpperCase()}</div>
        <table class="ticket-table">
            <thead><tr><th style="text-align:left;">Detalle</th><th style="text-align:center;">Cant</th><th style="text-align:right;">Valor</th></tr></thead>
            <tbody>
                ${bHTML}
                <tr><td colspan="3" style="border-bottom: 1px dashed black; padding: 2px;"></td></tr>
                <tr class="row-bold"><td colspan="2" style="padding-top:10px;">Total Deposito</td><td style="text-align:right; padding-top:10px;">${fmt(amount)}</td></tr>
            </tbody>
        </table>`;

    const depData = { id: isEdit ? editDepositId : Date.now().toString(), worker: worker, amount: amount, turno: turno, date: dateStr, billetes: billSave, folio: curFolio, squared: false, edited: isEdit };
    pendingTransaction = { type: 'deposit', data: depData, html: ticketHTML, isEdit: isEdit, folio: curFolio };
    viewBeforePrint = isEdit ? 'view-edit-list' : 'view-deposit';
    document.getElementById('receipt-preview-container').innerHTML = ticketHTML; navTo('view-print-preview');
}

// C) CUADRATURA
function checkCurrentDeposit() {
    const worker = document.getElementById('cuad-worker').value;
    const turno = document.getElementById('cuad-turno').value;
    let dateVal = document.getElementById('cuad-date').value;
    
    if(!worker || !turno || !dateVal) return;

    // Regla de Oro: Filtrar por Trabajador + Turno + Fecha Exacta
    const pendingDeps = db.depositsList.filter(d => d.worker === worker && d.turno === turno && d.date === dateVal && !d.squared);
    const sumDeps = pendingDeps.reduce((sum, d) => sum + d.amount, 0);
    
    document.getElementById('cuad-deposito-actual').innerText = fmt(sumDeps);
    calculateCuadratura();
}

function calculateCuadratura() {
    const worker = document.getElementById('cuad-worker').value;
    const turno = document.getElementById('cuad-turno').value;
    let dateVal = document.getElementById('cuad-date').value;
    if(!worker) return;
    
    const ventas = getVal('c-ventas'), kerosene = getVal('c-kerosene'), transbank = getVal('c-transbank'), shellcard = getVal('c-shellcard'), transf = getVal('c-transf'), promo = getVal('c-promo'), piloto = getVal('c-piloto');
    
    const pendingDeps = db.depositsList.filter(d => d.worker === worker && d.turno === turno && d.date === dateVal && !d.squared);
    const sumDeps = pendingDeps.reduce((sum, d) => sum + d.amount, 0);
    const depsFolios = pendingDeps.map(d => d.folio).join(', ');

    const totalIngresado = sumDeps + transbank + shellcard + transf + promo + piloto + kerosene;
    const diferencia = totalIngresado - ventas;

    const resBox = document.getElementById('cuad-resultado'), resText = document.getElementById('res-texto'), btnAceptar = document.getElementById('btn-aceptar-cuad');
    resBox.classList.remove('hidden');

    tempCuadratura = { 
        date: dateVal, 
        worker: worker, 
        turno: turno, 
        ventas: ventas, ingresado: totalIngresado, diferencia: diferencia,
        detalles: { depAmount: sumDeps, depFolio: depsFolios || "----", kerosene, transbank, shellcard, transf, promo, piloto },
        depsRef: pendingDeps.map(d => d.id)
    };

    resBox.style.backgroundColor = "var(--bg-card)";
    if (ventas === 0 && totalIngresado === 0) { resText.innerHTML = `Ingrese los valores.`; resBox.style.border = "1px solid var(--border)"; btnAceptar.classList.add('hidden'); } 
    else {
        btnAceptar.classList.remove('hidden');
        if(diferencia > 0) { resText.innerHTML = `SOBRA: +$${fmt(diferencia)}`; resBox.style.border = "3px solid #2196F3"; resText.style.color = "#2196F3"; } 
        else if (diferencia < 0) { resText.innerHTML = `FALTA: $${fmt(diferencia)}`; resBox.style.border = "3px solid var(--shell-red)"; resText.style.color = "var(--shell-red)"; } 
        else { resText.innerHTML = `CUADRADO ($0)`; resBox.style.border = "3px solid #4CAF50"; resText.style.color = "#4CAF50"; }
    }
}

function previewCuadratura() {
    if(!tempCuadratura) return;
    const curFolio = db.folioCuad + 1;
    const formatD = tempCuadratura.date.split('-'); const fStr = `${formatD[2]}-${formatD[1]}-${formatD[0]}`;
    const d = tempCuadratura.detalles;

    const ticketHTML = `
        <div class="ticket-header">Cuadratura.....${curFolio}</div>
        <div class="ticket-info">Fecha : ${fStr} Turno : ${tempCuadratura.turno}<br>operador:${tempCuadratura.worker.toUpperCase()}</div>
        <table class="ticket-table">
            <thead><tr><th style="text-align:left;">Detalle</th><th style="text-align:center;">Numero</th><th style="text-align:right;">Valor</th></tr></thead>
            <tbody>
                <tr><td>Deposito</td><td style="text-align:center; font-size:11px;">${d.depFolio}</td><td style="text-align:right;">${fmt(d.depAmount)}</td></tr>
                <tr class="border-bot"><td colspan="2">Total Deposito</td><td style="text-align:right;">${fmt(d.depAmount)}</td></tr>
                <tr class="border-bot"><td colspan="2">Ventas</td><td style="text-align:right;">${fmt(tempCuadratura.ventas)}</td></tr>
                <tr class="border-bot"><td colspan="2">Kerosene</td><td style="text-align:right;">${fmt(d.kerosene)}</td></tr>
                <tr class="border-bot"><td colspan="2">TransBank</td><td style="text-align:right;">${fmt(d.transbank)}</td></tr>
                <tr class="border-bot"><td colspan="2">Shellcard</td><td style="text-align:right;">${fmt(d.shellcard)}</td></tr>
                <tr class="border-bot"><td colspan="2">Transferencia</td><td style="text-align:right;">${fmt(d.transf)}</td></tr>
                <tr class="border-bot"><td colspan="2">Diferencia</td><td style="text-align:right;">${fmt(tempCuadratura.diferencia)}</td></tr>
                <tr class="border-bot"><td colspan="2">Promo/Aceite</td><td style="text-align:right;">${fmt(d.promo)}</td></tr>
                <tr class="border-bot"><td colspan="2">Mi Piloto</td><td style="text-align:right;">${fmt(d.piloto)}</td></tr>
                <tr><td colspan="2" style="padding-top:10px; font-weight:bold;">Total</td><td style="text-align:right; padding-top:10px; font-weight:bold;">${fmt(tempCuadratura.ingresado)}</td></tr>
            </tbody>
        </table>`;

    tempCuadratura.folio = curFolio; 
    pendingTransaction = { type: 'cuadratura', data: tempCuadratura, folio: curFolio, html: ticketHTML };
    viewBeforePrint = 'view-cuadratura';
    document.getElementById('receipt-preview-container').innerHTML = ticketHTML; navTo('view-print-preview');
}

// --- 9. CONFIRMAR IMPRESIÓN ---
function confirmAndPrint() {
    if(!pendingTransaction) return;

    if(pendingTransaction.type === 'deposit') {
        if(pendingTransaction.isEdit) {
            const index = db.depositsList.findIndex(x => x.id === pendingTransaction.data.id);
            if(index !== -1) db.depositsList[index] = pendingTransaction.data;
        } else {
            db.folioDep = pendingTransaction.folio; 
            db.depositsList.push(pendingTransaction.data);
        }
        saveDB(); editDepositId = null;
    } 
    else if (pendingTransaction.type === 'cuadratura') {
        db.folioCuad = pendingTransaction.folio; 
        db.history.unshift(pendingTransaction.data); 
        pendingTransaction.data.depsRef.forEach(id => {
            const dep = db.depositsList.find(x => x.id === id); if(dep) dep.squared = true;
        });
        saveDB(); tempCuadratura = null;
    }

    const printArea = document.getElementById('print-area'); printArea.innerHTML = `<div class="receipt-paper">${pendingTransaction.html}</div>`;
    window.print(); printArea.innerHTML = ''; pendingTransaction = null; navTo('view-menu');
}

function cancelTransaction() { editDepositId = null; pendingTransaction = null; navTo(viewBeforePrint); }

// --- 10. PANEL DE ADMINISTRADOR ---
function checkAdmin() { if(document.getElementById('admin-pass').value === 'Shell2026') { navTo('view-admin-menu'); } else { showAlert("Contraseña incorrecta."); } }
function validarRUT(r) { if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(r)) return false; let tmp = r.split('-'), digv = tmp[1].toLowerCase(), rut = tmp[0], M=0, S=1; for(;rut;rut=Math.floor(rut/10)) S=(S+rut%10*(9-M++%6))%11; return (S?S-1:'k') == digv; }

function addWorker() {
    let name = document.getElementById('new-worker-name').value.trim().toUpperCase(), rut = document.getElementById('new-worker-rut').value.trim();
    if(name === "" || rut === "") { showAlert("Debe ingresar nombre y RUT."); return; }
    if(!validarRUT(rut)) { showAlert("El RUT no es válido. Ej: 12345678-9"); return; }
    if(db.workers.find(w => w.name === name || w.rut === rut)) { showAlert("El trabajador o el RUT ya existe."); return; }
    db.workers.push({name: name, rut: rut}); saveDB();
    document.getElementById('new-worker-name').value = ''; document.getElementById('new-worker-rut').value = '';
    showAlert("Trabajador agregado correctamente."); navTo('view-admin-menu');
}

function removeWorker() {
    const workerName = document.getElementById('delete-worker-select').value, rut = document.getElementById('delete-rut').value.trim(), pass = document.getElementById('delete-pass').value;
    if(!workerName) return; if(!validarRUT(rut)) { showAlert("El RUT ingresado no es válido."); return; }
    if(pass !== 'Shell2026') { showAlert("Clave incorrecta."); return; }
    db.workers = db.workers.filter(w => w.name !== workerName); saveDB();
    document.getElementById('delete-rut').value = ''; document.getElementById('delete-pass').value = '';
    showAlert(`Trabajador eliminado.`); navTo('view-admin-menu');
}

// 11. HISTORIAL Y REPORTES
function renderHistory() {
    const container = document.getElementById('history-container'); container.innerHTML = '';
    const filterWorker = document.getElementById('filter-worker').value;
    const filterDate = document.getElementById('filter-date').value; 
    const filterFolio = document.getElementById('filter-folio').value.trim();

    let filtered = [...db.history];
    
    if(filterWorker !== 'ALL') filtered = filtered.filter(h => h.worker === filterWorker);
    if(filterDate) filtered = filtered.filter(h => h.date === filterDate);
    if(filterFolio !== "") {
        filtered = filtered.filter(h => {
            const f = h.folio ? h.folio.toString() : "";
            const df = h.detalles && h.detalles.depFolio ? h.detalles.depFolio.toString() : "";
            return f.includes(filterFolio) || df.includes(filterFolio);
        });
    }
    
    if(filtered.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); margin-top:10px;">No hay registros para este filtro.</p>'; return; }
    
    filtered.forEach((h) => {
        let borderClass = 'hist-perfect', resText = '$0';
        if(h.diferencia > 0) { borderClass = 'hist-sobra'; resText = `+$${fmt(h.diferencia)}`; }
        else if (h.diferencia < 0) { borderClass = 'hist-falta'; resText = `-$${fmt(Math.abs(h.diferencia))}`; }
        
        const dFormat = h.date.split('-'); const fStr = `${dFormat[2]}-${dFormat[1]}-${dFormat[0]}`;
        const realIndex = db.history.indexOf(h); 
        const showFolio = h.folio ? ` (Folio #${h.folio})` : '';

        container.innerHTML += `
            <div class="history-card ${borderClass}" onclick="showHistoryDetail(${realIndex})">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>${fStr} - ${h.worker}${showFolio}</strong><span>Turno: ${h.turno}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Ventas: $${fmt(h.ventas)}</span><strong>Dif: ${resText}</strong></div>
            </div>`;
    });
}

function showHistoryDetail(index) {
    const h = db.history[index];
    if(!h) return;
    
    // Reconstrucción del ticket
    const formatD = h.date.split('-');
    const fStr = `${formatD[2]}-${formatD[1]}-${formatD[0]}`;
    const d = h.detalles || { depAmount: h.ingresado - h.ventas, depFolio: "----", kerosene: 0, transbank: 0, shellcard: 0, transf: 0, promo: 0, piloto: 0 };
    
    const ticketHTML = `
        <div class="ticket-header">Cuadratura.....${h.folio || "----"}</div>
        <div class="ticket-info">Fecha : ${fStr} Turno : ${h.turno}<br>operador:${h.worker.toUpperCase()}</div>
        <table class="ticket-table">
            <thead><tr><th style="text-align:left;">Detalle</th><th style="text-align:center;">Numero</th><th style="text-align:right;">Valor</th></tr></thead>
            <tbody>
                <tr><td>Deposito</td><td style="text-align:center; font-size:11px;">${d.depFolio}</td><td style="text-align:right;">${fmt(d.depAmount)}</td></tr>
                <tr class="border-bot"><td colspan="2">Total Deposito</td><td style="text-align:right;">${fmt(d.depAmount)}</td></tr>
                <tr class="border-bot"><td colspan="2">Ventas</td><td style="text-align:right;">${fmt(h.ventas)}</td></tr>
                <tr class="border-bot"><td colspan="2">Kerosene</td><td style="text-align:right;">${fmt(d.kerosene)}</td></tr>
                <tr class="border-bot"><td colspan="2">TransBank</td><td style="text-align:right;">${fmt(d.transbank)}</td></tr>
                <tr class="border-bot"><td colspan="2">Shellcard</td><td style="text-align:right;">${fmt(d.shellcard)}</td></tr>
                <tr class="border-bot"><td colspan="2">Transferencia</td><td style="text-align:right;">${fmt(d.transf)}</td></tr>
                <tr class="border-bot"><td colspan="2">Diferencia</td><td style="text-align:right;">${fmt(h.diferencia)}</td></tr>
                <tr class="border-bot"><td colspan="2">Promo/Aceite</td><td style="text-align:right;">${fmt(d.promo)}</td></tr>
                <tr class="border-bot"><td colspan="2">Mi Piloto</td><td style="text-align:right;">${fmt(d.piloto)}</td></tr>
                <tr><td colspan="2" style="padding-top:10px; font-weight:bold;">Total</td><td style="text-align:right; padding-top:10px; font-weight:bold;">${fmt(h.ingresado)}</td></tr>
            </tbody>
        </table>`;
    
    showAlert(`<div class="receipt-paper" style="margin: 0 auto; box-shadow: none;">${ticketHTML}</div>`, true);
}

function exportarExcel() {
    if(db.history.length === 0) { showAlert("No hay registros en el historial para exportar."); return; }
    let csv = "Fecha;Trabajador;Turno;Folio;Ventas del Turno;Monto Ingresado;Diferencia\n";
    db.history.forEach(h => { csv += `${h.date};${h.worker};${h.turno};${h.folio || 'N/A'};${h.ventas};${h.ingresado};${h.diferencia}\n`; });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Shell_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}