let pageTree = {
  type: 'page',
  viewport: 1280,
  width: 900,
  children: []
};

let rc, ctx, canvas, selectedNode = null;
const hitBoxes = [];

let dragType = null;
let dropIndicator = null;   // { parent, index } – where a drag will insert
let canvasDragNode = null;  // node being dragged from canvas
let canvasDragging = false;
let roughLoaded = false;
