// src/utils/cpm.js
// CPM (ruta crítica) sobre un grafo dirigido con duraciones en ARISTAS (weight >= 0)

const EPS = 1e-9;

/**
 * @typedef {{ id:string, label?:string }} Node
 * @typedef {{ id:string, source:string, target:string, weight:number, directed?:boolean }} Edge
 */

/**
 * Calcula CPM (ruta crítica) para un grafo dirigido con pesos en aristas.
 * Retorna tiempos por nodo (E, L, slack), tabla por arista (ES, EF, LS, LF, slack), duración y avisos.
 * Si hay ciclo, ok=false y message explica el problema.
 *
 * @param {Node[]} nodes
 * @param {Edge[]} edges
 */
export function computeCPM(nodes, edges) {
  const nodeIds = nodes.map(n => n.id);
  const idx = new Map(nodeIds.map((id, i) => [id, i]));
  const n = nodeIds.length;

  // Filtramos solo aristas dirigidas y con peso válido (>=0)
  const usableEdges = edges.filter(e => {
    const w = Number(e.weight);
    const ok = isFinite(w) && w >= 0 && idx.has(e.source) && idx.has(e.target) && (e.directed !== false);
    return ok;
  });

  // Construcción de listas de adyacencia e indegree
  const out = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);
  for (const e of usableEdges) {
    const u = idx.get(e.source);
    const v = idx.get(e.target);
    out[u].push({ v, e });
    indeg[v]++;
  }

  // Orden topológico (Kahn). Si no cubre todos los nodos alcanzables, hay ciclo.
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const topo = [];
  const indegTmp = indeg.slice();
  while (q.length) {
    const u = q.shift();
    topo.push(u);
    for (const { v } of out[u]) {
      indegTmp[v]--;
      if (indegTmp[v] === 0) q.push(v);
    }
  }

  // Comprobamos si hay ciclo en la subestructura con aristas
  const involvedNodes = new Set();
  usableEdges.forEach(e => { involvedNodes.add(idx.get(e.source)); involvedNodes.add(idx.get(e.target)); });
  const topoCoversAllInvolved = topo.filter(i => involvedNodes.has(i)).length === involvedNodes.size;
  if (!topoCoversAllInvolved) {
    return {
      ok: false,
      message: 'El grafo contiene ciclos. La ruta maxima requiere un DAG.',
      duration: 0,
      nodesTimes: {},
      edgesTable: [],
      criticalEdges: [],
      criticalNodes: [],
      topo: [],
      warnings: ['Hay aristas/actividades dentro de ciclos.']
    };
  }

  // Tiempos tempranos (E)
  const E = Array(n).fill(0);
  for (const u of topo) {
    for (const { v, e } of out[u]) {
      const w = Number(e.weight);
      if (E[u] + w > E[v]) E[v] = E[u] + w;
    }
  }
  const duration = Math.max(0, ...E);

  // Tiempos tardíos (L)
  const hasOut = out.map(arr => arr.length > 0);
  const L = Array(n).fill(Infinity);
  // sinks: nodos sin salida -> L = duración
  for (let i = 0; i < n; i++) {
    if (!hasOut[i]) L[i] = duration;
  }
  // procesa en orden topológico inverso
  for (let k = topo.length - 1; k >= 0; k--) {
    const u = topo[k];
    for (const { v, e } of out[u]) {
      const w = Number(e.weight);
      L[u] = Math.min(L[u], L[v] - w);
    }
    if (!isFinite(L[u])) {
      // Aislado o no conecta a sinks: toma L = E para no generar NaN en holguras
      L[u] = E[u];
    }
  }

  // Tabla por arista y conjuntos críticos
  const edgesTable = [];
  const criticalEdges = [];
  const critNodesSet = new Set();

  for (const e of usableEdges) {
    const u = idx.get(e.source);
    const v = idx.get(e.target);
    const w = Number(e.weight);

    const ES = E[u];
    const EF = ES + w;
    const LF = L[v];
    const LS = LF - w;
    const slack = LS - ES; // = L[v] - w - E[u]

    const critical = Math.abs(slack) < EPS;
    edgesTable.push({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: w,
      ES, EF, LS, LF,
      slack,
      critical
    });
    if (critical) {
      criticalEdges.push(e.id);
      critNodesSet.add(e.source);
      critNodesSet.add(e.target);
    }
  }

  // Slack por nodo
  const nodesTimes = {};
  for (let i = 0; i < n; i++) {
    nodesTimes[nodeIds[i]] = {
      E: E[i],
      L: L[i],
      slack: L[i] - E[i]
    };
  }

  // Lista de nodos críticos
  const criticalNodes = [...critNodesSet];

  // Para mostrar “ruta crítica” en orden, ordenamos aristas críticas por ES ascendente
  const criticalEdgesOrdered = edgesTable
    .filter(r => r.critical)
    .sort((a, b) => a.ES - b.ES)
    .map(r => r.id);

  return {
    ok: true,
    message: '',
    duration,
    nodesTimes,
    edgesTable,
    criticalEdges: criticalEdgesOrdered,
    criticalNodes,
    topo: topo.map(i => nodeIds[i]),
    warnings: []
  };
}

