/* **********************************************************************
   Debug
*/

function debugdot(top, left) {
  $('<div/>').css({
    position: 'absolute',
    border: '1px solid black',
    width: '1px',
    height: '1px',
    top: top + 'px',
    left: left + 'px'
  }).appendTo($('body'));
}

/* **********************************************************************
   Globals
*/

var optimalApp = {

  // app globals
  functions: [],
  board: null,
  tooltip: null,
  copyMode: true,
  functionmodel: JXG.Math.Numerics.lagrangePolynomial,

  // for selection
  selectedFunction: null,
  selectedBBox: null,

  // for bounding box for selected functions
  selection: null,
  selectionBasePosition: [0, 0],
  selectionPosition: [0, 0],
  selectionOffset: [0, 0],
  selectionOrigin: [0, 0],
  selectionWidth: 0,
  selectionHeight: 0,
  selectionBaseWidth: 0,
  selectionBaseHeight: 0,
  resizingFrom: null
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
  $('#box').aToolTip({
    inSpeed: 0,
    outSpeed: 0,
    tipContent: function() { return getTooltip(); }
  });
  $('#func-copy').click(function() {
    optimalApp.copyMode = true;
  });
  $('#func-edit').click(function() {
    optimalApp.copyMode = false;
  });
}

/* **********************************************************************
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
    optimalApp.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(1, points);
    };
    break;
  case 'quadratic':
    optimalApp.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(2, points);
    };
    break;
  case 'cubic':
    optimalApp.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(3, points);
    };
    break;
  case 'quartic':
    optimalApp.functionmodel = function(points) {
      return JXG.Math.Numerics.regressionPolynomial(4, points);
    };
    break;
  case 'exponential':
    optimalApp.functionmodel = optimalApp.functionmodel; //TODO
    break;
  case 'logistic':
    optimalApp.functionmodel = optimalApp.functionmodel; //TODO
    break;
  case 'logarithmic':
    optimalApp.functionmodel = optimalApp.functionmodel; //TODO
    break;
  case 'step':
    optimalApp.functionmodel = optimalApp.functionmodel; //TODO
    break;
  case 'gaussian':
    optimalApp.functionmodel = optimalApp.functionmodel; //TODO
    break;
  case 'interpolated':
    optimalApp.functionmodel = JXG.Math.Numerics.CatmullRomSpline;
    break;
  case 'polynomial':
    optimalApp.functionmodel = JXG.Math.Numerics.lagrangePolynomial;
    break;
  default:
    alert('Invalid model to fit function to');
  }
}

/* **********************************************************************
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

/* **********************************************************************
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

/* **********************************************************************
   JSXGraph Board functions
*/

// remove all functions from board
function initializeBoard(boundingbox) {

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
    boundingbox: [-10, 10, 10, -10] // [-x, y, x, -y]
  };

  if (optimalApp.board !== null) {
    JXG.JSXGraph.freeBoard(optimalApp.board);
  }
  if (boundingbox !== undefined) {
    board_options.boundingbox = boundingbox;
  }

  optimalApp.board = JXG.JSXGraph.initBoard('box', board_options);
}

// add a function to the datatable and board
function addFunction(point_data) {
  optimalApp.board.suspendUpdate();
  
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
    onChange: function(data) { 
      console.log('datatable changed');
      //if (data_table.listening)
      // TODO: redraw the points and the functiongraph
      },
    onBeforeChange: function (data) { /* TODO: reject invalid values; see Handsontable demo */ }
  });

  // draw the graphs
  // TODO: data is duplicated between .data and .dataTable
  var func = {
    data: point_data,
    dataTable: elem.data().handsontable,
    drawnSidebar: elem,
    drawnGraph: null,
    drawnPoints: null,
  };  
  func.drawnPoints = drawFunctionPoints(func);
  func.drawnGraph = drawFunctionGraph(func);

  // set values in the data table
  $.each(point_data, function(i,o) {
    func.dataTable.setDataAtCell(i, 0, o[0]);
    func.dataTable.setDataAtCell(i, 1, o[1]);
  });
  func.dataTable.listening = true;

  optimalApp.functions.push(func);
  optimalApp.board.unsuspendUpdate();
  return func;
}

