<template>
  <div v-if="currentView === 'main'" class="app-layout">
    <header class="header">
      <h1>Analisis de Algoritmos - Lagartos Del Parque 🦎</h1>
    </header>

    <GraphSidebar
      @run-assignment="switchToAssignmentView"
      class="sidebar"
      :mode="mode"
      :johnson-disabled="johnsonDisabled"
      @set-mode="setMode"
      @confirm-clear="openConfirmClear"
      @open-matrix="openMatrixModal"
      @export-graph="openExportModal"
      @import-graph="openImportModal"
      @open-help="openHelp"
      @run-johnson="openJohnsonChoice"
      @clear-highlight="clearHighlight"
      @toggle-johnson-mode="setJohnsonMode"
      @open-build-tree="switchToBinaryTreeView"
      @open-reconstruct-tree="switchToReconstructTreeView"
    />

    <main class="main">
      <GraphCanvas
        ref="graphRef"
        :mode="mode"
        @request-add-node="onRequestAddNode"
        @request-add-edge="onRequestAddEdge"
        @request-edit-node="onRequestEditNode"
        @request-edit-edge="onRequestEditEdge"
        @request-delete="onRequestDelete"
      />
    </main>

    <!-- MODAL: Agregar nodo -->
    <GraphModal
      :visible="modals.addNode.visible"
      title="Agregar nodo"
      submit-text="Crear"
      @cancel="closeAddNode"
      @submit="submitAddNode"
    >
      <div class="row">
        <div>
          <label class="label">Nombre del nodo</label>
          <input v-model.trim="forms.addNode.label" class="input" placeholder="Ej: A, Persona 1, etc." />
        </div>
        <div>
          <label class="label">Color</label>
          <input v-model="forms.addNode.color" type="color" class="input color-input" />
        </div>
      </div>
    </GraphModal>

    <!-- MODAL: Agregar arista (VALIDA: peso ≥ 0) -->
    <GraphModal
      :visible="modals.addEdge.visible"
      title="Agregar arista"
      submit-text="Crear"
      @cancel="closeAddEdge"
      @submit="submitAddEdge"
    >
      <div class="row">
        <div>
          <label class="label">Peso</label>
          <input
            v-model.number="forms.addEdge.weight"
            type="number"
            step="any"
            min="0"
            class="input"
            :class="{ error: !!forms.addEdge.error }"
            placeholder="Ej: 0, 1, 2.5..."
            @input="forms.addEdge.error = ''"
            aria-invalid="true"
          />
          <div v-if="forms.addEdge.error" class="error-text">{{ forms.addEdge.error }}</div>
        </div>
        <div style="display:flex;align-items:flex-end;" >
          <label class="checkbox" :hidden="johnsonStrict">
            <input type="checkbox" v-model="forms.addEdge.directed" :hidden="johnsonStrict"/>
            <h5 :hidden="johnsonStrict">¿Dirigida?</h5>
          </label>
        </div>
      </div>
      <div style="margin-top:8px;color:var(--muted)">
        Origen: <span class="kbd">{{ forms.addEdge.sourceId }}</span> → Destino: <span class="kbd">{{ forms.addEdge.targetId }}</span>
      </div>
    </GraphModal>

    <!-- MODAL: Editar nodo -->
    <GraphModal
      :visible="modals.editNode.visible"
      title="Editar nodo"
      submit-text="Guardar"
      @cancel="closeEditNode"
      @submit="submitEditNode"
    >
      <div class="row">
        <div>
          <label class="label">Nombre</label>
          <input v-model.trim="forms.editNode.label" class="input" />
        </div>
        <div>
          <label class="label">Color</label>
          <input v-model="forms.editNode.color" type="color" class="input color-input" />
        </div>
      </div>
      <div style="margin-top:8px;color:var(--muted)">
        ID: <span class="kbd">{{ forms.editNode.id }}</span>
      </div>
    </GraphModal>

    <!-- MODAL: Editar arista (VALIDA: peso ≥ 0) -->
    <GraphModal
      :visible="modals.editEdge.visible"
      title="Editar arista"
      submit-text="Guardar"
      @cancel="closeEditEdge"
      @submit="submitEditEdge"
    >
      <div class="row">
        <div>
          <label class="label">Peso</label>
          <input
            v-model.number="forms.editEdge.weight"
            type="number"
            step="any"
            min="0"
            class="input"
            :class="{ error: !!forms.editEdge.error }"
            @input="forms.editEdge.error = ''"
            aria-invalid="true"
          />
          <div v-if="forms.editEdge.error" class="error-text">{{ forms.editEdge.error }}</div>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <label class="checkbox">
            <input type="checkbox" v-model="forms.editEdge.directed" :disabled="johnsonStrict"/>
            ¿Dirigida?
          </label>
        </div>
      </div>
      <div style="margin-top:8px;color:var(--muted)">
        ID: <span class="kbd">{{ forms.editEdge.id }}</span>
      </div>
    </GraphModal>

    <!-- MODAL: Matriz de adyacencia (solo botón Cancelar) -->
    <GraphModal
      :visible="modals.matrix.visible"
      title="Matriz de adyacencia"
      :hide-submit="true"
      @cancel="closeMatrixModal"
    >
      <div class="row" style="align-items:center;gap:12px;flex-wrap:wrap">
        <label class="checkbox">
          <input type="checkbox" v-model="adjOptions.weighted" @change="recomputeAdjacency" />
          Usar pesos
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="adjOptions.sortByLabel" @change="recomputeAdjacency" />
          Ordenar por nombre
        </label>
        <button class="button small" @click="copyAdjacencyCSV">Copiar CSV</button>
      </div>

      <div class="matrix-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner"></th>
              <th v-for="n in adjacency.nodes" :key="n.id" class="data-col">
                {{ n.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row,i) in adjacency.matrix" :key="i">
              <th class="row-header">{{ adjacency.nodes[i]?.label }}</th>
              <td v-for="(val,j) in row" :key="j">{{ val }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </GraphModal>

    <!-- MODAL: Exportar grafo (pide nombre; el campo ocupa ambas columnas) -->
    <GraphModal
      :visible="modals.exportGraph.visible"
      title="Exportar grafo"
      submit-text="Descargar"
      @cancel="closeExportModal"
      @submit="submitExport"
    >
      <div class="row" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        <div style="grid-column:1 / -1;width:100%;">
          <label class="label">Nombre del archivo</label>
          <input
            v-model.trim="forms.exportGraph.filename"
            class="input"
            placeholder="Ej: mi_grafo.json"
            @input="forms.exportGraph.error = ''"
          />
          <small style="display:block;margin-top:6px;color:var(--muted)">
            Se descargará como <code>.json</code>. Si no escribes la extensión, la añadiremos.
          </small>
          <div v-if="forms.exportGraph.error" class="error-text" style="margin-top:6px">
            {{ forms.exportGraph.error }}
          </div>
        </div>
      </div>
    </GraphModal>

    <!-- MODAL: Importar grafo (el campo ocupa ambas columnas) -->
    <GraphModal
      :visible="modals.importGraph.visible"
      title="Importar grafo (.json)"
      submit-text="Importar"
      @cancel="closeImportModal"
      @submit="submitImport"
    >
      <div class="row" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
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
      </div>
    </GraphModal>

    <!-- MODAL: Ayuda (solo botón Cancelar) -->
    <GraphModal
      :visible="modals.help.visible"
      title="Ayuda"
      :hide-submit="true"
      @cancel="closeHelp"
    >
      <div style="display:flex;flex-direction:column;gap:10px;line-height:1.5">
        <h3 style="margin:0">Guía rápida</h3>
        <ul style="margin:0 0 6px 18px">
          <li><strong>Agregar nodo:</strong> elige “Agregar nodo” y haz clic en la pizarra. Completa nombre y color.</li>
          <li><strong>Agregar arista:</strong> elige “Agregar arista”, clic en <em>origen</em> y luego en <em>destino</em>. Ingresa peso (≥ 0) y si es dirigida.</li>
          <li><strong>Editar:</strong> elige “Editar” y <strong>doble clic</strong> en un nodo/arista para cambiar sus datos.</li>
          <li><strong>Borrar:</strong> elige “Borrar” y clic en el elemento. Confirma para eliminar.</li>
        </ul>
        <h3 style="margin:10px 0 0 0">Herramientas</h3>
        <ul style="margin:0 0 6px 18px">
          <li><strong>Matriz de adyacencia:</strong> muestra la matriz (con/sin pesos), permite copiar CSV.</li>
          <li><strong>Exportar:</strong> guarda el grafo como <code>.json</code>.</li>
          <li><strong>Importar:</strong> carga un <code>.json</code> con la estructura <code>{ nodes:[], edges:[] }</code> y reemplaza el grafo.</li>
        </ul>
        <h3 style="margin:10px 0 0 0">Navegación</h3>
        <ul style="margin:0 0 6px 18px">
          <li><strong>Zoom:</strong> rueda del mouse.</li>
          <li><strong>Pan:</strong> arrastra sobre el fondo para mover la vista.</li>
        </ul>
        <small style="color:var(--muted)">
          Si tienes dudas o sugerencias, visita el <a href="www.github.com/miguel-barrionuevo/vue-graph-editor" target="_blank" rel="noopener">repositorio en GitHub</a>.
        </small>
      </div>
    </GraphModal>

    <!-- MODAL: Confirmar borrado -->
    <GraphModal
      :visible="modals.confirmDelete.visible"
      :title="confirmDeleteTitle"
      submit-text="Eliminar"
      @cancel="closeConfirmDelete"
      @submit="submitConfirmDelete"
    >
      <p>¿Seguro que quieres eliminar este {{ forms.delete.kind === 'node' ? 'nodo' : 'arista' }}?</p>
      <div style="margin-top:8px;color:var(--muted)">
        ID: <span class="kbd">{{ forms.delete.id }}</span>
      </div>
    </GraphModal>

    <!-- MODAL: Borrar todo -->
    <GraphModal
      :visible="modals.confirmClear.visible"
      title="Borrar todo"
      submit-text="Limpiar"
      @cancel="closeConfirmClear"
      @submit="submitConfirmClear"
    >
      <p>Se eliminarán <strong>todos</strong> los nodos y aristas. ¿Deseas continuar?</p>
    </GraphModal>


    <!-- MODAL: Elegir criterio Johnson -->
    <GraphModal
      :visible="modals.johnsonChoice.visible"
      title="Johnson — Selecciona el criterio"
      :hide-submit="true"
      @cancel="() => (modals.johnsonChoice.visible = false)"
    >
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
        <button
          class="button"
          @click="() => { modals.johnsonChoice.visible = false; runJohnson('max'); }"
        >
          ⬆️ Maximización (Ruta crítica)
        </button>
        <button
          class="button"
          @click="() => { modals.johnsonChoice.visible = false; runJohnson('min'); }"
        >
          ⬇️ Minimización (Ruta mínima)
        </button>
      </div>

      <div style="margin-top:10px; color:var(--muted); font-size:13px; line-height:1.5;">
        <p><strong>Guía rápida de uso:</strong></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><strong>Maximización</strong>: Calcula la <em>ruta crítica</em> (camino de mayor duración). 
            En las aristas se mostrará la <code>h=holgura</code> (tiempo libre). 
            Una holgura <code>0</code> significa que esa arista es crítica.
          </li>
          <li><strong>Minimización</strong>: Calcula la <em>ruta mínima</em> (camino de menor duración). 
            En las aristas se mostrarán siempre sus <em>pesos originales</em>.</li>
        </ul>

        <p><strong>Condiciones necesarias:</strong></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>✔️ El grafo debe ser <strong>dirigido</strong> (todas las aristas con flecha).</li>
          <li>✔️ No se permiten <strong>ciclos</strong> (debe ser un DAG).</li>
          <li>✔️ Los <strong>pesos</strong> deben ser números <em>mayores o iguales a 0</em>.</li>
        </ul>

        <p><em>Nota:</em> Si alguna de estas condiciones no se cumple, el cálculo no será válido y el programa te lo indicará.</p>
      </div>
    </GraphModal>


  </div>
  <!-- Vista dedicada para el algoritmo de Asignación -->
  <AssignmentView v-else-if="currentView === 'assignment'" @back-to-main="switchToMainView" />

  <!-- Vista dedicada para Árboles Binarios -->
  <BinaryTreeView v-else-if="currentView === 'binary-tree'" @back-to-main="switchToMainView" />

  <!-- Vista dedicada para Reconstruir Árboles -->
  <ReconstructTreeView v-else-if="currentView === 'reconstruct-tree'" @back-to-main="switchToMainView" />
</template>

<script setup>
// @ts-nocheck
import { reactive, ref, computed, defineAsyncComponent } from 'vue';
import GraphSidebar from './components/GraphSidebar.vue';
import GraphCanvas from './components/GraphCanvas.vue';
import GraphModal from './components/GraphModal.vue';
import { MODES } from './constants/modes';
import { computeCPM, computeShortestPathDAG } from './utils/cpm';
const AssignmentView = defineAsyncComponent(() =>
  import('./components/AssignmentView.vue')
);
const BinaryTreeView = defineAsyncComponent(() =>
  import('./components/BinaryTreeView.vue')
);
const ReconstructTreeView = defineAsyncComponent(() =>
  import('./components/ReconstructTreeView.vue')
);

const graphRef = ref(null);
const mode = ref(MODES.ADD_NODE);
// Control de vistas (main o assignment)
const currentView = ref('main');
const switchToAssignmentView = () => { currentView.value = 'assignment'; };
const switchToBinaryTreeView = () => { currentView.value = 'binary-tree'; };
const switchToReconstructTreeView = () => { currentView.value = 'reconstruct-tree'; };
const switchToMainView = () => { currentView.value = 'main'; };

// === Toggle de modo Johnson estricto ===
const johnsonStrict = ref(false);
function setJohnsonMode(val) {
  johnsonStrict.value = !!val;
  // Notifica al canvas para que active/desactive reglas estrictas
  graphRef.value?.setJohnsonStrictMode?.(johnsonStrict.value);
}

/** Toggle de modo: si vuelves a hacer clic en el mismo, pasa a NONE */
function setMode(next) {
  mode.value = (mode.value === next) ? MODES.NONE : next;
}

const modals = reactive({
  addNode: { visible: false },
  addEdge: { visible: false },
  editNode: { visible: false },
  editEdge: { visible: false },
  confirmDelete: { visible: false },
  confirmClear: { visible: false },
  matrix: { visible: false },
  exportGraph: { visible: false },
  importGraph: { visible: false },
  help: { visible: false },
  johnson: { visible: false },
  johnsonChoice: { visible: false },
});

const forms = reactive({
  addNode: { label: '', color: '#66ccff' },
  addEdge: { sourceId: '', targetId: '', weight: 1, directed: true, error: '' },
  editNode: { id: '', label: '', color: '#66ccff' },
  editEdge: { id: '', weight: 1, directed: true, error: '' },
  delete: { id: '', kind: 'node' },
  exportGraph: { filename: defaultExportName(), error: '' },
  importGraph: { parsed: null, fileName: '', error: '', preview: { nodes: 0, edges: 0 } }
});

const pendingNodePos = ref(null);
const confirmDeleteTitle = computed(() =>
  forms.delete.kind === 'node' ? 'Eliminar nodo' : 'Eliminar arista'
);

/* ===== Matriz de adyacencia ===== */
const adjacency = reactive({ nodes: [], matrix: [] });
const adjOptions = reactive({ weighted: true, sortByLabel: true });

function openMatrixModal() { recomputeAdjacency(); modals.matrix.visible = true; }
function closeMatrixModal() { modals.matrix.visible = false; }
function recomputeAdjacency() {
  const res = graphRef.value.getAdjacency({ weighted: adjOptions.weighted, sortByLabel: adjOptions.sortByLabel });
  adjacency.nodes = res.nodes;
  adjacency.matrix = res.matrix;
}
function copyAdjacencyCSV() {
  const header = [''].concat(adjacency.nodes.map(n => n.label));
  const rows = adjacency.matrix.map((row, i) => [adjacency.nodes[i]?.label, ...row].join(','));
  const csv = [header.join(','), ...rows].join('\n');
  navigator.clipboard?.writeText(csv);
}

/* ===== Validación de peso ===== */
function isValidWeight(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/* ===== Eventos desde el canvas ===== */
function onRequestAddNode({ position }) {
  pendingNodePos.value = position;
  forms.addNode.label = '';
  forms.addNode.color = '#66ccff';
  modals.addNode.visible = true;
}
function onRequestAddEdge({ sourceId, targetId }) {
  forms.addEdge.sourceId = sourceId;
  forms.addEdge.targetId = targetId;
  forms.addEdge.weight = 1;
  forms.addEdge.directed = true;
  forms.addEdge.error = '';
  modals.addEdge.visible = true;
}
function onRequestEditNode({ id, label, color }) {
  forms.editNode.id = id;
  forms.editNode.label = label;
  forms.editNode.color = color || '#66ccff';
  modals.editNode.visible = true;
}
function onRequestEditEdge({ id, weight, directed }) {
  forms.editEdge.id = id;
  forms.editEdge.weight = Number.isFinite(Number(weight)) ? Number(weight) : 1;
  forms.editEdge.directed = !!directed;
  forms.editEdge.error = '';
  modals.editEdge.visible = true;
}
function onRequestDelete({ id, kind }) {
  forms.delete.id = id;
  forms.delete.kind = kind;
  modals.confirmDelete.visible = true;
}

/* ===== Acciones modales ===== */
function closeAddNode() { modals.addNode.visible = false; pendingNodePos.value = null; }
function submitAddNode() {
  const label = forms.addNode.label?.trim() || '';
  graphRef.value.addNode(label || undefined, pendingNodePos.value, forms.addNode.color);
  closeAddNode();
}
function closeAddEdge() { modals.addEdge.visible = false; graphRef.value.resetEdgeSelection(); }
function submitAddEdge() {
  if (!isValidWeight(forms.addEdge.weight)) { forms.addEdge.error = 'El peso debe ser un número mayor o igual a 0.'; return; }
  graphRef.value.addEdge({
    sourceId: forms.addEdge.sourceId,
    targetId: forms.addEdge.targetId,
    weight: Number(forms.addEdge.weight),
    directed: forms.addEdge.directed
  });
  closeAddEdge();
}
function closeEditNode() { modals.editNode.visible = false; }
function submitEditNode() {
  graphRef.value.updateNode({
    id: forms.editNode.id,
    label: forms.editNode.label,
    color: forms.editNode.color
  });
  closeEditNode();
}
function closeEditEdge() { modals.editEdge.visible = false; }
function submitEditEdge() {
  if (!isValidWeight(forms.editEdge.weight)) { forms.editEdge.error = 'El peso debe ser un número mayor o igual a 0.'; return; }
  graphRef.value.updateEdge({
    id: forms.editEdge.id,
    weight: Number(forms.editEdge.weight),
    directed: forms.editEdge.directed
  });
  closeEditEdge();
}
function closeConfirmDelete() { modals.confirmDelete.visible = false; }
function submitConfirmDelete() { graphRef.value.deleteElement(forms.delete.id); closeConfirmDelete(); }

/* ===== Borrar todo ===== */
function openConfirmClear() { modals.confirmClear.visible = true; }
function closeConfirmClear() { modals.confirmClear.visible = false; }
function submitConfirmClear() { graphRef.value.clearAll(); closeConfirmClear(); }

/* ===== Exportar (modal pide nombre) ===== */
function defaultExportName() {
  const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
  return `grafo-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function sanitizeFileName(name) {
  return String(name || '')
    .replace()
    .replace(/\.+$/, '')
    .trim();
}
function openExportModal() { forms.exportGraph.filename = defaultExportName(); forms.exportGraph.error = ''; modals.exportGraph.visible = true; }
function closeExportModal() { modals.exportGraph.visible = false; }
function submitExport() {
  const raw = forms.exportGraph.filename || '';
  const cleaned = sanitizeFileName(raw);
  if (!cleaned) { forms.exportGraph.error = 'Escribe un nombre de archivo válido.'; return; }
  const filename = cleaned.toLowerCase().endsWith('.json') ? cleaned : `${cleaned}.json`;

  const data = graphRef.value.getGraphData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeExportModal();
}

/* ===== Importar ===== */
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
      forms.importGraph.parsed = null;
      forms.importGraph.preview = { nodes: 0, edges: 0 };
      forms.importGraph.error = 'Archivo inválido. Debe ser un JSON con { nodes:[], edges:[] }.';
      console.error(err);
    }
  };
  reader.onerror = () => { forms.importGraph.error = 'No se pudo leer el archivo.'; };
  reader.readAsText(file);
}
function submitImport() {
  if (!forms.importGraph.parsed) { forms.importGraph.error = 'Selecciona un archivo válido antes de importar.'; return; }
  try {
    graphRef.value.loadGraphData(forms.importGraph.parsed, { replace: true });
    closeImportModal();
  } catch (err) {
    forms.importGraph.error = 'El JSON no pudo cargarse. Revisa el formato.';
    console.error(err);
  }
}

/* ===== Ayuda ===== */
function openHelp() { modals.help.visible = true; }
function closeHelp() { modals.help.visible = false; }

function runJohnson(mode = 'max') {
  const data = graphRef.value.getGraphData();

  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    alert('El grafo aún no está listo.');
    return;
  }

  // seguridad extra: bloqueo si hay aristas sin dirección
  if (data.edges.some(e => !e.directed)) {
    alert('Hay aristas sin dirección. Johnson requiere aristas dirigidas.');
    return;
  }

  let res;
  if (mode === 'min') {
    res = computeShortestPathDAG(data.nodes, data.edges);
  } else {
    res = computeCPM(data.nodes, data.edges);
  }

  if (!res.ok) {
    alert(res.message || 'No se pudo calcular la ruta seleccionada.');
    return;
  }

  graphRef.value.showCriticalCPM(res); // pinta en el lienzo


  
}


const johnsonDisabled = computed(() => {
  const data = graphRef.value?.getGraphData?.();
  if (!data) return false;
  return data.edges.some(e => !e.directed);
});



function clearHighlight() {
  graphRef.value.clearCriticalCPM();
}

function openJohnsonChoice() {
  // Validación previa: no permitir si hay aristas sin dirección
  const data = graphRef.value.getGraphData();
  const undirected = data.edges.filter(e => !e.directed);
  if (undirected.length) {
    const name = new Map(data.nodes.map(n => [n.id, n.label || n.id]));
    const preview = undirected.slice(0, 8).map(e =>
      `${e.id}: ${name.get(e.source)}↔${name.get(e.target)}`
    ).join('\n');
    const extra = undirected.length > 8 ? `\n... y ${undirected.length - 8} más` : '';
    alert(
      `No se puede ejecutar Johnson:\n` +
      `Existen ${undirected.length} arista(s) sin dirección.\n\n` +
      preview + extra + `\n\n` +
      `Solución: edita esas aristas y marca "Dirigida".`
    );
    return;
  }

  modals.johnsonChoice.visible = true;
}



</script>