/**
 * Ruta MÍNIMA en DAG (todas las rutas mínimas).
 * - Usa solo aristas dirigidas con peso >= 0.
 * - Devuelve:
 *    - duration: distancia mínima entre alguna fuente y algún sumidero
 *    - criticalEdges: UNIÓN de todas las aristas que pertenecen a al menos una ruta mínima (para resaltar)
 *    - pathsNodes: lista de rutas mínimas como secuencias de ids de nodos
 *    - pathsEdges: lista de rutas mínimas como secuencias de ids de aristas
 *    - nodesTimes: para visual (E=L=dist)
 */
export function computeShortestPathDAG(nodes, edges) {
  const nodeIds = nodes.map(n => n.id);
  const idx = new Map(nodeIds.map((id, i) => [id, i]));
  const n = nodeIds.length;

  // usar solo aristas dirigidas y pesos válidos (>=0)
  const usableEdges = edges.filter(e => {
    const w = Number(e.weight);
    return idx.has(e.source) && idx.has(e.target) && (e.directed !== false) && isFinite(w) && w >= 0;
  });

  // construir adyacencias + indegree/outdegree
  const out = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);
  const outdeg = Array(n).fill(0);
  for (const e of usableEdges) {
    const u = idx.get(e.source);
    const v = idx.get(e.target);
    out[u].push({ v, e });
    indeg[v]++;
    outdeg[u]++;
  }

  // Kahn topo
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const topo = [];
  const indegTmp = indeg.slice();
  while (q.length) {
    const u = q.shift();
    topo.push(u);
    for (const { v } of out[u]) {
      indegTmp[v]--;
      if (indegTmp[v] === 0) q.push(v);
    }
  }

  // Verificar que cubre todos los nodos involucrados (DAG)
  const involved = new Set();
  usableEdges.forEach(e => { involved.add(idx.get(e.source)); involved.add(idx.get(e.target)); });
  const covered = topo.filter(i => involved.has(i)).length === involved.size;
  if (!covered) {
    return {
      ok: false,
      message: 'El grafo contiene ciclos. La ruta mínima requiere un DAG.',
      duration: 0,
      nodesTimes: {},
      edgesTable: [],
      criticalEdges: [],
      criticalNodes: [],
      pathsNodes: [],
      pathsEdges: [],
      topo: [],
      warnings: ['Hay aristas dentro de ciclos.']
    };
  }

  // Fuentes y sumideros
  const sources = [];
  const sinks = [];
  for (let i = 0; i < n; i++) {
    if (indeg[i] === 0) sources.push(i);
    if (outdeg[i] === 0) sinks.push(i);
  }
  if (!sources.length || !sinks.length) {
    return {
      ok: false,
      message: 'No hay fuentes o sumideros definidos para ruta mínima.',
      duration: 0,
      nodesTimes: {},
      edgesTable: [],
      criticalEdges: [],
      criticalNodes: [],
      pathsNodes: [],
      pathsEdges: [],
      topo: topo.map(i => nodeIds[i]),
      warnings: []
    };
  }

  // DP de ruta mínima en DAG: dist + predecesores óptimos (para enumerar TODAS las rutas mínimas)
  const INF = Number.POSITIVE_INFINITY;
  const dist = Array(n).fill(INF);
  /** @type {Array<Array<{u:number,e:any}>>} */
  const preds = Array.from({ length: n }, () => []);

  for (const s of sources) dist[s] = 0;

  for (const u of topo) {
    if (!isFinite(dist[u])) continue; // inalcanzable
    for (const { v, e } of out[u]) {
      const w = Number(e.weight);
      const cand = dist[u] + w;
      if (cand < dist[v]) {
        dist[v] = cand;
        preds[v] = [{ u, e }];
      } else if (cand === dist[v]) {
        preds[v].push({ u, e });
      }
    }
  }

  // Mejor distancia (puede haber varios sumideros con la misma mínima)
  let bestDist = INF;
  for (const t of sinks) bestDist = Math.min(bestDist, dist[t]);
  if (!isFinite(bestDist)) {
    return {
      ok: false,
      message: 'No existe ruta válida desde una fuente a un sumidero.',
      duration: 0,
      nodesTimes: {},
      edgesTable: [],
      criticalEdges: [],
      criticalNodes: [],
      pathsNodes: [],
      pathsEdges: [],
      topo: topo.map(i => nodeIds[i]),
      warnings: []
    };
  }
  const goalSinks = sinks.filter(t => dist[t] === bestDist);

  // Enumerar TODAS las rutas mínimas mediante backtracking sobre preds
  const MAX_PATHS = 500; // evita explosión combinatoria
  const pathsNodes = [];
  const pathsEdges = [];
  function backtrack(v, curNodes, curEdges) {
    if (pathsNodes.length >= MAX_PATHS) return;
    if (dist[v] === 0 || preds[v].length === 0) {
      const nodesRev = curNodes.concat([v]).reverse();
      const edgesRev = curEdges.slice().reverse();
      pathsNodes.push(nodesRev.map(i => nodeIds[i]));
      pathsEdges.push(edgesRev.map(e => e.id));
      return;
    }
    for (const { u, e } of preds[v]) {
      curNodes.push(v);
      curEdges.push(e);
      backtrack(u, curNodes, curEdges);
      curNodes.pop();
      curEdges.pop();
    }
  }
  for (const t of goalSinks) backtrack(t, [], []);

  // Unión de todas las aristas mínimas (para resaltar en el lienzo)
  const union = new Set();
  pathsEdges.forEach(arr => arr.forEach(id => union.add(id)));

  // nodesTimes tipo “E|L” (usamos dist como E; L=E)
  const nodesTimes = {};
  for (let i = 0; i < n; i++) {
    const id = nodeIds[i];
    const E = isFinite(dist[i]) ? dist[i] : 0;
    nodesTimes[id] = { E, L: E, slack: 0 };
  }

  return {
    ok: true,
    message: '',
    duration: bestDist,
    nodesTimes,
    edgesTable: [],                // sin holguras en min
    criticalEdges: Array.from(union), // unión para pintar todas las mínimas
    criticalNodes: [],
    pathsNodes,                    // ← todas las rutas mínimas (nodos)
    pathsEdges,                    // ← todas las rutas mínimas (aristas)
    topo: topo.map(i => nodeIds[i]),
    warnings: pathsNodes.length >= MAX_PATHS
      ? ['Se truncó el número de rutas mínimas.'] : []
  };
}
