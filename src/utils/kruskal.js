// Kruskal algorithm helper
// Exports: computeKruskal(nodes, edges)
// nodes: [{id, label, ...}]
// edges: [{id, source, target, weight, directed}]
// Returns: { ok: true, mstEdgeIds: [...], totalWeight, forestCount }

function find(parent, x) {
  if (parent[x] === undefined) parent[x] = x;
  return parent[x] === x ? x : (parent[x] = find(parent, parent[x]));
}

function union(parent, rank, a, b) {
  a = find(parent, a);
  b = find(parent, b);
  if (a === b) return false;
  if ((rank[a] || 0) < (rank[b] || 0)) parent[a] = b;
  else if ((rank[a] || 0) > (rank[b] || 0)) parent[b] = a;
  else { parent[b] = a; rank[a] = (rank[a] || 0) + 1; }
  return true;
}

export function computeKruskal(nodes = [], edges = [], mode = 'min') {
  try {
    // Copy edges and treat them as undirected for MST (use source/target)
    const list = (edges || []).map(e => ({
      id: e.id,
      u: e.source,
      v: e.target,
      w: Number.isFinite(Number(e.weight)) ? Number(e.weight) : 0
    }));

    // Sort by weight depending on mode: 'min' -> ascending, 'max' -> descending
    if (mode === 'max') {
      list.sort((a,b) => b.w - a.w || (a.id||'').localeCompare(b.id||''));
    } else {
      list.sort((a,b) => a.w - b.w || (a.id||'').localeCompare(b.id||''));
    }

    const parent = {};
    const rank = {};
    // ensure all nodes exist in parent map
    nodes.forEach(n => { parent[n.id] = n.id; rank[n.id] = 0; });

    const mstEdgeIds = [];
    let totalWeight = 0;

    for (const e of list) {
      if (find(parent, e.u) !== find(parent, e.v)) {
        union(parent, rank, e.u, e.v);
        mstEdgeIds.push(e.id);
        totalWeight += e.w;
      }
    }

    // Count resulting connected components (forest count)
    const comps = new Set();
    nodes.forEach(n => comps.add(find(parent, n.id)));

    return { ok: true, mstEdgeIds, totalWeight, forestCount: comps.size };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export default computeKruskal;