// (re)draw a function's points
function drawFunctionPoints(func) {

  var point_options = {
    style: 6,
    withLabel: false
  };
  
  var xvals = $.map(func.data, function(o,i) { return o[0]; });
  var yvals = $.map(func.data, function(o,i) { return o[1]; });
  var x_min = Math.min.apply(this, xvals);
  var x_max = Math.max.apply(this, xvals);
  
  // create and bind event handler for each point
  var points = $.map(func.data, function(o,i) {
    
    var p = optimalApp.board.create('point', o, point_options);
    
    // mousemove highlight of data table
    JXG.addEvent(p.rendNode, 'click', function(e) {
      //selectFunction(func);
    }, p);

    JXG.addEvent(p.rendNode, 'mouseover', function(e) {
      if (optimalApp.copyMode === true) {
        setTooltip('Drag to copy and edit function');
      } else {
        setTooltip('Drag to edit');
      }
    }, p);

    JXG.addEvent(p.rendNode, 'mouseout', function(e) { // TODO: a proper interaction for canceling the selection
      //unselectFunction(func);
      setTooltip();
    }, p);
    
    // handle copying of functions
    JXG.addEvent(p.rendNode, 'mousedown', function(e) {
      if (!optimalApp.copyMode) return;
      addFunction(deepcopy(func.data));
    }, p);
    
    // handle editing of functions
    JXG.addEvent(p.rendNode, 'mouseup', function(e) {
      func.dataTable.setDataAtCell(i, 0, p.coords.usrCoords[1]);
      func.dataTable.setDataAtCell(i, 1, p.coords.usrCoords[2]);
      func.data[i][0] = p.coords.usrCoords[1];
      func.data[i][1] = p.coords.usrCoords[2];
    }, p);
    
    return p;
  });
  
  return points;
}

// (re)draw a function's graph
function drawFunctionGraph(func) {
  
  var function_options = {
    strokeWidth: 2,
    highlightstrokeWidth: 3,
    withLabel: false
  };

  var xvals = $.map(func.data, function(o,i) { return o[0]; });
  var yvals = $.map(func.data, function(o,i) { return o[1]; });
  var x_min = Math.min.apply(this, xvals);
  var x_max = Math.max.apply(this, xvals);
  
  // draw function graph
  var functionGraph = optimalApp.board.create('functiongraph', [
    optimalApp.functionmodel(func.drawnPoints), x_min, x_max], function_options);
  
  // handle mouseover on function
  JXG.addEvent(functionGraph.rendNode, 'click', function(e) {
    selectFunction(func);
  }, functionGraph);

  JXG.addEvent(functionGraph.rendNode, 'mouseover', function(e) {
    if (optimalApp.copyMode === true) {
      setTooltip('Click to copy and transform function');
    } else {
      setTooltip('Click to transform function');
    }
  }, functionGraph);

  JXG.addEvent(functionGraph.rendNode, 'mouseout', function(e) { // TODO: a proper interaction for canceling the selection
    //unselectFunction(func);
    setTooltip();
  }, functionGraph);
  
  // TODO: handle click/drag on function
  JXG.addEvent(functionGraph.rendNode, 'click', function(e) {
    // TODO: do stuff to the function when it is clicked on, dragged, etc.
  }, functionGraph);
  
  return functionGraph;
}

/* **********************************************************************
   Selection box for functions
*/

function selectFunction(func) {

  $(func.dataTable.rootElement.context).css('opacity', 0.5);
  
  // TODO component: rotate
  // TODO interaction: rotate
  // TODO component: clear selection
  // TODO: interaction: clear selection
  // TODO: redraw bbox upon zoom/pan
  // DEBUG: sometimes one edge of the marquee disappears, why?

  optimalApp.selectedFunction = func;
  optimalApp.selectedBBox = initGrabBox(func.drawnGraph.rendNode);
  optimalApp.selectedBBox.trigger.mousedown(mousedownMoveHandler);
  for (var i in optimalApp.selectedBBox.handler) {
    $(optimalApp.selectedBBox.handler[i]).mousedown(mousedownResizeHandler);
  }
}

