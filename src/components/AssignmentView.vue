<template>
  <div class="app-layout">
    <header class="header">
      <h1>Módulo de Asignación (Grafo Bipartito)</h1>
    </header>

    <AssignmentSidebar
      class="sidebar"
      :mode="mode"
      @set-mode="setMode"
      @run-assignment="runAssignment"
      @clear-highlight="clearHighlight"
      @clear-all="openConfirmClear"
      @open-matrix="openMatrixModal"
      @export-graph="openExportModal"
      @import-graph="openImportModal"
      @open-help="openHelpGuide"
      @back-to-main="$emit('back-to-main')"
    />

    <main class="main">
      <AssignmentGraphCanvas
        ref="graphRef"
        :mode="mode"
        @request-add-node="onRequestAddNode"
        @request-add-edge="onRequestAddEdge"
        @request-edit-node="onRequestEditNode"
        @request-edit-edge="onRequestEditEdge"
        @request-delete="onRequestDelete"
      />
    </main>

    <!-- MODALES (simplificados para esta vista) -->
    <GraphModal :visible="modals.addEdge.visible" title="Agregar Costo de Arista" @cancel="closeAddEdge" @submit="submitAddEdge">
      <div class="row">
        <div>
          <label class="label">Costo (Peso)</label>
          <input v-model.number="forms.addEdge.weight" type="number" min="0" class="input" />
        </div>
      </div>
    </GraphModal>

    <GraphModal :visible="modals.editNode.visible" title="Editar Nodo" @cancel="closeEditNode" @submit="submitEditNode">
      <div class="row">
        <div>
          <label class="label">Nombre</label>
          <input v-model.trim="forms.editNode.label" class="input" />
        </div>
      </div>
    </GraphModal>

    <GraphModal :visible="modals.editEdge.visible" title="Editar Costo de Arista" @cancel="closeEditEdge" @submit="submitEditEdge">
       <div class="row">
        <div>
          <label class="label">Costo (Peso)</label>
          <input v-model.number="forms.editEdge.weight" type="number" min="0" class="input" />
        </div>
      </div>
    </GraphModal>

    <GraphModal :visible="modals.confirmClear.visible" title="Borrar Grafo de Asignación" @cancel="() => modals.confirmClear.visible = false" @submit="submitConfirmClear">
      <p>Se eliminarán todos los nodos y aristas de esta vista. ¿Continuar?</p>
    </GraphModal>

    <GraphModal :visible="modals.confirmDelete.visible" title="Eliminar Elemento" @cancel="() => modals.confirmDelete.visible = false" @submit="submitConfirmDelete">
      <p>¿Seguro que quieres eliminar este elemento?</p>
    </GraphModal>

    <!-- MODAL: Matriz de Costos para Asignación -->
    <GraphModal
      :visible="modals.costMatrix.visible"
      title="Matriz de Costos (Asignación)"
      :hide-submit="true"
      @cancel="closeCostMatrixModal"
    >
      <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
        Esta es la matriz de costos generada a partir del grafo bipartito. Las filas representan el conjunto U y las columnas el conjunto V.
      </p>
      <div class="matrix-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner">U \ V</th>
              <th v-for="vNode in costMatrix.V" :key="vNode.id" class="data-col">
                {{ vNode.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in costMatrix.matrix" :key="i">
              <th class="row-header">{{ costMatrix.U[i]?.label }}</th>
              <td v-for="(val, j) in row" :key="j">{{ formatMatrixValue(val) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </GraphModal>

    <!-- MODAL: Exportar grafo -->
    <GraphModal
      :visible="modals.exportGraph.visible"
      title="Exportar Grafo Bipartito"
      submit-text="Descargar"
      @cancel="closeExportModal"
      @submit="submitExport"
    >
      <div style="grid-column:1 / -1;width:100%;">
        <label class="label">Nombre del archivo</label>
        <input v-model.trim="forms.exportGraph.filename" class="input" />
      </div>
    </GraphModal>

    <!-- MODAL: Importar grafo -->
    <GraphModal
      :visible="modals.importGraph.visible"
      title="Importar Grafo Bipartito (.json)"
      submit-text="Importar"
      @cancel="closeImportModal"
      @submit="submitImport"
    >
      <div style="grid-column:1 / -1;width:100%;">
        <label class="label">Selecciona archivo JSON</label>
        <input type="file" accept="application/json" class="input" @change="onPickImportFile" />
        <div v-if="forms.importGraph.error" class="error-text" style="margin-top:6px">
          {{ forms.importGraph.error }}
        </div>
        <div v-if="forms.importGraph.parsed" style="margin-top:10px;color:var(--muted)">
          <div>Archivo: <span class="kbd">{{ forms.importGraph.fileName }}</span></div>
          <div>Nodos: <strong>{{ forms.importGraph.preview.nodes }}</strong> — Aristas: <strong>{{ forms.importGraph.preview.edges }}</strong></div>
          <small>Se reemplazará el grafo actual.</small>
        </div>
      </div>
    </GraphModal>

    <!-- Modal para los pasos del algoritmo -->
    <GraphModal
      :visible="modals.assignmentSteps.visible"
      :title="`Asignación: ${assignmentSteps.currentStep?.title || ''}`"
      :hide-submit="true"
      @cancel="closeAssignmentSteps"
      width="auto"
    >
      <p>{{ assignmentSteps.currentStep?.description }}</p>

      <!-- Mostrar la matriz de costos en el paso final -->
      <div v-if="assignmentSteps.currentStep?.isFinal && assignmentSteps.finalResult?.assignment" class="assignment-result-vector">
        <strong>Asignación Óptima:</strong>
        <ul>
          <li v-for="(item, index) in assignmentSteps.finalResult.assignment" :key="index">
            {{ getNodeLabel(item.u) }} → {{ getNodeLabel(item.v) }} (Costo: <strong>{{ item.cost }}</strong>)
          </li>
        </ul>
        <strong class="total-cost">Costo Total: {{ assignmentSteps.finalResult.duration }}</strong>
      </div>

      <div class="matrix-wrap" style="margin-top: 1rem;">
        <table class="matrix-table assignment-matrix">
          <thead>
            <tr>
              <th class="corner">U \ V</th>
              <th v-for="(nodeId, j) in assignmentSteps.sets.V" :key="j" class="data-col">{{ getNodeLabel(nodeId) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in assignmentSteps.currentStep?.matrix" :key="i" :class="{ 'covered-row': assignmentSteps.currentStep?.coveredRows?.includes(i) }">
              <th class="row-header">{{ getNodeLabel(assignmentSteps.sets.U[i]) }}</th>
              <td v-for="(val, j) in row" :key="j" :class="{ 'star': isStarred(i, j), 'covered-col': assignmentSteps.currentStep?.coveredCols?.includes(j) }">{{ formatMatrixValue(val) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="assignment-controls">
        <button class="button" @click="prevStep" :disabled="assignmentSteps.stepIndex === 0">Anterior</button>
        <span class="step-counter">Paso {{ assignmentSteps.stepIndex + 1 }} / {{ assignmentSteps.steps.length }}</span>
        <button class="button" @click="nextStep" :disabled="assignmentSteps.stepIndex >= assignmentSteps.steps.length - 1">Siguiente</button>
        <button v-if="assignmentSteps.currentStep?.isFinal" class="button" @click="finishAssignment">Finalizar y Resaltar</button>
      </div>
    </GraphModal>

    <!-- VENTANA MODAL PARA LA GUÍA DE AYUDA -->
    <div v-if="isHelpVisible" class="guide-modal-overlay" @click.self="closeHelpGuide">
      <div class="guide-modal-content">
        <button @click="closeHelpGuide" class="close-guide-button">&times;</button>
        <h3><i class="fas fa-book-open"></i> Guía de Funcionamiento: Asignación</h3>
        <p>
          Esta sección resuelve el <strong>Problema de Asignación</strong> usando el Algoritmo Húngaro.
        </p>
        <ul>
          <li><strong>Requisito:</strong> El grafo debe ser <strong>bipartito</strong>. Esto significa que los nodos se pueden dividir en dos conjuntos (U y V) donde las aristas solo conectan un nodo de U con uno de V.</li>
          <li><strong>Funcionamiento:</strong> El algoritmo construye una matriz de costos a partir de los pesos de las aristas. Luego, busca el conjunto de emparejamientos (asignaciones) que minimice (o maximice) el costo total.</li>
          <li><strong>Uso:</strong> Define tu grafo bipartito en esta vista, asigna costos a las aristas y luego ejecuta el algoritmo desde la barra lateral.</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
/* global defineEmits */
import { reactive, ref } from 'vue';
import AssignmentGraphCanvas from './AssignmentGraphCanvas.vue';
import GraphModal from './GraphModal.vue';
import AssignmentSidebar from './AssignmentSidebar.vue';
import { ASSIGNMENT_MODES as MODES } from '../constants/assignmentModes';
import { computeAssignment } from '../utils/assignment';

defineEmits(['back-to-main']);

// --- ESTADO PARA LA NUEVA GUÍA DE AYUDA ---
const isHelpVisible = ref(false);
const openHelpGuide = () => { isHelpVisible.value = true; };
const closeHelpGuide = () => { isHelpVisible.value = false; };
// -----------------------------------------

const graphRef = ref(null);
const mode = ref(MODES.ADD_NODE_U); // Modo inicial

const modals = reactive({
  addEdge: { visible: false },
  editNode: { visible: false },
  editEdge: { visible: false },
  confirmClear: { visible: false },
  confirmDelete: { visible: false },
  costMatrix: { visible: false },
  exportGraph: { visible: false },
  importGraph: { visible: false },
  assignmentSteps: { visible: false },
});

const forms = reactive({
  addEdge: { sourceId: '', targetId: '', weight: 1 },
  editNode: { id: '', label: '' },
  editEdge: { id: '', weight: 1 },
  delete: { id: '' },
  exportGraph: { filename: '', error: '' },
  importGraph: { parsed: null, fileName: '', error: '', preview: { nodes: 0, edges: 0 } }
});

const costMatrix = reactive({ U: [], V: [], matrix: [] });


const assignmentSteps = reactive({
  steps: [], stepIndex: 0, currentStep: null, finalResult: null, sets: { U: [], V: [] },
});

function setMode(next) {
  mode.value = (mode.value === next) ? MODES.NONE : next;
}

function onRequestAddNode({ position }) {
  const isSetU = mode.value === MODES.ADD_NODE_U;
  const label = `${isSetU ? 'U' : 'V'}${graphRef.value.getGraphData().nodes.filter(n => n.data.isSetU === isSetU).length + 1}`;
  const color = isSetU ? '#66ccff' : '#ffab73';
  graphRef.value.addNode(label, position, color, { isSetU: isSetU });
}

function onRequestAddEdge({ sourceId, targetId }) {
  const { nodes, edges } = graphRef.value.getGraphData();
  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);

  if (sourceNode.data.isSetU === targetNode.data.isSetU) {
    alert('Error: Solo se pueden crear aristas entre nodos de diferentes conjuntos (U y V).');
    graphRef.value.resetEdgeSelection();
    return;
  }

  // Verificar si ya existe una arista entre estos nodos
  const existingEdge = edges.find(e =>
    (e.source === sourceId && e.target === targetId) ||
    (e.source === targetId && e.target === sourceId)
  );

  if (existingEdge) {
    // Si ya existe, abrir el modal de edición en lugar de creación
    onRequestEditEdge(existingEdge);
    graphRef.value.resetEdgeSelection();
  } else {
    // Si no existe, proceder a crear una nueva
    forms.addEdge.sourceId = sourceId;
    forms.addEdge.targetId = targetId;
    forms.addEdge.weight = 1;
    modals.addEdge.visible = true;
  }
}

function closeAddEdge() { modals.addEdge.visible = false; graphRef.value.resetEdgeSelection(); }
function submitAddEdge() {
  graphRef.value.addEdge({ ...forms.addEdge, directed: false });
  closeAddEdge();
}

function onRequestEditNode({ id, label }) { forms.editNode.id = id; forms.editNode.label = label; modals.editNode.visible = true; }
function closeEditNode() { modals.editNode.visible = false; }
function submitEditNode() { graphRef.value.updateNode(forms.editNode); closeEditNode(); }

function onRequestEditEdge({ id, weight }) { forms.editEdge.id = id; forms.editEdge.weight = weight; modals.editEdge.visible = true; }
function closeEditEdge() { modals.editEdge.visible = false; }
function submitEditEdge() { graphRef.value.updateEdge({ ...forms.editEdge, directed: false }); closeEditEdge(); }

function onRequestDelete({ id }) { forms.delete.id = id; modals.confirmDelete.visible = true; }
function submitConfirmDelete() { graphRef.value.deleteElement(forms.delete.id); modals.confirmDelete.visible = false; }

function openConfirmClear() { modals.confirmClear.visible = true; }
function submitConfirmClear() { graphRef.value.clearAll(); modals.confirmClear.visible = false; }

function clearHighlight() { graphRef.value.clearHighlight(); }

// Matriz, Exportar, Importar
function defaultExportName() {
  const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
  return `grafo-bipartito-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}

function openMatrixModal() {
  const { nodes, edges } = graphRef.value.getGraphData();
  const nodesU = nodes.filter(n => n.data.isSetU).sort((a, b) => a.label.localeCompare(b.label));
  const nodesV = nodes.filter(n => !n.data.isSetU).sort((a, b) => a.label.localeCompare(b.label));

  if (nodesU.length === 0 || nodesV.length === 0) {
    alert("Se necesitan nodos en ambos conjuntos (U y V) para generar la matriz de costos.");
    return;
  }

  costMatrix.U = nodesU;
  costMatrix.V = nodesV;

  const matrix = Array.from({ length: nodesU.length }, () => Array(nodesV.length).fill(Infinity));

  for (let i = 0; i < nodesU.length; i++) {
    for (let j = 0; j < nodesV.length; j++) {
      const uNodeId = nodesU[i].id;
      const vNodeId = nodesV[j].id;
      const edge = edges.find(e =>
        (e.source === uNodeId && e.target === vNodeId) ||
        (e.source === vNodeId && e.target === uNodeId)
      );
      if (edge) {
        matrix[i][j] = edge.weight;
      }
    }
  }
  costMatrix.matrix = matrix;
  modals.costMatrix.visible = true;
}
function closeCostMatrixModal() {
  modals.costMatrix.visible = false;
}

function openExportModal() { forms.exportGraph.filename = defaultExportName(); modals.exportGraph.visible = true; }
function closeExportModal() { modals.exportGraph.visible = false; }
function submitExport() {
  const filename = (forms.exportGraph.filename || defaultExportName()) + '.json';
  const data = graphRef.value.getGraphData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeExportModal();
}

function openImportModal() {
  forms.importGraph.parsed = null; forms.importGraph.fileName = '';
  forms.importGraph.error = ''; forms.importGraph.preview = { nodes: 0, edges: 0 };
  modals.importGraph.visible = true;
}
function closeImportModal() { modals.importGraph.visible = false; }
function onPickImportFile(e) {
  forms.importGraph.error = '';
  const file = e.target.files?.[0]; if (!file) return;
  forms.importGraph.fileName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(String(reader.result || '{}'));
      if (!json || !Array.isArray(json.nodes) || !Array.isArray(json.edges)) throw new Error('Formato inválido');
      forms.importGraph.parsed = json;
      forms.importGraph.preview = { nodes: json.nodes.length, edges: json.edges.length };
    } catch (err) {
      forms.importGraph.error = 'Archivo JSON inválido.';
    }
  };
  reader.readAsText(file);
}
function submitImport() {
  if (!forms.importGraph.parsed) { forms.importGraph.error = 'Selecciona un archivo.'; return; }
  graphRef.value.loadGraphData(forms.importGraph.parsed, { replace: true });
  closeImportModal();
}

// Lógica del algoritmo de asignación
function runAssignment(mode) {
  const data = graphRef.value.getGraphData();
  const result = computeAssignment(data.nodes, data.edges, mode);
  if (!result.ok) { alert(result.message); return; }

  assignmentSteps.steps = result.steps;
  assignmentSteps.stepIndex = 0;
  assignmentSteps.currentStep = result.steps[0];
  assignmentSteps.finalResult = result;
  assignmentSteps.sets = result.bipartiteSets;
  modals.assignmentSteps.visible = true;
}

function getNodeLabel(nodeId) {
  const data = graphRef.value?.getGraphData();
  if (!data) return nodeId;
  return data.nodes.find(n => n.id === nodeId)?.label || nodeId;
}
function closeAssignmentSteps() { modals.assignmentSteps.visible = false; }
function nextStep() { if (assignmentSteps.stepIndex < assignmentSteps.steps.length - 1) { assignmentSteps.stepIndex++; assignmentSteps.currentStep = assignmentSteps.steps[assignmentSteps.stepIndex]; } }
function prevStep() { if (assignmentSteps.stepIndex > 0) { assignmentSteps.stepIndex--; assignmentSteps.currentStep = assignmentSteps.steps[assignmentSteps.stepIndex]; } }
function isStarred(row, col) { return assignmentSteps.currentStep?.stars?.some(s => s.row === row && s.col === col); }
function formatMatrixValue(val) { return Number.isFinite(val) ? val : '∞'; }
function finishAssignment() { closeAssignmentSteps(); graphRef.value.highlightAssignment(assignmentSteps.finalResult); }
</script>

<style>
.assignment-matrix .star {
  font-weight: bold;
  color: var(--primary);
  outline: 1px solid var(--primary);
}
.assignment-matrix .covered-row {
  background-color: #ffffff10;
}
.assignment-matrix .covered-col {
  background-color: #ffffff10;
}
.assignment-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
}
.step-counter {
  font-size: 0.9rem; color: var(--muted);
}
.matrix-result { margin-bottom: 1rem; }
.matrix-result pre { font-size: 0.8rem; white-space: pre-wrap; word-break: break-word; background-color: #00000030; padding: 8px; border-radius: 4px; }

.assignment-result-vector {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #00000030;
  border-radius: 8px;
}
.assignment-result-vector ul { list-style: none; padding-left: 0; }
.assignment-result-vector li { margin-bottom: 4px; }
.total-cost { display: block; margin-top: 1rem; border-top: 1px solid #4a5568; padding-top: 0.5rem; }

.guide-modal-content {
  background-color: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  position: relative;
  color: #333;
}

.close-guide-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #888;
}
</style>