<template>
  <div class="app-layout">
    <header class="header">
      <h1>
        Árboles Binarios de Búsqueda 🌳
      </h1>
    </header>

    <BinaryTreeSidebar
      class="sidebar"
      @back-to-main="$emit('back-to-main')"
      @insert-node="handleInsertNode"
      @reset-tree="handleResetTree"
      @generate-random="handleGenerateRandom"
      @run-traversal="handleRunTraversal"
      @stop-traversal="handleStopTraversal"
      @import-tree="handleImport"
      @export-tree="handleExport"
      @open-help="openHelpGuide"
      :node-count="nodeCount"
      :tree-height="treeHeight"
      :is-random-mode="isRandomMode"
    />

    <main class="main">
      <BinaryTreeCanvas ref="canvasRef" :elements="treeElements" />
      <div v-if="traversalResult" class="traversal-result">
        <strong>Resultado del Recorrido:</strong> {{ traversalResult }}
      </div>
      <input type="file" ref="fileInput" @change="onFileSelected" style="display: none" accept="application/json" />
    </main>

    <!-- VENTANA MODAL PARA LA GUÍA DE AYUDA -->
    <div v-if="isHelpVisible" class="guide-modal-overlay" @click.self="closeHelpGuide">
      <div class="guide-modal-content">
        <button @click="closeHelpGuide" class="close-guide-button">&times;</button>
        <h3><i class="fas fa-book-open"></i> Guía de Funcionamiento: Construir Árbol</h3>
        <p>
          Esta sección te permite construir un Árbol Binario de Búsqueda (BST).
        </p>
        <ul>
          <li><strong>Insertar Nodo:</strong> Escribe un número en la barra lateral y presiona "Insertar". El valor se colocará siguiendo la regla: si es menor que un nodo, va a la izquierda; si es mayor, va a la derecha.</li>
          <li><strong>Recorridos:</strong> Usa los botones de la barra lateral para visualizar los recorridos (In-Order, Pre-Order, Post-Order) en el árbol.</li>
          <li><strong>Generar Aleatorio:</strong> Crea un árbol con valores aleatorios.</li>
          <li><strong>Importar/Exportar:</strong> Guarda o carga la estructura de tu árbol en un archivo <code>.json</code>.</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, defineAsyncComponent, defineEmits } from 'vue';
import { BST } from '../utils/bst.js';

defineEmits(['back-to-main']);

const BinaryTreeSidebar = defineAsyncComponent(() =>
  import('./BinaryTreeSidebar.vue')
);
const BinaryTreeCanvas = defineAsyncComponent(() =>
  import('./BinaryTreeCanvas.vue')
);

// --- ESTADO PARA LA NUEVA GUÍA DE AYUDA ---
const isHelpVisible = ref(false);
const openHelpGuide = () => { isHelpVisible.value = true; };
const closeHelpGuide = () => { isHelpVisible.value = false; };
// -----------------------------------------

const canvasRef = ref(null);
const fileInput = ref(null);
const tree = reactive(new BST());
const treeElements = ref({ nodes: [], edges: [] });
const traversalResult = ref('');
const isRandomMode = ref(false); // Controla si el árbol fue generado aleatoriamente

// Propiedades computadas para pasar a la sidebar
const nodeCount = computed(() => tree.traverse('in-order').length);
const treeHeight = computed(() => tree.getHeight());

function updateTreeVisualization() {
  treeElements.value = tree.toCytoscapeElements();
  traversalResult.value = ''; // Limpiar resultado al modificar el árbol
}

// Lógica para manejar los eventos de la sidebar
const handleInsertNode = (value) => {
  isRandomMode.value = false;
  tree.insert(value);
  updateTreeVisualization();
};

const handleResetTree = () => {
  tree.clear();
  isRandomMode.value = false;
  updateTreeVisualization();
  canvasRef.value?.stopAnimation();
};

const handleGenerateRandom = (params) => {
  tree.clear();
  isRandomMode.value = true;
  const generated = new Set();
  for (let i = 0; i < params.count; i++) {
    let randomValue;
    do {
      randomValue = Math.floor(Math.random() * (params.max - params.min + 1)) + params.min;
    } while (generated.has(randomValue));
    generated.add(randomValue);
    tree.insert(randomValue);
  }
  updateTreeVisualization();
};

const handleRunTraversal = (type) => {
  const orderedNodes = tree.traverse(type);
  const nodeIds = orderedNodes.map(node => node.id);
  traversalResult.value = orderedNodes.map(node => node.value).join(' → ');
  canvasRef.value?.animateTraversal(nodeIds);
};

const handleStopTraversal = () => {
  canvasRef.value?.stopAnimation();
  traversalResult.value = '';
};

const handleExport = () => {
  // Para un BST, solo necesitamos guardar los valores. Se reconstruirá en el mismo orden.
  const values = tree.traverse('pre-order').map(node => node.value);
  if (values.length === 0) {
    alert('El árbol está vacío. No hay nada que exportar.');
    return;
  }

  const data = {
    type: 'binary-search-tree',
    values: values,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  a.href = url;
  a.download = `arbol-bst-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleImport = () => {
  fileInput.value?.click();
};

const onFileSelected = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.type !== 'binary-search-tree' || !Array.isArray(data.values)) {
        throw new Error('El archivo no tiene el formato de árbol binario esperado.');
      }
      handleResetTree();
      data.values.forEach(value => tree.insert(value));
      updateTreeVisualization();
    } catch (error) {
      alert(`Error al importar el archivo: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Resetear el input para poder cargar el mismo archivo de nuevo
};

</script>
<style scoped>
.main {
  position: relative;
}

.guide-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

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

.traversal-result {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(11, 16, 32, 0.8);
  color: #e2e8f0;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1.1em;
  border: 1px solid #4a5568;
  z-index: 10;
}
</style>