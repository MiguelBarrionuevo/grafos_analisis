<template>
  <div class="app-layout">
    <header class="header">
      <h1><i class="fas fa-cogs"></i> Reconstrucción de Árbol desde Recorridos</h1>
    </header>

    <ReconstructTreeSidebar
      class="sidebar"
      @back-to-main="$emit('back-to-main')"
      @reconstruct="handleReconstruct"
      @reset="handleReset"
      @open-help="openHelpGuide"
    />

    <main class="main-reconstruct">
      <BinaryTreeCanvas ref="canvasRef" :elements="treeElements" />
      <div v-if="guideSteps.length" class="guide-panel">
        <h4><i class="fas fa-shoe-prints"></i> Pasos de Reconstrucción</h4>
        <div class="guide-navigation">
          <button @click="prevStep" :disabled="currentStepIndex <= 0">Anterior</button>
          <span>Paso {{ currentStepIndex + 1 }} de {{ guideSteps.length }}</span>
          <button @click="nextStep" :disabled="currentStepIndex >= guideSteps.length - 1">Siguiente</button>
        </div>
        <div class="guide-step-content">
          <p>{{ currentStep.description }}</p>
          <div v-if="currentStep.action === 'find_root' || currentStep.action === 'split_inorder'">
            <div class="code-like"><strong>In-orden:</strong> {{ currentStep.inorder.join(', ') }}</div>
            <div v-if="currentStep.preorder" class="code-like"><strong>Pre-orden:</strong> {{ currentStep.preorder.join(', ') }}</div>
            <div v-if="currentStep.postorder" class="code-like"><strong>Post-orden:</strong> {{ currentStep.postorder.join(', ') }}</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Guía de Ayuda Modal -->
    <div v-if="isHelpVisible" class="guide-modal-overlay" @click.self="closeHelpGuide">
      <div class="guide-modal-content">
        <button @click="closeHelpGuide" class="close-guide-button">&times;</button>
        <h3><i class="fas fa-book-open"></i> Guía de Funcionamiento: Reconstrucción</h3>
        <p>
          Esta herramienta reconstruye un árbol binario a partir de sus recorridos <strong>in-order</strong> y <strong>pre-order/post-order</strong>.
        </p>
        <ul>
          <li><strong>Método:</strong> Elige si quieres usar Pre-orden o Post-orden junto con el In-orden.</li>
          <li><strong>Recorridos:</strong> Ingresa los valores de los nodos para cada recorrido, separados por comas.</li>
          <li><strong>Reconstruir:</strong> Haz clic para generar el árbol. Podrás ver una guía paso a paso del proceso.</li>
          <li><strong>Importante:</strong> No se puede reconstruir un árbol único solo con pre-orden y post-orden. El recorrido in-orden es esencial.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, defineAsyncComponent, defineEmits } from 'vue';
import { buildTreeFromInPre, buildTreeFromInPost } from '../utils/tree-reconstruction.js';
import { BST } from '../utils/bst.js'; // Reutilizamos para la conversión a Cytoscape

defineEmits(['back-to-main']);

const ReconstructTreeSidebar = defineAsyncComponent(() => import('./ReconstructTreeSidebar.vue'));
const BinaryTreeCanvas = defineAsyncComponent(() => import('./BinaryTreeCanvas.vue'));

const canvasRef = ref(null);
const treeElements = ref({ nodes: [], edges: [] });
const guideSteps = ref([]);
const currentStepIndex = ref(0);
const isHelpVisible = ref(false);

const currentStep = computed(() => guideSteps.value[currentStepIndex.value] || {});

const openHelpGuide = () => { isHelpVisible.value = true; };
const closeHelpGuide = () => { isHelpVisible.value = false; };

const parseInput = (str) => str.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);

const handleReconstruct = ({ method, inorder, preorder, postorder }) => {
  const inOrderArr = parseInput(inorder);
  let root = null;
  const steps = [];

  try {
    if (method === 'in-pre') {
      const preOrderArr = parseInput(preorder);
      if (inOrderArr.length !== preOrderArr.length) throw new Error("Los recorridos deben tener la misma cantidad de nodos.");
      root = buildTreeFromInPre(inOrderArr, preOrderArr, steps);
    } else { // in-post
      const postOrderArr = parseInput(postorder);
      if (inOrderArr.length !== postOrderArr.length) throw new Error("Los recorridos deben tener la misma cantidad de nodos.");
      root = buildTreeFromInPost(inOrderArr, postOrderArr, steps);
    }

    if (root) {
      const tempTree = new BST();
      tempTree.root = root; // Asignamos la raíz reconstruida
      treeElements.value = tempTree.toCytoscapeElements();
      guideSteps.value = steps;
      currentStepIndex.value = 0;
    } else {
      handleReset();
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};

const handleReset = () => {
  treeElements.value = { nodes: [], edges: [] };
  guideSteps.value = [];
  currentStepIndex.value = 0;
};

const prevStep = () => {
  if (currentStepIndex.value > 0) currentStepIndex.value--;
};

const nextStep = () => {
  if (currentStepIndex.value < guideSteps.value.length - 1) currentStepIndex.value++;
};
</script>

<style scoped>
.main-reconstruct { display: flex; height: 100%; }
.guide-panel {
  width: 300px;
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 15px;
  overflow-y: auto;
  border-left: 1px solid #4a5568;
}
.guide-navigation { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.guide-navigation button { background-color: #4a5568; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.guide-navigation button:disabled { background-color: #718096; cursor: not-allowed; }
.guide-step-content p { background-color: #1a202c; padding: 10px; border-radius: 4px; font-size: 0.9em; }
.code-like { font-family: 'Courier New', Courier, monospace; background: #111620; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 0.85em; }

/* Estilos para la ventana modal (reutilizados de BinaryTreeView) */
.guide-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.guide-modal-content { background-color: #fff; padding: 20px 30px; border-radius: 8px; width: 90%; max-width: 600px; position: relative; color: #333; }
.close-guide-button { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888; }
</style>
