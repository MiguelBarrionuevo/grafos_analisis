<template>
  <div class="app-layout">
    <header class="header">
      <h1>Reconstrucción de Árboles Binarios 🌿</h1>
    </header>

    <ReconstructTreeSidebar
      class="sidebar"
      @back-to-main="$emit('back-to-main')"
      @reconstruct="handleReconstruct"
      @reset="handleReset"
      @import-data="handleImport"
      @export-data="handleExport"
      @open-help="openHelpGuide"
    />

    <main class="main">
      <BinaryTreeCanvas ref="canvasRef" :elements="treeElements" />
      <input type="file" ref="fileInput" @change="onFileSelected" style="display: none" accept="application/json" />
    </main>

    <!-- VENTANA MODAL PARA LA GUÍA DE AYUDA -->
    <div v-if="isHelpVisible" class="guide-modal-overlay" @click.self="closeHelpGuide">
      <div class="guide-modal-content">
        <button @click="closeHelpGuide" class="close-guide-button">&times;</button>
        <h3><i class="fas fa-book-open"></i> Guía de Funcionamiento: Reconstruir Árbol</h3>
        <p>
          Esta sección reconstruye un árbol binario a partir de sus recorridos.
        </p>
        <ul>
          <li><strong>Requisito:</strong> Necesitas dos recorridos para reconstruir un árbol de forma única: <strong>In-Order</strong> + <strong>Pre-Order</strong>, o <strong>In-Order</strong> + <strong>Post-Order</strong>.</li>
          <li><strong>Funcionamiento:</strong> El algoritmo identifica la raíz del árbol usando el recorrido Pre-Order (primer elemento) o Post-Order (último elemento). Luego, usa el In-Order para determinar qué nodos pertenecen al subárbol izquierdo y cuáles al derecho.</li>
          <li><strong>Uso:</strong> Ingresa los recorridos en los campos de la barra lateral (separados por comas) y ejecuta el algoritmo para ver el árbol resultante.</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, defineAsyncComponent, defineEmits } from 'vue';
import { buildTreeFromInPre, buildTreeFromInPost } from '../utils/tree-reconstruction.js';
import { BST } from '../utils/bst.js'; // Reutilizamos para la visualización

defineEmits(['back-to-main']);

const ReconstructTreeSidebar = defineAsyncComponent(() =>
  import('./ReconstructTreeSidebar.vue')
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
const treeElements = ref({ nodes: [], edges: [] });
let lastTraversals = {}; // Para exportar

function updateTreeVisualization(rootNode) {
  const tempTree = new BST(); // Usamos una instancia de BST solo para acceder a toCytoscapeElements
  tempTree.root = rootNode;
  treeElements.value = tempTree.toCytoscapeElements();
}

const handleReconstruct = ({ method, inorder, preorder, postorder }) => {
  try {
    const inorderArr = inorder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    let root = null;
    lastTraversals = { method, inorder };

    if (method === 'in-pre') {
      const preorderArr = preorder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (inorderArr.length !== preorderArr.length) throw new Error('Los recorridos deben tener la misma cantidad de nodos.');
      root = buildTreeFromInPre(inorderArr, preorderArr);
      lastTraversals.preorder = preorder;
    } else { // in-post
      const postorderArr = postorder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (inorderArr.length !== postorderArr.length) throw new Error('Los recorridos deben tener la misma cantidad de nodos.');
      root = buildTreeFromInPost(inorderArr, postorderArr);
      lastTraversals.postorder = postorder;
    }

    if (!root) throw new Error('No se pudo reconstruir el árbol. Revisa los recorridos.');
    updateTreeVisualization(root);

  } catch (error) {
    alert(`Error: ${error.message}`);
    handleReset();
  }
};

const handleReset = () => {
  treeElements.value = { nodes: [], edges: [] };
  lastTraversals = {};
};

const handleExport = () => {
  if (!lastTraversals.inorder) {
    alert('No hay datos de recorridos para exportar.');
    return;
  }
  const data = { type: 'reconstruct-tree-traversals', ...lastTraversals };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reconstruccion-arbol-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
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
      if (data.type !== 'reconstruct-tree-traversals') throw new Error('Archivo no válido.');
      handleReconstruct(data);
    } catch (error) {
      alert(`Error al importar: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
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
</style>