var board;

var board_options = {
  showCopyright: false,
  keepaspectratio: true,
  axis: true,
  zoom: true,
  pan: true,
  originX: 420,
  originY: 320,
  unitX: 25,
  unitY: 25,
  boundingbox: [-10, 10, 10, -10]
  // [-x, y, x, -y]
};

var point_options = {
  style: 6,
  withLabel: false
};

var function_options = {
  strokeWidth: 2,
  highlightstrokeWidth: 3,
  withLabel: false
};

function update() {

  // sanitize data
  var points = [];
  var data = $('#data').val()
    .split('\n');
  $.each(data, function(i,o) {
    var point = o.split(/[,\ \t]+/);
    if (point.length === 0) return;
    if (!point[0]) return;
    point = $.map(point, function(o,i) { return o*1; }); // cast to integer
    points.push(point);
  });

  // split data into separate functions
  var segments = [];
  var last_x = Number.POSITIVE_INFINITY;
  $.each(points, function(i,o) {
    if (o.length !== 2) return;
    if (o[0] < last_x) {
      segments.push([]);
    }
    last_x = o[0];
    segments[segments.length-1].push(o);
  });

  // calculate bounds of data
  var min_x, min_y, max_x, max_y;
  $.each(points, function(i,o) {
    if (o.length !== 2) return;
    if (min_x === undefined || o[0] < min_x) min_x = o[0];
    if (max_x === undefined || o[0] > max_x) max_x = o[0];
    if (min_y === undefined || o[1] < min_y) min_y = o[1];
    if (max_y === undefined || o[1] > max_y) max_y = o[1];
  });
  var range_x = max_x - min_x;
  var range_y = max_y - min_y;
  var margin = 0.1;

  // graph everything
  initializeBoard([
    min_x - range_x * margin,
    max_y + range_y * margin,
    max_x + range_x * margin,
    min_y - range_y * margin
  ]);
  var functions = [];
  $.each(segments, function(i,o) {
    if (o.length < 2) return;
    addFunction(o);
  });
}

// initialize the app
function initialize() {
  initializeBoard();
  //$('#box').aToolTip();
}

// remove all functions from board
function initializeBoard(boundingbox) {
  if (board !== undefined) JXG.JSXGraph.freeBoard(board);
  if (boundingbox !== undefined) {
    board_options.boundingbox = boundingbox;
  }
  board = JXG.JSXGraph.initBoard('box', board_options);
}

// add an function as a interpolated cubic spline to the board
function addFunction(points) {
  board.suspendUpdate();

  var p = [];
  $.each(points, function(i,o) {
    p.push(board.create('point', o, point_options));
  });

  var x_min = points[0][0];
  var x_max = points[points.length-1][0];
  board.create('spline', p, function_options);

  // We can fit a polynomial:
  //var interpolated = board.lagrangePolynomial(p);
  //board.create('functiongraph', [interpolated, x_min, x_max], function_options);

  // There is also code for a least-squares best-fit line:
  // http://jsxgraph.uni-bayreuth.de/wiki/index.php/Least-squares_line_fitting

  board.unsuspendUpdate();
}

// set a tooltip when hovering over the graph
function setTooltip(tooltip) {
  $('#box').attr('title', tooltip);
}

$(document).ready(initialize);

// helper functions - UNUSED
function getMouseCoords(e) {
  var cPos = board.getCoordsTopLeftCorner(e),
  absPos = JXG.getPosition(e),
  dx = absPos[0]-cPos[0],
  dy = absPos[1]-cPos[1];

  return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
}

function isInGraph(node) {
  var n = node;
  while (n !== null && n.parentElement !== n) {
    if (n.tagName === 'svg') return true;
    n = n.parentElement;
  }
  return false;
}

