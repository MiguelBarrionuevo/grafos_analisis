<template>
  <div ref="container" class="canvas"></div>
</template>

<script setup>
// @ts-nocheck
/* eslint-disable no-undef */
/* global defineProps, defineExpose */
import { onMounted, onBeforeUnmount, ref, getCurrentInstance } from 'vue';
import cytoscape from 'cytoscape';
import { ASSIGNMENT_MODES as MODES } from '../constants/assignmentModes';

const props = defineProps({
  mode: { type: String, default: MODES.ADD_NODE_U }
});

const container = ref(null);
let cy = null;

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 60%)`;
}

onMounted(() => {
  cy = cytoscape({
    container: container.value,
    wheelSensitivity: 0.4,
    minZoom: 0.1,
    maxZoom: 5,
    style: [
      // ====== NODOS ======
      {
        selector: 'node',
        style: {
          'background-color': ele => ele.data('color') || '#66ccff',
          'label': 'data(labelDisplay)',
          'font-size': 10,
          'color': '#e5e7eb',
          'text-wrap': 'wrap',
          'text-max-width': 120,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-background-opacity': 0,
          'text-outline-width': 1.5,
          'text-outline-color': '#0b1020',
          'border-width': 2,
          'border-color': '#0b1020'
        }
      },

      // ====== ARISTAS (normales) ======
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#102d85',
          'curve-style': 'bezier',
          'label': 'data(labelText)',
          'font-size': 10,
          'color': '#ffffff',
          'text-background-opacity': 0,
          'text-outline-width': 1.5,
          'text-outline-color': '#000000',
          'edge-text-rotation': 'autorotate',
          'text-rotation': 'autorotate',
          'text-margin-y': 12
        }
      },
      {
        selector: 'edge[directed = 1]',
        style: {
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.1,
          'target-arrow-color': '#102d85'
        }
      },

      // ====== ATENUADOS (para resaltar la solución) ======
      { selector: 'node.dim', style: { 'opacity': 0.35 } },
      { selector: 'edge.dim', style: { 'opacity': 0.20 } },

      // ====== RESALTADO DE SOLUCIÓN (ruta crítica/asignación) ======
      {
        selector: 'edge.critical',
        style: {
          'line-color': '#ef4444',
          'width': 4,
          'arrow-scale': 1.2,
          'color': '#ef4444',
          'text-outline-color': '#0b1020',
          'text-outline-width': 1.5,
          'target-arrow-color': '#ef4444'
        }
      },
      {
        selector: 'node.critical',
        style: {
          'border-width': 3,
          'border-color': '#ef4444',
        }
      }
    ],
    layout: { name: 'preset' }
  });

  bindInteractions();
});

onBeforeUnmount(() => { if (cy) { cy.destroy(); cy = null; } });

function bindInteractions() {
  // fondo → agregar nodo
  cy.on('tap', (evt) => {
    if (evt.target !== cy) return;
    if (props.mode === MODES.ADD_NODE_U || props.mode === MODES.ADD_NODE_V) {
      emitAddNode(evt.position);
    }
  });

  // agregar arista: origen → destino
  let pendingSource = null;
  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    if (props.mode === MODES.ADD_EDGE) {
      if (!pendingSource) {
        pendingSource = node; node.addClass('selected');
      } else {
        const s = pendingSource; const t = node;
        s.removeClass('selected'); pendingSource = null;
        emitAddEdge(s.id(), t.id());
      }
    } else if (props.mode === MODES.DELETE) {
      emitDelete(node.id(), 'node');
    }
  });

  cy.on('tap', 'edge', (evt) => {
    if (props.mode === MODES.DELETE) {
      emitDelete(evt.target.id(), 'edge');
    }
  });

  // doble clic → editar
  cy.on('dbltap', 'node', (evt) => {
    if (props.mode === MODES.EDIT) {
      const n = evt.target;
      emitEditNode(n.id(), n.data('label') || '', n.data('color') || '#66ccff');
    }
  });
  cy.on('dbltap', 'edge', (evt) => {
    if (props.mode === MODES.EDIT) {
      const e = evt.target;
      const w = Number(e.data('weight'));
      const directed = !!e.data('directed');
      emitEditEdge(e.id(), isFinite(w) ? w : 0, directed);
    }
  });
}

// ====== Emits a App.vue ======
const { emit } = getCurrentInstance();
function emitAddNode(position) { emit('request-add-node', { position }); }
function emitAddEdge(sourceId, targetId) { emit('request-add-edge', { sourceId, targetId }); }
function emitEditNode(id, label, color) { emit('request-edit-node', { id, label, color }); }
function emitEditEdge(id, weight, directed) { emit('request-edit-edge', { id, weight, directed }); }
function emitDelete(id, kind) { emit('request-delete', { id, kind }); }

// ====== API expuesta ======
function addNode(label, position, color, data = {}) {
  const id = `n${Date.now()}${Math.floor(Math.random()*1000)}`;
  const baseLabel = (label || id);
  cy.add({
    group: 'nodes',
    data: { id, label: baseLabel, labelDisplay: baseLabel, color: color || randomColor(), ...data },
    position
  });
}

function addEdge({ sourceId, targetId, weight, directed }) {
  const id = `e${Date.now()}${Math.floor(Math.random()*1000)}`;
  const w = Number(weight);
  const dir = directed ? 1 : 0;

  cy.add({
    group: 'edges',
    data: {
      id, source: sourceId, target: targetId,
      weight: w,
      directed: dir,
      labelText: String(isFinite(w) ? w : 0) // por defecto: muestra el peso
    }
  });

  return { ok: true, id };
}

function updateNode({ id, label, color }) {
  const n = cy.getElementById(id);
  if (n && n.nonempty()) {
    if (label != null) n.data('label', label);
    if (color != null) n.data('color', color);

    const displayBase = n.data('label') || n.id();
    n.data('labelDisplay', displayBase);
  }
}

function updateEdge({ id, weight, directed }) {
  const e = cy.getElementById(id);
  if (!e || e.empty()) return { ok: false, message: 'Arista no encontrada.' };

  const dir = directed ? 1 : 0;
  if (weight != null) {
    const w = Number(weight);
    e.data('weight', w);
    e.data('labelText', String(isFinite(w) ? w : 0));
  }
  e.data('directed', dir);

  return { ok: true };
}

function deleteElement(id) { cy.getElementById(id).remove(); }
function clearAll() { cy.elements().remove(); }
function resetEdgeSelection() { cy.elements('node.selected').removeClass('selected'); }

function getGraphData() {
  const nodes = cy.nodes().map(n => ({
    id: n.id(),
    label: n.data('label') || '',
    color: n.data('color') || '#66ccff',
    position: n.position(),
    data: { isSetU: n.data('isSetU') } // Devolver datos extra
  }));
  const edges = cy.edges().map(e => ({
    id: e.id(),
    source: e.data('source') || e.source().id(),
    target: e.data('target') || e.target().id(),
    weight: Number(e.data('weight') ?? 0),
    directed: !!(e.data('directed') ?? (e.data('target') ? 1 : 0))
  }));
  return { nodes, edges };
}

function loadGraphData(json, { replace = false } = {}) {
  if (replace) cy.elements().remove();
  const els = [];
  (json.nodes || []).forEach(n => {
    const base = n.label || n.id;
    els.push({
      group: 'nodes',
      data: { id: n.id, label: base, labelDisplay: base, color: n.color || '#66ccff', isSetU: n.data?.isSetU },
      position: n.position
    });
  });

  (json.edges || []).forEach(e => {
    const w = Number(e.weight) || 0;
    els.push({
      group: 'edges',
      data: { id: e.id, source: e.source, target: e.target, weight: w, directed: e.directed ? 1 : 0,
        labelText: String(w)
      }
    });
  });
  cy.add(els);
  cy.fit(undefined, 40);
}

/** Matriz de adyacencia */
function getAdjacency({ weighted = true, sortByLabel = true } = {}) {
  let nodes = cy.nodes().map(n => ({ id: n.id(), label: n.data('label') || n.id() }));
  if (sortByLabel) {
    nodes.sort((a,b) => (a.label||'').localeCompare(b.label||'') || a.id.localeCompare(b.id));
  }
  const idx = new Map(nodes.map((n,i)=>[n.id,i]));
  const m = Array.from({length:nodes.length},()=>Array(nodes.length).fill(0));
  cy.edges().forEach(e=>{
    const i = idx.get(e.data('source') || e.source().id());
    const j = idx.get(e.data('target') || e.target().id());
    if (i==null || j==null) return;
    let val = weighted ? Number(e.data('weight')) : 1;
    if (!Number.isFinite(val)) val = weighted ? 0 : 1;
    m[i][j] += val;
    if (!e.data('directed')) m[j][i] += val;
  });
  return { nodes, matrix: m };
}

function highlightAssignment(result) {
  clearHighlight();
  if (!result || !result.assignment) return;

  // Crear un conjunto de IDs de las aristas que forman parte de la asignación
  const assignmentEdges = new Set();
  result.assignment.forEach(edge => {
    assignmentEdges.add(edge.edgeId);
  });

  // Atenuar todos los elementos que no están en la asignación
  cy.elements().addClass('dim');

  cy.edges().forEach(edge => {
    if (assignmentEdges.has(edge.id())) {
      // Si la arista es parte de la solución, quitar la atenuación y resaltarla
      edge.removeClass('dim').addClass('critical');
      // También resaltar los nodos conectados por esta arista
      edge.source().removeClass('dim').addClass('critical');
      edge.target().removeClass('dim').addClass('critical');
    }
  });
}

function clearHighlight() { cy.elements().removeClass('critical dim'); }

defineExpose({
  addNode,
  addEdge,
  updateNode,
  updateEdge,
  deleteElement,
  clearAll,
  resetEdgeSelection,
  getGraphData,
  loadGraphData,
  getAdjacency,
  highlightAssignment,
  clearHighlight,
});
</script>

<style scoped>
.canvas { width: 100%; height: 100%; }
</style>