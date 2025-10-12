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
    />

    <main class="main">
      <BinaryTreeCanvas ref="canvasRef" :elements="treeElements" />
      <input type="file" ref="fileInput" @change="onFileSelected" style="display: none" accept="application/json" />
    </main>
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