function scaleFunction(xscale, yscale, xpivot0_px, ypivot0_px, xpivot_px, ypivot_px) {
  if (xscale === 1 && yscale === 1) return;
  
  var xpivot0 = (xpivot0_px - optimalApp.board.cPos[0] - 
                 optimalApp.board.origin.scrCoords[1]) / optimalApp.board.unitX;
  var ypivot0 = -(ypivot0_px - optimalApp.board.cPos[1] - 
                  optimalApp.board.origin.scrCoords[2]) / optimalApp.board.unitY;
  var xpivot = (xpivot_px - optimalApp.board.cPos[0] - 
                optimalApp.board.origin.scrCoords[1]) / optimalApp.board.unitX;
  var ypivot = -(ypivot_px - optimalApp.board.cPos[1] - 
                 optimalApp.board.origin.scrCoords[2]) / optimalApp.board.unitY;

  console.log(
    'Scaling ' + xscale +'x/' + yscale + 'x from ' + 
      '(' + xpivot0 + ', ' + ypivot0 + ') to ' +
      '(' + xpivot + ', ' + ypivot + ')');

  // update data and points
  $.each(optimalApp.selectedFunction.data, function(i,o) {

    o[0] = xpivot + (o[0] - xpivot0) * xscale;
    o[1] = ypivot + (o[1] - ypivot0) * yscale;
    optimalApp.selectedFunction.drawnPoints[i].moveTo(o);
  });

  // update function graph
  optimalApp.selectedFunction.drawnGraph.remove();
  optimalApp.selectedFunction.drawnGraph = drawFunctionGraph(optimalApp.selectedFunction);
}

function translateFunction(dx_px, dy_px) {

  var dx = dx_px / optimalApp.board.unitX;
  var dy = -dy_px / optimalApp.board.unitY;
  console.log('Translating by (' + dx + ', ' + dy + ')');

  // update data and points
  $.each(optimalApp.selectedFunction.data, function(i,o) {
    o[0] += dx;
    o[1] += dy;
    optimalApp.selectedFunction.drawnPoints[i].moveTo(o);
  });

  // update function graph
  optimalApp.selectedFunction.drawnGraph.remove();
  optimalApp.selectedFunction.drawnGraph = drawFunctionGraph(optimalApp.selectedFunction);
}

function rotateFunction(theta, xpivot_px, ypivot_px) {

  var xpivot = (xpivot_px - optimalApp.board.origin.scrCoords[1]) / optimalApp.board.unitX;
  var ypivot = (ypivot_px - optimalApp.board.origin.scrCoords[2]) / optimalApp.board.unitY;
  console.log('Rotating by ' + theta +' about (' + xpivot + ', ' + ypivot + ')');

}

function unselectFunction(func) {
  $(func.drawnSidebar).css('opacity', 1.0);

  optimalApp.selectedBBox.trigger.unbind('mousedown');
  for (var i in optimalApp.selectedBBox.handler) {
    $(optimalApp.selectedBBox.handler[i]).unbind('mousedown');
  }
}

function getBBoxDimensions() {
  return {
    height: optimalApp.selection.getBBox().height,
    width: optimalApp.selection.getBBox().width,
    top: Math.round(optimalApp.selection.getBoundingClientRect().top),
    left: Math.round(optimalApp.selection.getBoundingClientRect().left)
  };
}

