/* ****************************************************************************************************
   Globals
*/

var board;
var state = {
  copy_mode: true,
  functionmodel: JXG.Math.Numerics.lagrangePolynomial
};

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
  $('#xaxis-lin').click(function() {
    // TODO
  });
  $('#xaxis-log').click(function() {
    // TODO
  });
  $('#yaxis-lin').click(function() {
    // TODO
  });
  $('#yaxis-log').click(function() {
    // TODO
  });
  $('#func-copy').click(function() { state.copy_mode = true; });
  $('#func-edit').click(function() { state.copy_mode = false; });
  //$('#box').aToolTip();
}

/* ****************************************************************************************************
   Presets tab
*/

// initialize the graph with preset points and a type of function
function setModel(model) {
  switchModel(model);
  importPoints(presets[model]);
}

// switch the type of function graphed
function switchModel(model) {
  switch (model) {
  case 'linear':
    state.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(1, points);
    };
    break;
  case 'quadratic':
    state.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(2, points);
    };
    break;
  case 'cubic':
    state.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(3, points);
    };
    break;
  case 'quartic':
    state.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(4, points);
    };
    break;
  case 'exponential':
    state.functionmodel = state.functionmodel; //TODO
    break;
  case 'logistic':
    state.functionmodel = state.functionmodel; //TODO
    break;
  case 'logarithmic':
    state.functionmodel = state.functionmodel; //TODO
    break;
  case 'step':
    state.functionmodel = state.functionmodel; //TODO
    break;
  case 'gaussian':
    state.functionmodel = state.functionmodel; //TODO
    break;
  case 'interpolated':
    state.functionmodel = JXG.Math.Numerics.CatmullRomSpline;
    break;
  case 'polynomial':
    state.functionmodel = JXG.Math.Numerics.lagrangePolynomial;
    break;
  default:
    alert('Invalid model to fit function to');
  }
}

/* ****************************************************************************************************
   Function Editor tab
*/

function dataTables() {
  return $.map($('.datatable'), function(o,i) {
    return $('.datatable:eq(' + i +')').data().handsontable;
  });
}

// set up the jQuery data table
function initializeTable() {
}

/* ****************************************************************************************************
   Import Data tab
*/

// export data as JSON to the textarea
function exportData() {
  var tables = $('.datatable');
  var json = $.map(tables, function(o,i) {
    // strip out [null, null] points
    var data = $(o).data().handsontable.getData();
    return $.map(data, function(oo,ii) {
      if (oo[0] !== null) return [oo];
    });
  });
  $('#datatable').val(JSON.stringify(json));
}

// import data as JSON or OmniGraphSketcher format from the textarea
function importData() {
  var raw_data = $('#datatable').val().trim();
  
  try {
    importPoints(JSON.parse(raw_data));
    return;
  } catch(err) {
    
    // sanitize data and treat as OmniGraphSketcher format
    var points = [];
    var data = raw_data.split('\n');
    if (data.length === 0) return;
    $.each(data, function(i,o) {
      var point = o.split(/[,\ \t]+/);
      if (point.length === 0) return;
      if (!point[0]) return;
      point = $.map(point, function(o,i) { return o*1; }); // cast to float
      points.push(point);
    });
    importPoints(points);
  }
}

