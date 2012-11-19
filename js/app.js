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

function dataTables() {
  return $.map($('.datatable'), function(o,i) {
    return $('.datatable:eq(' + i +')').data().handsontable;
  });
}

function importData() {
  // sanitize data
  var points = [];
  var data = $('#datatable').val()
    .split('\n');
  $.each(data, function(i,o) {
    var point = o.split(/[,\ \t]+/);
    if (point.length === 0) return;
    if (!point[0]) return;
    point = $.map(point, function(o,i) { return o*1; }); // cast to float
    points.push(point);
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
  
  // reset graph viewport
  initializeBoard([
    min_x - range_x * margin,
    max_y + range_y * margin,
    max_x + range_x * margin,
    min_y - range_y * margin
  ]);

  // split data into separate functions
  var segments = [];
  var last_x = Number.POSITIVE_INFINITY;
  $.each(points, function(i,o) {
    if (o.length !== 2) return;
    if (o[0] < last_x) {
      var s = [];
      s.index = i;
      segments.push(s);
    }
    last_x = o[0];
    segments[segments.length-1].push(o);
  });

  // add functions
  $.each(segments, function(i,o) {
    if (o.length < 2) return;
    addFunction(o);
  });

  // switch to functions tab
  $('#datatable').empty();
  $('.nav-tabs a[href="#functions"]').tab('show');
}

function update() {
  var points = $.map(data, function(o,i) {
    return [[o[0]*1, o[1]*1]]; // create floats from decimal or scientific notation
  });
}

// reset the app
function reset() {
  $.each(dataTables(), function(i,o) {
      o.clear();
  });
  $('#datatables').empty();
  initializeBoard();
}

// initialize the app
function initialize() {
  initializeBoard();
  //$('#box').aToolTip();
}

// set up the jQuery data table
function initializeTable() {
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
function addFunction(points_data) {
  board.suspendUpdate();
  
  var elem = $('<div class="datatable"></div>')
    .appendTo('#datatables');
  elem.handsontable({
    startRows: 20,
    startCols: 2,
    rowHeaders: false,
    colHeaders: ['X', 'F(X)'],
    minSpareRows: 1,
    minWidth: 400,
    maxWidth: 20,
    fillHandle: true,
    onChange: function(data) {
      var data_table = elem.data().handsontable;
      if (!data_table.listening) return;
      console.log('changing')
      $.each(data_table.drawnElements, function(i,o) {
        //o.remove();
      });
      drawFunction(points_data, data_table);        
    },
    onBeforeChange: function (data) {
      // TODO: reject non-numerical values
      for (var i = data.length - 1; i >= 0; i--) {
        if (data[i][3] === "nuke") return false;
      }
    }
  });

  var data_table = elem.data().handsontable;
  data_table.drawnElements = drawFunction(points_data, data_table);
  $.each(points_data, function(i,o) {
    data_table.setDataAtCell(i, 0, o[0]);
    data_table.setDataAtCell(i, 1, o[1]);
  });
  data_table.listening = true;
}

function drawFunction(points_data, data_table) {
  var points = $.map(points_data, function(o,i) {
    var p = board.create('point', o, point_options);
    JXG.addEvent(p.rendNode, 'mouseup', function(e) {
      data_table.setDataAtCell(i, 0, p.coords.usrCoords[1]);
      data_table.setDataAtCell(i, 1, p.coords.usrCoords[2]);
    }, p);
    return p;
  });
  
  var x_min = points_data[0][0];
  var x_max = points_data[points_data.length-1][0];
  var f = board.create('spline', points, function_options);
  JXG.addEvent(f.rendNode, 'click', function(e) {
    // do stuff to the function
  }, f);
  
  // We can fit a polynomial:
  //var interpolated = board.lagrangePolynomial(p);
  //board.create('functiongraph', [interpolated, x_min, x_max], function_options);
  
  // There is also code for a least-squares best-fit line:
  // http://jsxgraph.uni-bayreuth.de/wiki/index.php/Least-squares_line_fitting
  
  board.unsuspendUpdate();
  return [f].concat(points);
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

