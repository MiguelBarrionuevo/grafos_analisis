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
