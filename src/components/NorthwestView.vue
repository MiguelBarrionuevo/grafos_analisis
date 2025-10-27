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
        
        <button class="button" @click="calculateNorthwest('min')">📉 Minimización</button>
        <button class="button" @click="calculateNorthwest('max')">📈 Maximización</button>
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
                <th>Origen {{ colIndex + 1 }}</th>
              </template>
              <th>Oferta</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(row, rowIndex) in matrix.slice(0, -1)" :key="'row-' + rowIndex">
              <tr>
                <td>Destino {{ rowIndex + 1 }}</td>
                <template v-for="(cell, colIndex) in row" :key="'cell-' + rowIndex + '-' + colIndex">
                  <td>
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
                <td>
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
                <td v-for="(value, j) in row" :key="'sol-' + i + '-' + j">
                  {{ value || '-' }}
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
const modals = reactive({ export: { visible: false }, import: { visible: false } });
const forms = reactive({ export: { filename: '', error: '' }, import: { error: '' } });
const fileInput = ref(null);

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
  const blob = new Blob([JSON.stringify({ matrix: matrix.value, solution: solution.value }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  closeExportModal();
}
function openImportModal() { forms.import.error = ''; modals.import.visible = true; if (fileInput.value) fileInput.value.value = ''; }
function closeImportModal() { modals.import.visible = false; }
function onPickImportFile(e) {
  const f = e.target.files?.[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { try { const data = JSON.parse(r.result); if (Array.isArray(data.matrix)) { matrix.value = data.matrix; solution.value = data.solution || null; closeImportModal(); } else forms.import.error = 'Formato inválido'; } catch (err) { forms.import.error = 'JSON inválido'; } };
  r.onerror = () => { forms.import.error = 'Error leyendo archivo'; };
  r.readAsText(f);
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
</style>