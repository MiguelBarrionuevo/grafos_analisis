<template>
  <div class="app-layout">
    <header class="header">
      <h1>Algoritmo Northwest</h1>
    </header>

    <aside class="sidebar">
      <div class="group">
        <button class="button" @click="$emit('back-to-main')">← Volver al Editor Principal</button>
      </div>

      <hr class="sep" />
      <div class="group">
        <h2>Filas</h2>
        <button class="button" @click="addRow">➕ Agregar Fila</button>
        <button class="button" @click="removeLastRow" :disabled="matrix.length <= 2">🗑️ Quitar Fila</button>
      </div>
      <hr class="sep" />
      <div class="group">
        <h2>Columnas</h2>
        <button class="button" @click="addColumn">➕ Agregar Columna</button>
        <button class="button" @click="removeLastColumn" :disabled="matrix[0].length <= 2">🗑️ Quitar Columna</button>
      </div>
      <hr class="sep" />
      <div class="group">
        
        <button class="button" @click="runWithBalance('min')">📉 Minimización</button>
        <button class="button" @click="runWithBalance('max')">📈 Maximización</button>
        <button class="button danger" @click="clearMatrix">🧼 Vaciar matriz</button>
      </div>
      <hr class="sep" />
      <div class="group">
        <h2>Exportar/Importar</h2>
        <button class="button" @click="openExportModal">💾 Exportar</button>
        <button class="button" @click="openImportModal">📥 Importar</button>
      </div>
      <hr class="sep" />
      <div class="group">
        <h2>Ayuda</h2>
        <button class="button" @click="openHelpModal">❓ Ayuda</button>
      </div>

    </aside>

    <main class="main">
      <div class="matrix-container">
        <table class="transport-matrix">
          <thead>
            <tr>
              <th>Destino/Origen</th>
              <template v-for="(_, colIndex) in matrix[0].slice(0, -1)" :key="'header-' + colIndex">
                <th :class="{ 'dummy-header': dummyColIndex === colIndex }">Origen {{ colIndex + 1 }}</th>
              </template>
              <th>Oferta</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(row, rowIndex) in matrix.slice(0, -1)" :key="'row-' + rowIndex">
              <tr>
                <td>Destino {{ rowIndex + 1 }}</td>
                <template v-for="(cell, colIndex) in row" :key="'cell-' + rowIndex + '-' + colIndex">
                  <td :class="{ 'dummy-cell': (dummyRowIndex === rowIndex) || (dummyColIndex === colIndex) }">
                    <input
                      type="number"
                      v-model.number="matrix[rowIndex][colIndex]"
                      :class="{ 'solution-cell': solution && solution.allocation[rowIndex]?.[colIndex] }"
                      min="0"
                    />
                  </td>
                </template>
              </tr>
            </template>
            <tr>
              <td class="header-cell">Demanda</td>
              <template v-for="(cell, colIndex) in matrix[matrix.length - 1].slice(0, -1)" :key="'demand-' + colIndex">
                <td :class="{ 'dummy-cell': dummyColIndex === colIndex }">
                  <input
                    type="number"
                    v-model.number="matrix[matrix.length - 1][colIndex]"
                    min="0"
                  />
                </td>
              </template>
              <td class="disabled-cell">-</td>
            </tr>
          </tbody>
        </table>

        <div v-if="solution" class="solution-info">
          <h3>Solución Óptima</h3>
          <p>Costo Total: {{ solution.totalCost }}</p>
          <table class="solution-matrix">
            <tbody>
              <tr v-for="(row, i) in solution.allocation" :key="'sol-' + i">
                <td v-for="(value, j) in row" :key="'sol-' + i + '-' + j" :class="{ 'allocated': value && value > 0 }">
                  <div class="alloc-box">{{ value || '-' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Modal para exportar -->
    <GraphModal
      :visible="modals.export.visible"
      title="Exportar Matriz"
      submit-text="Descargar"
      @cancel="closeExportModal"
      @submit="submitExport"
    >
      <div class="row">
        <label>
          Nombre del archivo:
          <input
            type="text"
            v-model="forms.export.filename"
            placeholder="matriz-northwest"
          />
        </label>
        <span class="error" v-if="forms.export.error">{{ forms.export.error }}</span>
      </div>
    </GraphModal>

    <!-- Modal para importar -->
    <GraphModal
      :visible="modals.import.visible"
      title="Importar Matriz"
      submit-text="Importar"
      @cancel="closeImportModal"
      @submit="submitImport"
    >
      <div class="row">
        <input
          type="file"
          accept=".json"
          @change="onPickImportFile"
          ref="fileInput"
        />
        <span class="error" v-if="forms.import.error">{{ forms.import.error }}</span>
      </div>
    </GraphModal>

    <!-- Modal: Equilibrar oferta/demanda -->
    <GraphModal
      :visible="modals.balance.visible"
      title="Desequilibrio: ¿Equilibrar automáticamente?"
      submit-text="Equilibrar"
      @cancel="() => modals.balance.visible = false"
      @submit="confirmBalance"
    >
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <p>Oferta total: <strong>{{ balanceInfo.totalSupply }}</strong></p>
        <p>Demanda total: <strong>{{ balanceInfo.totalDemand }}</strong></p>
        <p>Diferencia: <strong>{{ balanceInfo.diff }}</strong></p>
        <small style="color:var(--muted)">Si eliges equilibrar, se añadirá una fila o columna ficticia para igualar los totales (costos: 0).</small>
      </div>
    </GraphModal>

    <!-- Modal de ayuda específico para Northwest -->
    <GraphModal :visible="modals.help.visible" title="Ayuda - Método Northwest" :hide-submit="true" @cancel="closeHelpModal">
      <div>
        <p>El Método Northwest es una heurística inicial para el problema de transporte. Rellena las ofertas (última columna de cada fila) y demandas (última fila, sin la esquina final).</p>
        <ul>
          <li>Si la oferta total y la demanda total no coinciden, puedes equilibrarlas automáticamente; se añadirá una fila o columna ficticia con costo 0 para igualarlas.</li>
          <li>La celda en la esquina inferior derecha no se usa y está deshabilitada.</li>
        </ul>
      </div>
    </GraphModal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import GraphModal from './GraphModal.vue';

// Estado inicial de la matriz
const matrix = ref([
  [0, 0, 0], // fila 1 (costos + oferta)
  [0, 0, 0], // fila 2 (costos + oferta)
  [0, 0, 0]  // fila de demanda
]);

const solution = ref(null);

// Modales y formularios
const modals = reactive({ export: { visible: false }, import: { visible: false }, balance: { visible: false }, help: { visible: false } });
const forms = reactive({ export: { filename: '', error: '' }, import: { error: '' } });
const fileInput = ref(null);

// Índices de fila/columna ficticia (null = ninguno)
const dummyRowIndex = ref(null);
const dummyColIndex = ref(null);

function addRow() {
  const newRow = new Array(matrix.value[0].length).fill(0);
  matrix.value.splice(matrix.value.length - 1, 0, newRow);
}
function addColumn() { matrix.value.forEach(r => r.push(0)); }
function removeLastRow() { if (matrix.value.length > 2) matrix.value.splice(matrix.value.length - 2, 1); }
function removeLastColumn() { if (matrix.value[0].length > 2) matrix.value.forEach(r => r.pop()); }

function clearMatrix() {
  // Restablece la matriz al estado por defecto (2 filas de costos + fila de demanda)
  matrix.value = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  solution.value = null;
}

// Función para validar datos de entrada y extraer matriz de costos
function extractData() {
  const costs = matrix.value.slice(0, -1).map(r => r.slice(0, -1));
  const supply = matrix.value.slice(0, -1).map(r => Number(r[r.length - 1] || 0));
  const demand = matrix.value[matrix.value.length - 1].slice(0, -1).map(v => Number(v || 0));

  const totalSupply = supply.reduce((a, b) => a + b, 0);
  const totalDemand = demand.reduce((a, b) => a + b, 0);
  
  if (totalSupply !== totalDemand) { 
    alert('La oferta total debe ser igual a la demanda total'); 
    return null; 
  }

  return {
    costs: costs.map(r => r.map(c => Number(c || 0))),
    supply,
    demand
  };
}

// Función Northwest para minimización
function minimizeNorthwest() {
  const data = extractData();
  if (!data) return;

  const { costs, supply, demand } = data;
  const m = costs.length, n = costs[0].length;
  const allocation = Array.from({ length: m }, () => Array(n).fill(0));
  const remS = supply.slice();
  const remD = demand.slice();

  // Northwest Corner clásico para minimización
  let i = 0, j = 0;
  while (i < m && j < n) {
    const q = Math.min(remS[i], remD[j]);
    allocation[i][j] = q;
    remS[i] -= q;
    remD[j] -= q;

    // Seleccionar siguiente celda basado en disponibilidad
    if (remS[i] === 0) i++;
    if (remD[j] === 0) j++;
  }

  // Calcular costo total
  let totalCost = 0;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      totalCost += costs[r][c] * allocation[r][c];
    }
  }

  solution.value = { 
    allocation, 
    totalCost,
    debug: {
      type: 'minimization',
      costs,
      supply,
      demand
    }
  };
}

