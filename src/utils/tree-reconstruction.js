// src/utils/tree-reconstruction.js

/**
 * Nodo del árbol binario. Reutilizamos una estructura similar a bst.js
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
 * Reconstruye un árbol a partir de los recorridos in-orden y pre-orden.
 * @param {number[]} inorder - Array de valores del recorrido in-orden.
 * @param {number[]} preorder - Array de valores del recorrido pre-orden.
 * @param {any[]} steps - Array para registrar los pasos de la guía.
 * @returns {TreeNode | null} - La raíz del árbol reconstruido.
 */
export function buildTreeFromInPre(inorder, preorder, steps = []) {
  if (inorder.length !== preorder.length) throw new Error('Los recorridos deben tener la misma cantidad de nodos.');
  if (new Set(inorder).size !== inorder.length) throw new Error('El recorrido in-orden no puede tener valores duplicados.');

  if (!inorder.length) return null;

  const inorderMap = new Map(inorder.map((val, i) => [val, i]));
  let preIndex = 0;

  function build(left, right) {
    if (left > right) return null;

    const rootValue = preorder[preIndex++];
    const root = new TreeNode(rootValue);
    const mid = inorderMap.get(rootValue);

    steps.push({
      action: 'find_root',
      rootValue: rootValue,
      description: `La raíz del subárbol es ${rootValue} (el primer elemento del pre-orden).`
    });

    root.left = build(left, mid - 1);
    root.right = build(mid + 1, right);

    return root;
  }

  return build(0, inorder.length - 1);
}

/**
 * Reconstruye un ÁRBOL BINARIO LLENO a partir de pre-orden y post-orden.
 * @param {number[]} preorder - Array de valores del recorrido pre-orden.
 * @param {number[]} postorder - Array de valores del recorrido post-orden.
 * @param {any[]} steps - Array para registrar los pasos de la guía.
 * @returns {TreeNode | null} - La raíz del árbol reconstruido.
 */
export function buildTreeFromPrePost(preorder, postorder, steps = []) {
  if (preorder.length !== postorder.length) throw new Error('Los recorridos deben tener la misma cantidad de nodos.');
  if (new Set(preorder).size !== preorder.length) throw new Error('Los recorridos no pueden tener valores duplicados.');

  let preIndex = 0;
  const postorderMap = new Map(postorder.map((val, i) => [val, i]));

  function build(postStart, postEnd) {
    if (preIndex >= preorder.length || postStart > postEnd) {
      return null;
    }

    const rootValue = preorder[preIndex++];
    const root = new TreeNode(rootValue);

    steps.push({
      action: 'find_root',
      rootValue: rootValue,
      description: `La raíz del subárbol es ${rootValue} (siguiente en pre-orden).`
    });

    if (postStart === postEnd) return root;

    const leftSubtreeRootVal = preorder[preIndex];
    const leftSubtreePostEnd = postorderMap.get(leftSubtreeRootVal);

    root.left = build(postStart, leftSubtreePostEnd);
    root.right = build(leftSubtreePostEnd + 1, postEnd - 1);

    return root;
  }

  return build(0, postorder.length - 1);
}

/**
 * Reconstruye un árbol a partir de los recorridos in-orden y post-orden.
 * @param {number[]} inorder - Array de valores del recorrido in-orden.
 * @param {number[]} postorder - Array de valores del recorrido post-orden.
 * @param {any[]} steps - Array para registrar los pasos de la guía.
 * @returns {TreeNode | null} - La raíz del árbol reconstruido.
 */
export function buildTreeFromInPost(inorder, postorder, steps = []) {
  if (inorder.length !== postorder.length) throw new Error('Los recorridos deben tener la misma cantidad de nodos.');
  if (new Set(inorder).size !== inorder.length) throw new Error('El recorrido in-orden no puede tener valores duplicados.');

  if (!inorder.length) return null;

  const inorderMap = new Map(inorder.map((val, i) => [val, i]));
  let postIndex = postorder.length - 1;

  function build(left, right) {
    if (left > right) return null;

    const rootValue = postorder[postIndex--];
    const root = new TreeNode(rootValue);
    const mid = inorderMap.get(rootValue);

    steps.push({
      action: 'find_root',
      rootValue: rootValue,
      description: `La raíz del subárbol es ${rootValue} (el último elemento del post-orden).`
    });

    // ¡Importante! Construir la derecha primero porque en post-orden la raíz está al final.
    root.right = build(mid + 1, right);
    root.left = build(left, mid - 1);

    return root;
  }

  return build(0, inorder.length - 1);
}