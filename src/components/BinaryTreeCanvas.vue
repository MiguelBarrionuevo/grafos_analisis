<template>
  <div ref="container" class="canvas"></div>
</template>

<script setup>
/* global defineProps, defineExpose */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import cytoscape from 'cytoscape';

const props = defineProps({
  elements: {
    type: Object,
    default: () => ({ nodes: [], edges: [] }),
  },
});

const container = ref(null);
let cy = null;
let animationTimeout = null;

const layoutOptions = {
  name: 'breadthfirst',
  directed: true,
  padding: 30,
  spacingFactor: 1.2,
  grid: true,
};

onMounted(() => {
  cy = cytoscape({
    container: container.value,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#66ccff',
          'label': 'data(label)',
          'font-size': 12,
          'color': '#ffffff',
          'text-valign': 'center',
          'text-halign': 'center',
          'border-width': 2,
          'border-color': '#0b1020',
        },
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#4a5568',
          'target-arrow-shape': 'triangle',
          'target-arrow-color': '#4a5568',
          'curve-style': 'bezier',
        },
      },
      {
        selector: '.highlighted',
        style: {
          'background-color': '#f56565',
          'border-color': '#f56565',
          'transition-property': 'background-color, border-color',
          'transition-duration': '0.3s',
        },
      },
    ],
    layout: layoutOptions,
  });
});

onBeforeUnmount(() => {
  stopAnimation();
  if (cy) {
    cy.destroy();
    cy = null;
  }
});

watch(() => props.elements, (newElements) => {
  if (cy) {
    cy.elements().remove();
    cy.add(newElements);
    
    // Ayuda al layout a ordenar los hijos correctamente.
    // El hijo 'left' debe ir a la izquierda (order: 0) y 'right' a la derecha (order: 1).
    // Esto es necesario porque el layout 'breadthfirst' no tiene una noción inherente de "izquierda" o "derecha".
    cy.edges().forEach(edge => {
      const child = edge.target();
      const position = edge.data('position');

      if (position === 'left') {
        child.scratch('breadthfirst', { order: 0 });
      } else if (position === 'right') {
        child.scratch('breadthfirst', { order: 1 });
      }
    });

    cy.layout(layoutOptions).run();
    cy.fit();
  }
}, { deep: true });

function stopAnimation() {
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  if (cy) {
    cy.elements().removeClass('highlighted');
  }
}

function animateTraversal(nodeIds) {
  stopAnimation();
  if (!cy || !nodeIds.length) return;

  let i = 0;
  function highlightNext() {
    if (i > 0) {
      cy.getElementById(nodeIds[i - 1]).removeClass('highlighted');
    }
    if (i < nodeIds.length) {
      cy.getElementById(nodeIds[i]).addClass('highlighted');
      i++;
      animationTimeout = setTimeout(highlightNext, 700);
    } else {
      // Mantener el último resaltado por un momento
      setTimeout(() => stopAnimation(), 1000);
    }
  }
  highlightNext();
}

defineExpose({ animateTraversal, stopAnimation });
</script>

<style scoped>
.canvas { width: 100%; height: 100%; background-color: #1a202c; }
</style>