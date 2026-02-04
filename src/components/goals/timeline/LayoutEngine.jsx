/**
 * Layout Engine - אלגוריתמים לסידור אוטומטי של יעדים
 * בהשראת Make/n8n
 */

// סידור היררכי - מי תלוי במי
export const hierarchicalLayout = (nodes, edges) => {
  const levels = {};
  const visited = new Set();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // מציאת root nodes (ללא תלויות נכנסות)
  const roots = nodes.filter(node => 
    !edges.find(edge => edge.target === node.id)
  );

  if (roots.length === 0) {
    // אם אין roots, נבחר צמתים ראשונים
    return horizontalLayout(nodes, edges);
  }

  // BFS לסידור בשכבות
  const queue = roots.map((node, i) => ({
    nodeId: node.id,
    level: 0,
    index: i
  }));

  while (queue.length > 0) {
    const { nodeId, level, index } = queue.shift();

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (!levels[level]) levels[level] = [];
    levels[level].push({ nodeId, index });

    // מציאת ילדים
    const childEdges = edges.filter(e => e.source === nodeId);
    childEdges.forEach((edge, i) => {
      if (!visited.has(edge.target)) {
        queue.push({ 
          nodeId: edge.target, 
          level: level + 1, 
          index: levels[level + 1]?.length || i 
        });
      }
    });
  }

  // המרה למיקומים
  const positioned = [];
  Object.entries(levels).forEach(([level, nodesInLevel]) => {
    const levelY = 100 + parseInt(level) * 250;
    const levelWidth = nodesInLevel.length * 280;
    const startX = Math.max(100, (window.innerWidth - levelWidth) / 2);

    nodesInLevel.forEach(({ nodeId, index }) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        positioned.push({
          ...node,
          position: {
            x: startX + index * 280,
            y: levelY
          }
        });
      }
    });
  });

  return positioned;
};

// סידור אופקי - זרימה משמאל לימין (x גדל, y משתנה)
export const horizontalLayout = (nodes, edges) => {
  const rows = {};
  const visited = new Set();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // מציאת root nodes
  const roots = nodes.filter(node => 
    !edges.find(edge => edge.target === node.id)
  );

  if (roots.length === 0 && nodes.length > 0) {
    // אם אין roots, קח את כל הצמתים
    roots.push(nodes[0]);
  }

  const queue = roots.map((node, i) => ({
    nodeId: node.id,
    row: 0,
    column: i
  }));

  while (queue.length > 0) {
    const { nodeId, row, column } = queue.shift();

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (!rows[row]) rows[row] = [];
    rows[row].push({ nodeId, column });

    // מציאת ילדים
    const childEdges = edges.filter(e => e.source === nodeId);
    childEdges.forEach((edge, i) => {
      if (!visited.has(edge.target)) {
        queue.push({
          nodeId: edge.target,
          row: row + 1,
          column: rows[row + 1]?.length || i
        });
      }
    });
  }

  // המרה למיקומים - אופקי: x גדל (columns), y משתנה (rows)
  const positioned = [];
  Object.entries(rows).forEach(([row, nodesInRow]) => {
    const rowY = 100 + parseInt(row) * 250;
    const rowWidth = nodesInRow.length * 280;
    const startX = Math.max(100, (window.innerWidth - rowWidth) / 2);

    nodesInRow.forEach(({ nodeId, column }) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        positioned.push({
          ...node,
          position: {
            x: startX + column * 280,
            y: rowY
          }
        });
      }
    });
  });

  return positioned;
};

// סידור אנכי - זרימה מלמעלה למטה (y גדל, x משתנה)
export const verticalLayout = (nodes, edges) => {
  const columns = {};
  const visited = new Set();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const roots = nodes.filter(node => 
    !edges.find(edge => edge.target === node.id)
  );

  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const queue = roots.map((node, i) => ({
    nodeId: node.id,
    column: 0,
    row: i
  }));

  while (queue.length > 0) {
    const { nodeId, column, row } = queue.shift();

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (!columns[column]) columns[column] = [];
    columns[column].push({ nodeId, row });

    const childEdges = edges.filter(e => e.source === nodeId);
    childEdges.forEach((edge, i) => {
      if (!visited.has(edge.target)) {
        queue.push({
          nodeId: edge.target,
          column: column + 1,
          row: columns[column + 1]?.length || i
        });
      }
    });
  }

  // המרה למיקומים - אנכי: y גדל (rows), x משתנה (columns)
  const positioned = [];
  Object.entries(columns).forEach(([column, nodesInColumn]) => {
    const columnX = 100 + parseInt(column) * 350;
    
    nodesInColumn.forEach(({ nodeId, row }) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        positioned.push({
          ...node,
          position: {
            x: columnX,
            y: 100 + row * 180
          }
        });
      }
    });
  });

  return positioned;
};

// סידור מעגלי - יעד מרכזי ותלויות סביב
export const radialLayout = (nodes, edges) => {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{
      ...nodes[0],
      position: { x: 500, y: 300 }
    }];
  }

  const centerX = 500;
  const centerY = 300;
  const radius = Math.min(400, 150 + nodes.length * 20);

  // הצמת המרכזי - הראשון או הכי הרבה קשרים
  const centerNode = nodes.reduce((max, node) => {
    const connections = edges.filter(e => 
      e.source === node.id || e.target === node.id
    ).length;
    const maxConnections = edges.filter(e => 
      e.source === max.id || e.target === max.id
    ).length;
    return connections > maxConnections ? node : max;
  }, nodes[0]);

  const otherNodes = nodes.filter(n => n.id !== centerNode.id);
  const angleStep = (2 * Math.PI) / otherNodes.length;

  const positioned = [
    {
      ...centerNode,
      position: { x: centerX, y: centerY }
    }
  ];

  otherNodes.forEach((node, i) => {
    const angle = i * angleStep;
    positioned.push({
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    });
  });

  return positioned;
};

// סידור Grid פשוט
export const gridLayout = (nodes) => {
  const itemsPerRow = Math.ceil(Math.sqrt(nodes.length));
  const startX = 100;
  const startY = 100;
  const gapX = 280;
  const gapY = 200;

  return nodes.map((node, index) => {
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;

    return {
      ...node,
      position: {
        x: startX + col * gapX,
        y: startY + row * gapY
      }
    };
  });
};

// בחירת אלגוריתם לפי סוג
export const applyLayout = (layoutType, nodes, edges) => {
  switch (layoutType) {
    case 'hierarchical':
      return hierarchicalLayout(nodes, edges);
    case 'horizontal':
      return horizontalLayout(nodes, edges);
    case 'vertical':
      return verticalLayout(nodes, edges);
    case 'radial':
      return radialLayout(nodes, edges);
    case 'grid':
      return gridLayout(nodes);
    default:
      return horizontalLayout(nodes, edges);
  }
};