// initialize a selection box around an SVG element
function initGrabBox(svg_elem) {
  optimalApp.selection = svg_elem;
  
  // locate and size the SVG element
  var bbox = getBBoxDimensions();
  var height = bbox.height;
  var width = bbox.width;
  var top = bbox.top;
  var left = bbox.left;
  
  var $parent = $(svg_elem).parents('div').first();
  
  // initialize a bounding box holder as a sibling to <svg>
  var $container = $('<div id="bounding-box" />').css({
    position: 'absolute',
    top: top,
    left: left,
    height: height,
    width: width,
    backgroundColor: 'rgba(0,0,0,0.05)'
  }).insertAfter($parent);
  
  // initialize a layer to receive and handle events
  var $trigger = $('<div id="image-crop-trigger"/>')
    .appendTo($container);
  
  // initialize a marquee outline
  var $outlineN = $('<div id="image-crop-outline-n" />').appendTo($container);
  var $outlineE = $('<div id="image-crop-outline-e" />').appendTo($container);
  var $outlineW = $('<div id="image-crop-outline-w" />').appendTo($container);
  var $outlineS = $('<div id="image-crop-outline-s" />').appendTo($container);
  
  // initialize a div to cover the selection
  var $selection = $('<div id="image-crop-selection"/>')
    .appendTo($container);
  
  // initialize handles on the corners/sides
  var $nwResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-nw-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $nResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-n-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $neResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-ne-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $wResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-w-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $eResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-e-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $swResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-sw-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $sResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-s-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  var $seResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-se-resize-handler" />')
    .css({
      opacity: 0.5,
      position: 'absolute'
    }).insertAfter($selection);
  
  $nResizeHandler.add($sResizeHandler).css({ cursor: 'row-resize' });
  $eResizeHandler.add($wResizeHandler).css({ cursor: 'col-resize' });
  $seResizeHandler.css({ cursor: 'se-resize' });
  $neResizeHandler.css({ cursor: 'ne-resize' });
  $swResizeHandler.css({ cursor: 'sw-resize' });
  $nwResizeHandler.css({ cursor: 'nw-resize' });
  $trigger.css({ cursor: 'move' });
  
  return {
    container: $container,
    trigger: $trigger,
    selection: $selection,
    outline: { north: $outlineN, east: $outlineE, west: $outlineW, south: $outlineS },
    handler: { n: $nResizeHandler, e: $eResizeHandler, w: $wResizeHandler, s: $sResizeHandler, 
               ne: $neResizeHandler, nw: $nwResizeHandler, se: $seResizeHandler, sw: $swResizeHandler }
  };
}

// Drag the bounding box
function mousedownMoveHandler(event) {
  event.preventDefault();
  event.stopPropagation();
  setSelection();

  $(document).mousemove(moveSelection);
  $(document).mouseup(releaseMoveSelection);
};

// Select one of the resize handlers
function mousedownResizeHandler(event) {
  event.preventDefault();
  event.stopPropagation();  
  setSelection();

  $(document).mousemove(resizeSelection);
  $(document).mouseup(releaseResizeSelection);
};

// Resize the current selection
function resizeSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  console.log('Calling resizeSelection');

  var dx = event.pageX - optimalApp.selectionOrigin[0];
  var dy = event.pageY - optimalApp.selectionOrigin[1];

  if (optimalApp.resizingFrom === 'image-crop-nw-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-w-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-sw-resize-handler') {
    optimalApp.selectionPosition[0] = event.pageX;
    optimalApp.selectionWidth = optimalApp.selectionBaseWidth - dx;
  }
  if (optimalApp.resizingFrom === 'image-crop-nw-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-n-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-ne-resize-handler') {
    optimalApp.selectionPosition[1] = event.pageY;
    optimalApp.selectionHeight = optimalApp.selectionBaseHeight - dy;
  }
  if (optimalApp.resizingFrom === 'image-crop-se-resize-handler' ||
     optimalApp.resizingFrom === 'image-crop-s-resize-handler' ||
     optimalApp.resizingFrom === 'image-crop-sw-resize-handler') {
    optimalApp.selectionHeight = dy + optimalApp.selectionBaseHeight;
  }
  if (optimalApp.resizingFrom === 'image-crop-ne-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-e-resize-handler' ||
      optimalApp.resizingFrom === 'image-crop-se-resize-handler') {
    optimalApp.selectionWidth = dx + optimalApp.selectionBaseWidth;
  }

  updateSelection();
};