// Función Northwest para maximización
function maximizeNorthwest() {
  const data = extractData();
  if (!data) return;

  const { costs, supply, demand } = data;
  const m = costs.length, n = costs[0].length;
  const allocation = Array.from({ length: m }, () => Array(n).fill(0));
  const remS = supply.slice();
  const remD = demand.slice();

  // Para maximización, buscamos asignar los valores más altos primero
  // Ordenamos las celdas por costo descendente
  const cells = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      cells.push({ i, j, cost: costs[i][j] });
    }
  }
  cells.sort((a, b) => b.cost - a.cost);

  // Asignamos en orden de mayor a menor costo
  for (const cell of cells) {
    if (remS[cell.i] > 0 && remD[cell.j] > 0) {
      const q = Math.min(remS[cell.i], remD[cell.j]);
      allocation[cell.i][cell.j] = q;
      remS[cell.i] -= q;
      remD[cell.j] -= q;
    }
  }

  // Calcular costo total
  let totalCost = 0;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      totalCost += costs[r][c] * allocation[r][c];
    }
  }

  solution.value = { 
    allocation, 
    totalCost,
    debug: {
      type: 'maximization',
      costs,
      supply,
      demand,
      sortedCells: cells
    }
  };
}

// Función principal que decide qué algoritmo usar
function calculateNorthwest(mode) {
  if (mode === 'min') {
    minimizeNorthwest();
  } else {
    maximizeNorthwest();
  }
}

