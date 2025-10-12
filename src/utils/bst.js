// src/utils/bst.js

/**
 * Nodo del árbol binario.
 */
class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    // ID único para la visualización
    this.id = `node-${value}-${Math.random().toString(36).substr(2, 5)}`;
  }
}

/**
 * Clase para el Árbol Binario de Búsqueda (BST).
 */
export class BST {
  constructor() {
    this.root = null;
  }

  /**
   * Inserta un valor en el árbol. No permite duplicados.
   * @param {number} value
   */
  insert(value) {
    const newNode = new TreeNode(value);
    if (!this.root) {
      this.root = newNode;
      return this;
    }

    let current = this.root;
    while (current) {
      if (value === current.value) return undefined; // No se insertan duplicados

      if (value < current.value) {
        if (!current.left) {
          current.left = newNode;
          return this;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = newNode;
          return this;
        }
        current = current.right;
      }
    }
  }

  /**
   * Limpia el árbol.
   */
  clear() {
    this.root = null;
  }

  /**
   * Calcula la altura del árbol.
   * @returns {number}
   */
  getHeight() {
    if (!this.root) return 0;
    const getHeightRecursive = (node) => {
      if (!node) return 0;
      return 1 + Math.max(getHeightRecursive(node.left), getHeightRecursive(node.right));
    };
    return getHeightRecursive(this.root);
  }

  /**
   * Realiza un recorrido y devuelve los nodos en el orden visitado.
   * @param {'in-order' | 'pre-order' | 'post-order'} type
   * @returns {TreeNode[]}
   */
  traverse(type) {
    const result = [];
    if (!this.root) return result;

    const traverseInOrder = (node) => {
      if (node.left) traverseInOrder(node.left);
      result.push(node);
      if (node.right) traverseInOrder(node.right);
    };

    const traversePreOrder = (node) => {
      result.push(node);
      if (node.left) traversePreOrder(node.left);
      if (node.right) traversePreOrder(node.right);
    };

    const traversePostOrder = (node) => {
      if (node.left) traversePostOrder(node.left);
      if (node.right) traversePostOrder(node.right);
      result.push(node);
    };

    switch (type) {
      case 'in-order':
        traverseInOrder(this.root);
        break;
      case 'pre-order':
        traversePreOrder(this.root);
        break;
      case 'post-order':
        traversePostOrder(this.root);
        break;
    }
    return result;
  }

  /**
   * Convierte el árbol a un formato compatible con Cytoscape (nodos y aristas).
   * @returns {{nodes: any[], edges: any[]}}
   */
  toCytoscapeElements() {
    const nodes = [];
    const edges = [];
    if (!this.root) return { nodes, edges };

    const buildElements = (node, parentId = null) => {
      nodes.push({ data: { id: node.id, label: String(node.value) } });

      if (parentId) {
        edges.push({
          data: {
            id: `edge-${parentId}-${node.id}`,
            source: parentId,
            target: node.id,
          },
        });
      }

      if (node.left) {
        buildElements(node.left, node.id);
      }
      if (node.right) {
        buildElements(node.right, node.id);
      }
    };

    buildElements(this.root);
    return { nodes, edges };
  }
}