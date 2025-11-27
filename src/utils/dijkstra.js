/* eslint-disable no-constant-condition */
// Implementación simple de Dijkstra con heap mínimo
class MinHeap {
  constructor() { this.heap = []; this.pos = new Map(); }
  _swap(i,j){ const h=this.heap; [h[i],h[j]]=[h[j],h[i]]; this.pos.set(h[i].node,i); this.pos.set(h[j].node,j); }
  _up(i){ const h=this.heap; while(i>0){ const p=Math.floor((i-1)/2); if(h[p].dist<=h[i].dist) break; this._swap(p,i); i=p; } }
  _down(i){ const h=this.heap; const n=h.length; while(true){ let l=2*i+1, r=2*i+2, s=i; if(l<n && h[l].dist < h[s].dist) s=l; if(r<n && h[r].dist < h[s].dist) s=r; if(s===i) break; this._swap(i,s); i=s; } }
  push(node, dist){ const idx=this.heap.length; this.heap.push({node,dist}); this.pos.set(node, idx); this._up(idx); }
  decreaseKey(node, newDist){ const idx=this.pos.get(node); if(idx===undefined) return; if(this.heap[idx].dist<=newDist) return; this.heap[idx].dist=newDist; this._up(idx); }
  pop(){ if(!this.heap.length) return null; const root=this.heap[0]; const last=this.heap.pop(); this.pos.delete(root.node); if(this.heap.length){ this.heap[0]=last; this.pos.set(last.node,0); this._down(0); } return root; }
  size(){ return this.heap.length; }
  has(node){ return this.pos.has(node); }
}

// adj: object mapping nodeId -> array of [neighborId, weight]
export function dijkstraAdj(adj, source){
  const nodes = Object.keys(adj);
  const dist = new Map(); const prev = new Map();
  nodes.forEach(n=>{ dist.set(n, Infinity); prev.set(n, null); });
  if (!dist.has(source)) throw new Error('Source node not in graph');
  dist.set(source, 0);

  const heap = new MinHeap();
  nodes.forEach(n=> heap.push(n, dist.get(n)) );

  while(heap.size()){
    const {node: u, dist: du} = heap.pop();
    if(du === Infinity) break;
    const neighbors = adj[u] || [];
    for(const [v,w] of neighbors){
      if (w < 0) throw new Error('Dijkstra no admite pesos negativos');
      const alt = du + w;
      if (alt < dist.get(v)){
        dist.set(v, alt);
        prev.set(v, u);
        if(heap.has(v)) heap.decreaseKey(v, alt); else heap.push(v, alt);
      }
    }
  }

  return { dist, prev };
}

export function reconstructPath(prevMap, source, target){
  const path = [];
  let u = target;
  while(u !== null && u !== undefined){ path.push(u); if(u === source) break; u = prevMap.get ? prevMap.get(u) : prevMap[u]; }
  return path.reverse();
}

// Calcula la ruta más larga desde `source` en un DAG dirigido.
// adj: { nodeId: [ [neighborId, weight], ... ], ... }
// Devuelve { dist: Map(nodeId -> distancia o -Infinity), prev: Map(prevNode), isDAG: boolean }
export function longestPathDAG(adj, source){
  const nodes = Object.keys(adj);
  // Construir in-degree para Kahn
  const indeg = {};
  nodes.forEach(n => indeg[n] = 0);
  for(const u of nodes){
    const nbrs = adj[u] || [];
    for(const [v] of nbrs){
      if(indeg[v] === undefined) indeg[v] = 0;
      indeg[v]++;
    }
  }

  // Kahn's algorithm for topo order
  const q = [];
  for(const n of Object.keys(indeg)) if(indeg[n] === 0) q.push(n);
  const topo = [];
  while(q.length){
    const u = q.shift(); topo.push(u);
    const nbrs = adj[u] || [];
    for(const [v] of nbrs){
      indeg[v]--;
      if(indeg[v] === 0) q.push(v);
    }
  }

  const isDAG = topo.length === Object.keys(adj).length;

  const dist = new Map();
  const prev = new Map();
  nodes.forEach(n => { dist.set(n, -Infinity); prev.set(n, null); });
  if(!dist.has(source)) throw new Error('Source node not in graph');
  dist.set(source, 0);

  if(!isDAG){
    // No es DAG: devolver indicando que no se puede usar este método
    return { dist, prev, isDAG };
  }

  // Procesar en orden topológico
  for(const u of topo){
    const du = dist.get(u);
    if(du === -Infinity) continue; // inalcanzable
    for(const [v,w] of (adj[u]||[])){
      if (typeof w !== 'number') continue;
      const alt = du + w;
      if(alt > dist.get(v)){
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  return { dist, prev, isDAG };
}

// Búsqueda DFS acotada para encontrar una ruta simple de máximo peso entre source y target.
// adj: { nodeId: [ [neighborId, weight], ... ], ... }
// options: { maxDepth, timeLimitMs }
// Retorna { weight, path, timedOut }
export function longestPathDFS(adj, source, target, options = {}){
  const nodes = Object.keys(adj)
  if (!nodes.includes(source) || !nodes.includes(target)) throw new Error('Source/target no están en el grafo')
  const maxDepth = options.maxDepth || Math.min(20, nodes.length)
  const timeLimitMs = options.timeLimitMs || 3000

  // precompute global max edge weight for simple pruning
  let globalMaxEdge = 0
  for(const u of nodes){
    for(const [,w] of (adj[u]||[])){
      if (typeof w === 'number' && w > globalMaxEdge) globalMaxEdge = w
    }
  }

  const start = Date.now()
  let timedOut = false
  let bestWeight = -Infinity
  let bestPath = []

  const visited = new Set()

  function dfs(u, acc, path){
    if (Date.now() - start > timeLimitMs){ timedOut = true; return }
    if (path.length > maxDepth) return
    if (u === target){
      if (acc > bestWeight){ bestWeight = acc; bestPath = path.slice() }
      // continue exploring in case we can find longer via other nodes
    }

    // optimistic bound: remaining nodes * globalMaxEdge
    const remaining = Math.max(0, nodes.length - path.length)
    const optimistic = acc + remaining * globalMaxEdge
    if (optimistic <= bestWeight) return

    for(const [v,w] of (adj[u]||[])){
      if (timedOut) return
      if (visited.has(v)) continue
      if (typeof w !== 'number') continue
      visited.add(v)
      path.push(v)
      dfs(v, acc + w, path)
      path.pop()
      visited.delete(v)
    }
  }

  visited.add(source)
  dfs(source, 0, [source])

  return { weight: bestWeight, path: bestPath, timedOut }
}