// Move the current selection
function moveSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  console.log('Calling moveSelection');
  
  optimalApp.selectionPosition[0] = event.pageX - optimalApp.selectionOffset[0];
  optimalApp.selectionPosition[1] = event.pageY - optimalApp.selectionOffset[1];
  
  updateSelection();
};

function releaseResizeSelection(event) {
  console.log('Calling releaseResizeSelection');

  resizeSelection(event);
  releaseSelection(event);

  scaleFunction(
    optimalApp.selectionWidth / optimalApp.selectionBaseWidth,
    optimalApp.selectionHeight / optimalApp.selectionBaseHeight,
    optimalApp.selectionBasePosition[0] + optimalApp.selectionBaseWidth/2,
    optimalApp.selectionBasePosition[1] + optimalApp.selectionBaseHeight/2,
    optimalApp.selectionPosition[0] + optimalApp.selectionWidth/2,
    optimalApp.selectionPosition[1] + optimalApp.selectionHeight/2
  );
}

function releaseRotateSelection(event) {
  console.log('Calling releaseRotateSelection');

  rotateSelection(event);
  releaseSelection(event);
  // TODO
}

function releaseMoveSelection(event) {
  console.log('Calling releaseMoveSelection');

  moveSelection(event);
  releaseSelection(event);

  translateFunction(
    event.pageX - optimalApp.selectionOrigin[0],
    event.pageY - optimalApp.selectionOrigin[1]
  );
}

// Release the current selection
function releaseSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  $(document).unbind('mousemove');
  $(document).unbind('mouseup');  
  // TODO: unset and redraw the bounding box
  // TODO: refactor to reuse the bounding box
};

/* **********************************************************************
   Helper functions
*/

// save the initial dimensions of the bounding box when making a selection
function setSelection() {
  var bbox = $('#bounding-box');

  optimalApp.selectionWidth = bbox.width();
  optimalApp.selectionHeight = bbox.height();

  optimalApp.selectionBaseWidth = bbox.width();
  optimalApp.selectionBaseHeight = bbox.height();

  optimalApp.selectionPosition[0] = bbox.position().left;
  optimalApp.selectionPosition[1] = bbox.position().top;

  optimalApp.selectionBasePosition[0] = bbox.position().left;
  optimalApp.selectionBasePosition[1] = bbox.position().top;

  optimalApp.selectionOffset[0] = event.offsetX;
  optimalApp.selectionOffset[1] = event.offsetY;

  optimalApp.selectionOrigin[0] = event.pageX;
  optimalApp.selectionOrigin[1] = event.pageY;

  optimalApp.resizingFrom = event.target.id;
}

// temporarily transform the selection box we can redraw the graph
function updateSelection() {

  var bbox = $('#bounding-box')
    .css({ 
      left: optimalApp.selectionPosition[0],
      top: optimalApp.selectionPosition[1]
    })
    .width(Math.max(optimalApp.selectionWidth, 0))
    .height(Math.max(optimalApp.selectionHeight, 0));
};

// set a tooltip when hovering over the graph
function setTooltip(text) {
  if (text !== undefined) {
    // show tooltip with text
    $('#aToolTip').show();
    $('.aToolTipContent').text(text);
    optimalApp.tooltip = text;
  } else {
    // hide tooltip
    $('#aToolTip').hide();
    optimalApp.tooltip = null;
  }
}

function getTooltip() {
  return optimalApp.tooltip;
}

// get graph coordinates from a click on the graph
function getMouseCoords(e) {
  var cPos = optimalApp.board.getCoordsTopLeftCorner(e),
  absPos = JXG.getPosition(e),
  dx = absPos[0]-cPos[0],
  dy = absPos[1]-cPos[1];
  
  return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], optimalApp.board);
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
  return $.extend(true, [], arr);
}

/* **********************************************************************
   Initialization
*/

$(document).ready(initialize);