// import data from points onto the graph
function importPoints(points) {
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

/* ****************************************************************************************************
   JSXGraph Board functions
*/

// remove all functions from board
function initializeBoard(boundingbox) {
  if (board !== undefined) JXG.JSXGraph.freeBoard(board);
  if (boundingbox !== undefined) {
    board_options.boundingbox = boundingbox;
  }
  board = JXG.JSXGraph.initBoard('box', board_options);
}

// draw a function according to the datatable
function updateFunction(elem, point_data) {
  var data_table = elem.data().handsontable;
  if (data_table.listening) {
    data.table_drawnFunction = drawFunctionGraph(data_table.drawnPoints, data_table);
  }
}

// add a function to the datatable and board
function addFunction(point_data) {
  board.suspendUpdate();
  
  // create datatable
  var elem = $('<div class="datatable"></div>')
    .appendTo('#datatables');
  elem.handsontable({
    startRows: 3,
    startCols: 2,
    rowHeaders: false,
    colHeaders: ['X', 'F(X)'],
    minSpareRows: 1,
    fillHandle: true,
    onChange: function(data) { updateFunction(elem, point_data); },
    onBeforeChange: function (data) { /* TODO: reject invalid values; see Handsontable demo */ }
  });
  
  // draw the function
  var data_table = elem.data().handsontable;
  data_table.drawnPoints = drawFunctionPoints(point_data, data_table);
  data_table.drawnFunction = drawFunctionGraph(data_table.drawnPoints, data_table);
  
  $.each(point_data, function(i,o) {
    data_table.setDataAtCell(i, 0, o[0]);
    data_table.setDataAtCell(i, 1, o[1]);
  });
  
  data_table.listening = true;
  board.unsuspendUpdate();
  return data_table;
}

// (re)draw a function's points
function drawFunctionPoints(point_data, data_table) {
  
  var x_min = point_data[0][0];
  var x_max = point_data[point_data.length-1][0];
  
  var points = $.map(point_data, function(o,i) {
    
    // draw points
    var p = board.create('point', o, point_options);
    
    // mousemove highlight of data table
    // TODO: get a better effect
    JXG.addEvent(p.rendNode, 'mouseover', function(e) {
      highlightFunction(data_table.rootElement.context); }, p);
    JXG.addEvent(p.rendNode, 'mouseout', function(e) {
      unhighlightFunction(data_table.rootElement.context); }, p);
    
    // handle copying of functions
    JXG.addEvent(p.rendNode, 'mousedown', function(e) {
      if (!state.copy_mode) return;
      addFunction(deepcopy(point_data));
    }, p);
    
    // handle editing of functions
    JXG.addEvent(p.rendNode, 'mouseup', function(e) {
      data_table.setDataAtCell(i, 0, p.coords.usrCoords[1]);
      data_table.setDataAtCell(i, 1, p.coords.usrCoords[2]);
      if (!state.copy_mode) return;
      point_data[i][0] = p.coords.usrCoords[1];
      point_data[i][1] = p.coords.usrCoords[2];
    }, p);
    
    return p;
  });
  
  return points;
}

// (re)draw a function's graph
function drawFunctionGraph(points, data_table) {
  
  var x_min = points[0].coords.usrCoords[1];
  var x_max = points[points.length-1].coords.usrCoords[1];
  
  // draw function graph
  var func = board.create('functiongraph', [
    state.functionmodel(points), x_min, x_max], function_options);
  
  // handle mouseover on function
  JXG.addEvent(func.rendNode, 'mouseover', function(e) {
    highlightFunction(data_table.rootElement.context); }, func);
  JXG.addEvent(func.rendNode, 'mouseout', function(e) {
    unhighlightFunction(data_table.rootElement.context); }, func);
  
  // TODO: handle click/drag on function
  JXG.addEvent(func.rendNode, 'click', function(e) {
    // TODO: do stuff to the function when it is clicked on, dragged, etc.
  }, func);
  
  return func;
}

function highlightFunction(el) {
  $(el).css('opacity', 0.5);
}

function unhighlightFunction(el) {
  $(el).css('opacity', 1.0);
}

/* ****************************************************************************************************
   Helper functions
*/

// set a tooltip when hovering over the graph
function setTooltip(tooltip) {
  $('#box').attr('title', tooltip);
}

// get graph coordinates from a click on the graph
function getMouseCoords(e) {
  var cPos = board.getCoordsTopLeftCorner(e),
  absPos = JXG.getPosition(e),
  dx = absPos[0]-cPos[0],
  dy = absPos[1]-cPos[1];
  
  return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
}

// check if an element is a child of the graph element
function isInGraph(node) {
  var n = node;
  while (n !== null && n.parentElement !== n) {
    if (n.tagName === 'svg') return true;
    n = n.parentElement;
  }
  return false;
}

// full depth copy for arrays of arrays
function deepcopy(arr) {
  console.log(arr)
  return $.extend(true, [], arr);
}

/* **************************************************************************************************** */

$(document).ready(initialize);
