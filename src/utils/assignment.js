// @ts-nocheck
import { munkres } from './munkres';

/**
 * @typedef {{ id:string, label?:string }} Node
 * @typedef {{ id:string, source:string, target:string, weight:number, directed?:boolean }} Edge
 */

/**
 * Implementación del Algoritmo Húngaro para el problema de asignación.
 * @param {Node[]} nodes
 * @param {Edge[]} edges
 * @param {'min' | 'max'} mode
 */
export function computeAssignment(nodes, edges, mode = 'min') {
  const steps = [];
  // 1. Verificar si el grafo es bipartito y obtener los dos conjuntos (U y V)
  const bipartiteSets = getBipartiteSets(nodes, edges);
  if (!bipartiteSets.ok) {
    return { ok: false, message: bipartiteSets.message };
  }

  let { U, V } = bipartiteSets;

  // 2. Construir la matriz de costos. Si no es balanceado, se añaden nodos/aristas dummy.
  const n = Math.max(U.length, V.length);
  const originalU = [...U];
  const originalV = [...V];

  // Rellenar con nodos dummy si es necesario
  while (U.length < n) {
    U.push(`dummy_u_${U.length}`);
  }
  while (V.length < n) {
    V.push(`dummy_v_${V.length}`);
  }

  let costMatrix = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const edgeMap = new Map();

  let maxWeight = 0;
  for (const edge of edges) {
    if (isFinite(edge.weight))
      maxWeight = Math.max(maxWeight, edge.weight);
  }

  for (let i = 0; i < U.length; i++) {
    for (let j = 0; j < V.length; j++) {
      const uNode = U[i];
      const vNode = V[j];

      // Si es una asignación real (no dummy)
      if (i < originalU.length && j < originalV.length) {
        const edge = edges.find(e => (e.source === uNode && e.target === vNode) || (e.source === vNode && e.target === uNode));
        if (edge) {
          const weight = edge.weight;
          costMatrix[i][j] = weight;
          edgeMap.set(`${i},${j}`, edge.id);
        } else {
          // Arista no existente entre nodos reales
          costMatrix[i][j] = mode === 'max' ? 0 : Infinity;
        }
      } else {
        // Asignación dummy (costo 0 para minimización, costo alto para maximización). Se ajustará después.
        costMatrix[i][j] = mode === 'max' ? maxWeight + 1 : 0;
      }
    }
  }

  // Si es maximización, transformar la matriz de costos. Se hace en una copia.
  if (mode === 'max') {
    const transformedMatrix = JSON.parse(JSON.stringify(costMatrix));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (isFinite(transformedMatrix[i][j])) {
          transformedMatrix[i][j] = maxWeight - transformedMatrix[i][j];
        }
      }
    }
    costMatrix = transformedMatrix;
  }

  steps.push({
    title: '1. Matriz de Costos Inicial',
    description: mode === 'max' ? `Matriz transformada para maximización (C' = max(C) - C).` : 'Matriz de costos original.',
    matrix: JSON.parse(JSON.stringify(costMatrix))
  });

  // 3. Ejecutar el algoritmo Húngaro (munkres.js)
  try {
    // La librería munkres devuelve los índices de la asignación.
    const assignmentIndices = munkres(costMatrix, steps);
    const assignedEdges = [];
    let totalCost = 0;

    for (const [row, col] of assignmentIndices) {
      // Solo considerar asignaciones que no involucren nodos dummy
      if (row >= originalU.length || col >= originalV.length) continue;

      const edgeId = edgeMap.get(`${row},${col}`);
      if (edgeId) {
        const edge = edges.find(e => e.id === edgeId);
        assignedEdges.push({ u: U[row], v: V[col], edgeId: edgeId, cost: edge.weight });
        totalCost += edge.weight; // Sumamos el peso original
      }
    }

    return {
      ok: true,
      steps, // Pasos para la visualización
      bipartiteSets: { U: originalU, V: originalV }, // Devolver los conjuntos originales
      assignment: assignedEdges, // La lista de aristas de la asignación final
      duration: totalCost,
      message: `Costo total de la asignación (${mode}): ${totalCost}`,
      nodesTimes: {},
      edgesTable: [],
    };
  } catch (e) {
    return { ok: false, message: `Error en el algoritmo: ${e.message}. Asegúrate de que el grafo sea bipartito y balanceado.` };
  }
}

/**
 * Colorea el grafo para encontrar los dos conjuntos de un grafo bipartito.
 * @param {Node[]} nodes
 * @param {Edge[]} edges
 */
function getBipartiteSets(nodes, edges) {
  const adj = new Map(nodes.map(n => [n.id, []]));
  for (const edge of edges) {
    adj.get(edge.source).push(edge.target);
    adj.get(edge.target).push(edge.source);
  }

  const colors = new Map(); // 1 o -1
  const U = [];
  const V = [];

  for (const node of nodes) {
    if (!colors.has(node.id)) {
      const q = [node.id];
      colors.set(node.id, 1);

      while (q.length > 0) {
        const u = q.shift();
        const colorU = colors.get(u);

        for (const v of adj.get(u)) {
          if (!colors.has(v)) {
            colors.set(v, -colorU);
            q.push(v);
          } else if (colors.get(v) === colorU) {
            return { ok: false, message: "El grafo no es bipartito. El algoritmo de asignación requiere un grafo bipartito." };
          }
        }
      }
    }
  }

  for (const [nodeId, color] of colors.entries()) {
    if (color === 1) U.push(nodeId);
    else V.push(nodeId);
  }

  return { ok: true, U, V };
}