// Export / Import
function defaultExportName() {
  const d = new Date(); const pad = n => String(n).padStart(2, '0');
  return `northwest-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function openExportModal() { forms.export.filename = defaultExportName(); forms.export.error = ''; modals.export.visible = true; }
function closeExportModal() { modals.export.visible = false; }
function submitExport() {
  const filename = (forms.export.filename || defaultExportName()).trim();
  const name = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
  // incluir metadatos sobre fila/columna ficticia
  const payload = {
    matrix: matrix.value,
    solution: solution.value,
    _meta: { dummyRowIndex: dummyRowIndex.value, dummyColIndex: dummyColIndex.value }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  closeExportModal();
}
function openImportModal() { forms.import.error = ''; modals.import.visible = true; if (fileInput.value) fileInput.value.value = ''; }
function closeImportModal() { modals.import.visible = false; }
function onPickImportFile(e) {
  const f = e.target.files?.[0]; if (!f) return; const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (Array.isArray(data.matrix)) {
        matrix.value = data.matrix;
        solution.value = data.solution || null;
        // restaurar metadatos si vienen
        if (data._meta) {
          dummyRowIndex.value = typeof data._meta.dummyRowIndex === 'number' ? data._meta.dummyRowIndex : null;
          dummyColIndex.value = typeof data._meta.dummyColIndex === 'number' ? data._meta.dummyColIndex : null;
        } else {
          dummyRowIndex.value = null; dummyColIndex.value = null;
        }
        closeImportModal();
      } else forms.import.error = 'Formato inválido';
    } catch (err) { forms.import.error = 'JSON inválido'; }
  };
  r.onerror = () => { forms.import.error = 'Error leyendo archivo'; };
  r.readAsText(f);
}

function openHelpModal() { modals.help.visible = true; }
function closeHelpModal() { modals.help.visible = false; }

// --- Lógica de equilibrio automático ---
const balanceInfo = reactive({ totalSupply: 0, totalDemand: 0, diff: 0, mode: null, requestedMode: null });

function computeTotals() {
  const supply = matrix.value.slice(0, -1).map(r => Number(r[r.length - 1] || 0));
  const demand = matrix.value[matrix.value.length - 1].slice(0, -1).map(v => Number(v || 0));
  const totalSupply = supply.reduce((a, b) => a + b, 0);
  const totalDemand = demand.reduce((a, b) => a + b, 0);
  return { supply, demand, totalSupply, totalDemand };
}

function runWithBalance(mode) {
  const { totalSupply, totalDemand } = computeTotals();
  if (totalSupply === totalDemand) {
    // ya balanceado
    calculateNorthwest(mode);
    return;
  }
  // guardar info para el modal
  balanceInfo.totalSupply = totalSupply;
  balanceInfo.totalDemand = totalDemand;
  balanceInfo.diff = Math.abs(totalSupply - totalDemand);
  balanceInfo.mode = totalSupply > totalDemand ? 'supplyGreater' : 'demandGreater';
  balanceInfo.requestedMode = mode;
  modals.balance.visible = true;
}

function confirmBalance() {
  // aplicar balance y ejecutar
  const diff = balanceInfo.diff;
  if (balanceInfo.mode === 'supplyGreater') {
    // oferta > demanda -> agregar columna (demanda ficticia)
    balanceMatrix('addColumn', diff);
  } else {
    // demanda > oferta -> agregar fila (oferta ficticia)
    balanceMatrix('addRow', diff);
  }
  modals.balance.visible = false;
  // ejecutar el algoritmo solicitado
  calculateNorthwest(balanceInfo.requestedMode);
}

function balanceMatrix(kind, diff) {
  // kind: 'addColumn' o 'addRow'
  if (kind === 'addColumn') {
    // insertar una columna antes de la columna de 'oferta' (última)
    for (let r = 0; r < matrix.value.length; r++) {
      const row = matrix.value[r];
      const insertIndex = row.length - 1; // antes de la oferta
      if (r === matrix.value.length - 1) {
        // fila de demanda: setear la demanda de la nueva columna
        row.splice(insertIndex, 0, diff);
      } else {
        // filas de costo/oferta: costo 0 para la nueva columna
        row.splice(insertIndex, 0, 0);
      }
    }
    // registrar índice de columna ficticia
    dummyColIndex.value = matrix.value[0].length - 2; // nueva columna index (antes de oferta)
    dummyRowIndex.value = null;
  } else if (kind === 'addRow') {
    // insertar una fila antes de la fila de demanda (última)
    const cols = matrix.value[0].length;
    const newRow = new Array(cols).fill(0);
    // la última celda de la nueva fila es la oferta
    newRow[cols - 1] = diff;
    // insertar antes de la última fila (demanda)
    matrix.value.splice(matrix.value.length - 1, 0, newRow);
    dummyRowIndex.value = matrix.value.length - 2; // índice de la nueva fila
    dummyColIndex.value = null;
  }
}
</script>

<style scoped>
.matrix-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px); /* Restamos la altura del header */
  padding: 2rem;
}

.transport-matrix {
  border-collapse: separate;
  border-spacing: 0;
  background-color: var(--panel);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.transport-matrix th,
.transport-matrix td {
  padding: 0.75rem;
  border: 1px solid var(--panel-3);
  position: relative;
}

.transport-matrix th {
  background-color: var(--panel-2);
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.transport-matrix td:first-child {
  background-color: var(--panel-2);
  color: var(--muted);
  font-weight: 600;
}

.transport-matrix input {
  width: 70px;
  padding: 0.5rem;
  border: 1px solid var(--panel-3);
  background-color: var(--panel);
  color: var(--text);
  border-radius: 4px;
  text-align: center;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.transport-matrix input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.transport-matrix input:hover {
  border-color: var(--primary);
}

.solution-info {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: var(--panel-2);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
}

.solution-info h3 {
  color: var(--primary);
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.solution-matrix {
  margin-top: 1rem;
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
}

.solution-matrix td {
  padding: 0.75rem;
  border: 1px solid var(--panel-3);
  text-align: center;
  background-color: var(--panel);
}

.solution-matrix td .alloc-box {
  min-width: 48px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.solution-matrix td.allocated .alloc-box {
  background: rgba(59, 130, 246, 0.12);
  border: 2px solid rgba(59, 130, 246, 0.32);
  color: var(--primary);
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(59,130,246,0.06);
}

.solution-matrix td.allocated {
  padding: 0.6rem;
}

.solution-cell {
  background-color: rgba(59, 130, 246, 0.1) !important;
  border-color: var(--primary) !important;
  font-weight: bold;
}

.error {
  color: var(--danger);
  font-size: 0.9em;
  margin-top: 0.5rem;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.header-cell {
  background-color: var(--panel-2) !important;
  color: var(--muted) !important;
  font-weight: 600 !important;
}

.disabled-cell {
  background-color: var(--panel-3);
  color: var(--muted);
  text-align: center;
}

.dummy-cell {
  background-color: rgba(245, 158, 11, 0.06); /* amber-400 at low opacity */
  border-color: rgba(245, 158, 11, 0.25);
}
.dummy-header {
  position: relative;
}
.dummy-header::after {
  content: ' (fict.)';
  font-size: 0.7rem;
  color: var(--muted);
  margin-left: 6px;
}
</style>