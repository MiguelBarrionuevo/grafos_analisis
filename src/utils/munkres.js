// @ts-nocheck
/*
  Implementación del algoritmo Húngaro (Munkres) para el problema de asignación.
  Adaptado para generar pasos intermedios para visualización.
  Basado en varias implementaciones de código abierto.
*/

export function munkres(matrix, steps) {
  const C = JSON.parse(JSON.stringify(matrix)); // Copia profunda para no modificar la matriz original.
  const n = C.length;

  // Paso 1: Reducción de filas
  for (let i = 0; i < n; i++) {
    const minVal = Math.min(...C[i].filter(val => isFinite(val)));
    if (minVal > 0 && minVal !== Infinity) {
      for (let j = 0; j < n; j++) {
        if (C[i][j] !== Infinity) C[i][j] -= minVal;
      }
    }
  }
  steps.push({ title: '2. Reducción de Filas', description: 'Se resta el mínimo de cada fila a todos sus elementos.', matrix: JSON.parse(JSON.stringify(C)) });

  // Paso 2: Reducción de columnas
  for (let j = 0; j < n; j++) {
    let minVal = Infinity;
    for (let i = 0; i < n; i++) {
      // Se debe ignorar Infinity al buscar el mínimo de la columna
      if (C[i][j] < minVal) {
        minVal = C[i][j];
      }
    }
    if (minVal > 0 && minVal !== Infinity) {
      for (let i = 0; i < n; i++) {
        if (C[i][j] !== Infinity) C[i][j] -= minVal;
      }
    }
  }
  steps.push({ title: '3. Reducción de Columnas', description: 'Se resta el mínimo de cada columna a todos sus elementos.', matrix: JSON.parse(JSON.stringify(C)) });

  let assignment = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Paso 3 & 4: Encontrar una asignación de ceros y cubrir columnas
    const { stars, rowCover, colCover } = findStarAssignment(C);
    const coveredCols = new Set();
    stars.forEach(star => coveredCols.add(star.col));

    steps.push({
      title: `Asignación Parcial (${stars.length}/${n})`,
      description: `Se busca una asignación óptima de ceros. ${stars.length} asignaciones encontradas.`,
      matrix: JSON.parse(JSON.stringify(C)),
      stars: stars,
    });

    if (coveredCols.size === n) {
      assignment = stars.map(s => [s.row, s.col]);
      break;
    }

    // Las coberturas vienen de la fase de primado/estrella
    const coveredRows = new Set(rowCover.map((isCovered, i) => isCovered ? i : -1).filter(i => i > -1));
    const finalCoveredCols = new Set(colCover.map((isCovered, i) => isCovered ? i : -1).filter(i => i > -1));

    
    steps.push({
      title: 'Cubrir Ceros',
      description: `Se cubren todos los ceros con el mínimo de líneas. Líneas: ${coveredRows.size + finalCoveredCols.size}.`,
      matrix: JSON.parse(JSON.stringify(C)),
      stars: stars,
      coveredRows: [...coveredRows],
      coveredCols: [...finalCoveredCols],
    });

    // Paso 5: Encontrar el valor mínimo no cubierto y ajustar la matriz
    let minUncovered = Infinity;
    for (let i = 0; i < n; i++) {
      if (coveredRows.has(i)) continue;
      for (let j = 0; j < n; j++) {
        if (finalCoveredCols.has(j)) continue;
        if (C[i][j] < minUncovered) { // Ignorar Infinity
          minUncovered = C[i][j];
        }
      }
    }

    if (minUncovered === Infinity) {
      throw new Error("No se puede mejorar la asignación. El grafo podría no ser completo.");
    }

    // Restar de los no cubiertos
    for (let i = 0; i < n; i++) {
      if (!coveredRows.has(i)) {
        for (let j = 0; j < n; j++) {
          if (!finalCoveredCols.has(j)) {
            if (C[i][j] !== Infinity) {
              C[i][j] -= minUncovered;
            }
          }
        }
      }
    }

    // Sumar en las intersecciones
    for (const i of coveredRows) {
      for (const j of finalCoveredCols) {
        if (C[i][j] !== Infinity) {
          C[i][j] += minUncovered;
        }
      }
    }

    steps.push({
      title: 'Ajuste de Matriz',
      description: `Se resta el mínimo no cubierto (${minUncovered}) de los elementos no cubiertos y se suma a las intersecciones.`,
      matrix: JSON.parse(JSON.stringify(C)),
    });
  }

  steps.push({
    title: `Resultado Final`,
    description: `Se encontró una asignación óptima con ${assignment.length} emparejamientos.`,
    matrix: JSON.parse(JSON.stringify(C)),
    stars: assignment.map(([row, col]) => ({ row, col })),
    isFinal: true,
  });

  return assignment;
}

function findStarAssignment(matrix) { // Esta función ahora también cubre los ceros
  const n = matrix.length;
  const C = matrix;
  const stars = [];
  const primes = []; // {row, col}
  const rowCover = new Array(n).fill(false);
  const colCover = new Array(n).fill(false);

  // Encuentra una estrella en cada fila si es posible
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (C[r][c] === 0 && !colCover[c]) {
        stars.push({ row: r, col: c });
        colCover[c] = true;
        break;
      }
    }
  }

  colCover.fill(false); // Reset

  // eslint-disable-next-line no-constant-condition
  while (stars.length < n) { // Continuar hasta que todas las columnas estén cubiertas por estrellas
    // Cubre las columnas que tienen estrellas
    stars.forEach(s => colCover[s.col] = true);
    if (stars.length >= n) break;

    let primedZero = null;
    while (primedZero === null) {
      // Encuentra un cero no cubierto y lo prima
      let r = -1, c = -1;
      outer: for (r = 0; r < n; r++) {
        if (rowCover[r]) continue;
        for (c = 0; c < n; c++) {
          if (colCover[c]) continue;
          if (C[r][c] === 0) {
            primedZero = { row: r, col: c };
            primes.push(primedZero);
            break outer;
          }
        }
      }

      if (primedZero === null) break; // No más ceros, ir a ajustar matriz

      // Si hay una estrella en la fila del cero primado, cubrir la fila y descubrir la columna de la estrella
      const starInRow = stars.find(s => s.row === primedZero.row);
      if (starInRow) {
        rowCover[primedZero.row] = true;
        colCover[starInRow.col] = false;
      } else {
        // No hay estrella en la fila, construir una ruta aumentante
        let path = [primedZero];
        let cur = primedZero;
        while (cur) { // Continuar mientras haya un elemento actual en la ruta
          const starInCol = stars.find(s => s.col === cur.col);
          if (!starInCol) break;
          path.push(starInCol);
          const primeInRow = primes.find(p => p.row === starInCol.row);
          path.push(primeInRow);
          cur = primeInRow;
        }

        // Invertir la ruta
        path.forEach((p, i) => {
          if (i % 2 === 0) { // Primes se convierten en stars
            const starToRemove = stars.findIndex(s => s.col === p.col);
            if (starToRemove > -1) stars.splice(starToRemove, 1);
            stars.push({ row: p.row, col: p.col });
          }
        });

        // Limpiar y reiniciar
        primes.length = 0;
        rowCover.fill(false);
        colCover.fill(false);
        primedZero = null; // Para salir del bucle interno y volver a cubrir columnas
      }
    }
    if (primedZero === null) break; // No se encontraron más ceros, salir para ajustar matriz
  }
  return { stars, rowCover, colCover };
}