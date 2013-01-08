/* **********************************************************************
   Globals
*/

var optimalApp = {    
    // app globals
  functions: [],
  model: null,
  board: null,
  tooltip: null,
  copyMode: true,
  logXMode: false,
  logYMode: false,
  functionmodel: JXG.Math.Numerics.lagrangePolynomial,
  
  // for axes
  xAxisName: null,
  yAxisName: null,  
  xLogRange: 0,
  yLogRange: 0,
  
  // for selection
  selectedFunction: null,
  selectedBBox: null,
  
  // for bounding box for selected functions
  selectionBasePosition: [0, 0],
  selectionPosition: [0, 0],
  selectionOffset: [0, 0],
  selectionOrigin: [0, 0],
  selectionRotation: 0,
  selectionWidth: 0,
  selectionHeight: 0,
  selectionBaseWidth: 0,
  selectionBaseHeight: 0,
  resizingFrom: null
};

/* **********************************************************************
   Presets tab
*/

// initialize the graph with preset points and a type of function
function setModel(model) {  
  initializeBoard();
  switchModel(model);
  
  var presets = {
    linear: [
      [1,1],
      [5,3]
    ],
    quadratic: [
      [1,0.2],
      [3,1.8],
      [5,5.0]
    ],
    cubic: [
      [1,0.2],
      [3,1.8],
      [5,5.0],
      [7,12.0]
    ],
    quartic: [
      [1,0.2],
      [3,1.8],
      [5,5.0],
      [7,12.0],
      [9,64.0]
    ],
    exponential: [
    ],
    logistic: [
    ],
    logarithmic: [
    ],
    step: [
    ],
    gaussian: [
    ],
    interpolated: [
      [1,7],
      [3,5],
      [5,4],
      [7,3],
      [9,1]
    ],
    polynomial: [
      [1,7],
      [3,5],
      [5,4],
      [7,3],
      [9,1]
    ]
  };
  
  var initial_points = $.map(presets[model], function(o,i) {
    return [[
      o[0] * Math.exp( (optimalApp.xLogRange-1) * Math.LN10 ), 
      o[1] * Math.exp( (optimalApp.yLogRange-1) * Math.LN10 )
    ]];
  });
  importPoints(initial_points);
  centerBoard();
}

// switch the type of function graphed
function switchModel(model) {
  optimalApp.model = model;
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

// calls the server
function submit() {
  var data = $.map(optimalApp.functions, function(o,i) {
    return [o.data];
  });

  $.post('/api', {
    data: data, 
    model: optimalApp.model
  }, function(result, textStatus, jqxhr) {
    // return covariance results upon successful API call
    console.log(result);
  });
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

// centers board on 
function centerBoard() {
  var points, min_x, min_y, max_x, max_y;
  if (optimalApp.selectedFunction !== null) {
    points = optimalApp.selectedFunction.data;
  } else {
    points = $.map(optimalApp.functions, function(o,i) { return o.data; });
  }
  
  // calculate min/max of data
  $.each(points, function(i,unfiltered_point) {
    var o = pointFilter(unfiltered_point);
    if (o.length !== 2) return;
    if (min_x === undefined || o[0] < min_x) min_x = o[0];
    if (max_x === undefined || o[0] > max_x) max_x = o[0];
    if (min_y === undefined || o[1] < min_y) min_y = o[1];
    if (max_y === undefined || o[1] > max_y) max_y = o[1];
  });
  var range_x = max_x - min_x;
  var range_y = max_y - min_y;
  var margin = 0.1;
  
  // resize graph around the data
  optimalApp.board.setBoundingBox([
    min_x - range_x * margin,
    max_y + range_y * margin,
    max_x + range_x * margin,
    min_y - range_y * margin
  ]);
}

// import data from points onto the graph
function importPoints(points) {
  initializeBoard();

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
  $('#graph-overlay').hide();
  $('.jxgbox').css('opacity', 1.0);
}

/* **********************************************************************
   JSXGraph Board functions
*/

// reset the board, functions, and global variable
function initializeBoard() {
  
  // reset app elements
  $('#datatables').empty();  
  optimalApp.selectedFunction = null;
  optimalApp.selectedBBox = null;
  optimalApp.logXMode = false;
  optimalApp.logYMode = false;

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
    boundingbox: [-10, 10, 10, -10] // to be set by centerBoard()
  };
  
  if (optimalApp.board !== null) {
    JXG.JSXGraph.freeBoard(optimalApp.board);
  }
  
  optimalApp.board = JXG.JSXGraph.initBoard('box', board_options);
  
  optimalApp.board.addHook(redrawSelectionBox, 'update');
}

function removeFunction(func) {
  var index = optimalApp.functions.indexOf(func);
  if (index === -1) return;
  
  optimalApp.functions.splice(index);
  
  // remove data table
  func.dataTable.destroy();
  func.drawnSidebar.detach();
  
  // remove function graph and points
  func.drawnGraph.remove();
  $.each(func.drawnPoints, function(i,o) {
    o.remove();
  });
  
  // remove any selection box
  if (optimalApp.selectedFunction === func) {
    unselectFunction();
  }
  
  // switch back to the chooser if we have cleared all functions
  if (optimalApp.functions.length === 0) {
    $('.nav-tabs a[href="#presets"]').tab('show');
    $('#graph-overlay').show();
    $('.jxgbox').css('opacity', 0.2);
  }
}

// add a function to the datatable and board
function addFunction(point_data) { 
  optimalApp.board.suspendUpdate();
  
  var func = {
    data: point_data,
    dataTable: null,
    drawnSidebar: null,
    drawnGraph: null,
    drawnPoints: null
  }; 
  
  // create datatable
  func.drawnSidebar =
    $('<div class="datatable"></div>')
    .appendTo('#datatables');
  
  // create delete button
  $('<a class="remove-function" href="#"><i class="icon-trash"></i></a>')
    .click(function() { removeFunction(func); })
    .appendTo(func.drawnSidebar);
  
  func.drawnSidebar.handsontable({
    startRows: 3,
    startCols: 2,
    rowHeaders: false,
    colHeaders: getColHeaders(),
    minSpareRows: 1,
    fillHandle: true,
    onChange: function(data) { _redrawFunction(func); },
    onBeforeChange: function (data) { /* TODO reject invalid values as in Handsontable demo */ }
  });
  
  // draw the graphs
  // careful: data is duplicated between .data and .dataTable
  func.dataTable = func.drawnSidebar.data().handsontable;
  func.drawnPoints = drawFunctionPoints(func);
  func.drawnGraph = drawFunctionGraph(func);
  updateDataTable(func);
  
  optimalApp.functions.push(func);
  optimalApp.board.unsuspendUpdate();
  return func;
}

function updateDataTable(func) {
  // set values in the data table
  func.dataTable.listening = false;
  $.each(func.data, function(i,o) {
    func.dataTable.setDataAtCell(i, 0, o[0]);
    func.dataTable.setDataAtCell(i, 1, o[1]);
  });
  func.dataTable.listening = true;
}

function _redrawFunction(func) { 
  if (func.dataTable && func.dataTable.listening) {
    
    func.data = $.map(func.dataTable.getData(), function(o,i) {
      if (o[0] !== null && o[1] !== null) return [o];
    });
    
    // redraw points
    $.each(func.drawnPoints, function(i,o) {
      o.remove();
    });
    func.drawnPoints = drawFunctionPoints(func);
    
    // redraw graph
    func.drawnGraph.remove();
    func.drawnGraph = drawFunctionGraph(func);
  }
}

// (re)draw a function's points
function drawFunctionPoints(func) {
  
  var point_options = {
    style: 6,
    withLabel: false
  };
  
  var xvals = $.map(func.data, function(o,i) { return pointFilter(o)[0]; });
  var yvals = $.map(func.data, function(o,i) { return pointFilter(o)[1]; });
  var x_min = Math.min.apply(this, xvals);
  var x_max = Math.max.apply(this, xvals);
  
  // create and bind event handler for each point
  var points = $.map(func.data, function(o,i) {
    
    var p = optimalApp.board.create('point', pointFilter(o), point_options);
    
    // mousemove highlight of data table
    JXG.addEvent(p.rendNode, 'click', function(e) {
      //selectFunction(func);
    }, p);
    
    // display tooltip when mouse is over function
    JXG.addEvent(p.rendNode, 'mouseover', function(e) {
      if (optimalApp.copyMode === true) {
        setTooltip('Drag to copy and edit function');
      } else {
        setTooltip('Drag to edit');
      }
    }, p);
    
    // clear tooltip when mouse is not over function
    JXG.addEvent(p.rendNode, 'mouseout', function(e) {
      setTooltip();
    }, p);
    
    // handle copying of functions
    JXG.addEvent(p.rendNode, 'mousedown', function(e) {
      if (!optimalApp.copyMode) return;
      addFunction(deepcopy(func.data));
    }, p);
    
    // handle editing of functions
    JXG.addEvent(p.rendNode, 'mouseup', function(e) {
      var newpoint = [p.coords.usrCoords[1], p.coords.usrCoords[2]];
      func.dataTable.setDataAtCell(i, 0, pointInvFilter(newpoint)[0]);
      func.dataTable.setDataAtCell(i, 1, pointInvFilter(newpoint)[1]);
      func.data[i][0] = pointInvFilter(newpoint)[0];
      func.data[i][1] = pointInvFilter(newpoint)[1];
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
  
  var xvals = $.map(func.data, function(o,i) { return pointFilter(o)[0]; });
  var yvals = $.map(func.data, function(o,i) { return pointFilter(o)[1]; });
  var x_min = Math.min.apply(this, xvals);
  var x_max = Math.max.apply(this, xvals);
  
  // draw function graph
  var functionGraph = optimalApp.board.create('functiongraph', [
    optimalApp.functionmodel(func.drawnPoints), x_min, x_max], function_options);
  
  // handle mouseover on function
  JXG.addEvent(functionGraph.rendNode, 'click', function(e) {
    selectFunction(func);
  }, functionGraph);
  
  // display tooltip when mouse is over function
  JXG.addEvent(functionGraph.rendNode, 'mouseover', function(e) {
    if (optimalApp.copyMode === true) {
      setTooltip('Click to copy and transform function');
    } else {
      setTooltip('Click to transform function');
    }
  }, functionGraph);
  
  // clear tooltip when mouse is not over function
  JXG.addEvent(functionGraph.rendNode, 'mouseout', function(e) {
    setTooltip();
  }, functionGraph);
  
  JXG.addEvent(functionGraph.rendNode, 'click', function(e) {
    // no additional interactions when a function graph is clicked on yet
  }, functionGraph);
  
  return functionGraph;
}


/* **********************************************************************
   Graph and Point related functions
*/

// set x/y axes of graph to logarithmic or linear, and update graph
function updateAxes() {
  
  // update column labels on the data tables
  var xlabels = 
    $('.handsontable th.htColHeader:first-child span').text(getColHeaders()[0]);
  var ylabels = 
    $('.handsontable th.htColHeader span').not(xlabels).text(getColHeaders()[1]);
  
  // redraw functions and recenter graph using the new scale
  for (var i in optimalApp.functions) {
    _redrawFunction(optimalApp.functions[i]);
  }
  centerBoard();
}

function getColHeaders() {
  return [ 
    optimalApp.logXMode ? 'log(X)' : 'X',
    optimalApp.logYMode ? 'log F(X)' : 'F(X)'
  ];
}

/*
// disabled filters
function pointFilter(o) { return o; }
function pointInvFilter(o) { return o; }
*/

// filter for point data used when rendering points onto the graph
// accepts and returns [x, y] array used to construct a point
function pointFilter(o) {
  if (!optimalApp.logXMode && !optimalApp.logYMode) return o;
  var newpoint = [
    optimalApp.logXMode ? Math.log(o[0]) / Math.LN10 : o[0], 
    optimalApp.logYMode ? Math.log(o[1]) / Math.LN10 : o[1]
  ];
  console.log(
    'filtering point ' + JSON.stringify(o) + '=>' + JSON.stringify(newpoint)
  );
  return newpoint;
}

function pointInvFilter(o) {
  if (!optimalApp.logXMode && !optimalApp.logYMode) return o;
  var newpoint = [
    optimalApp.logXMode ? Math.exp(Math.LN10 * o[0]) : o[0], 
    optimalApp.logYMode ? Math.exp(Math.LN10 * o[1]) : o[1]
  ];
  console.log(
    'filtering point inversely ' + JSON.stringify(o) + '=>' + JSON.stringify(newpoint)
  );
  return newpoint;
}

/* **********************************************************************
   Selection box for functions
*/

function locateSelectionBox() {
  return {
    height: optimalApp.selectedFunction.drawnGraph.rendNode.getBBox().height,
    width: optimalApp.selectedFunction.drawnGraph.rendNode.getBBox().width,
    top: Math.round(optimalApp.selectedFunction.drawnGraph.rendNode.getBoundingClientRect().top),
    left: Math.round(optimalApp.selectedFunction.drawnGraph.rendNode.getBoundingClientRect().left)
  };
}

function selectFunction(func) {
  
  $(func.dataTable.rootElement.context).css('opacity', 0.5);
  
  optimalApp.selectedFunction = func;
  optimalApp.selectedBBox = initSelectionBox(func.drawnGraph);
  optimalApp.selectedBBox.trigger.mousedown(mousedownMoveHandler);
  optimalApp.selectedBBox.rotator.mousedown(mousedownRotateHandler);
  for (var i in optimalApp.selectedBBox.handle) {
    $(optimalApp.selectedBBox.handle[i]).mousedown(mousedownResizeHandler);
  }
}

function unselectFunction() {
  $(optimalApp.selectedFunction.drawnSidebar).css('opacity', 1.0);
  
  for (var i in optimalApp.selectedBBox.handle) {
    $(optimalApp.selectedBBox.handle[i]).unbind();
  }
  optimalApp.selectedBBox.trigger.unbind();
  optimalApp.selectedBBox.container.detach();
  optimalApp.selectedFunction = null;
  optimalApp.selectedBBox = null;
}

function scaleFunction(xscale, yscale, xpivot0_px, ypivot0_px, xpivot_px, ypivot_px) {
  optimalApp.board.suspendUpdate();
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
    var newpoint = [
      xpivot + (pointFilter(o)[0] - xpivot0) * xscale,
      ypivot + (pointFilter(o)[1] - ypivot0) * yscale
    ];
    o[0] = pointInvFilter(newpoint)[0];
    o[1] = pointInvFilter(newpoint)[1];
    optimalApp.selectedFunction.drawnPoints[i].moveTo(newpoint);
  });
  
  // update function graph and data table
  updateDataTable(optimalApp.selectedFunction);
  optimalApp.selectedFunction.drawnGraph.remove();
  optimalApp.selectedFunction.drawnGraph = drawFunctionGraph(optimalApp.selectedFunction);
  optimalApp.board.unsuspendUpdate();
}

function translateFunction(dx_px, dy_px) {
  optimalApp.board.suspendUpdate();
  
  var dx = dx_px / optimalApp.board.unitX;
  var dy = -dy_px / optimalApp.board.unitY;
  console.log('Translating by (' + dx + ', ' + dy + ')');
  
  // update data and points
  $.each(optimalApp.selectedFunction.data, function(i,o) {
    var newpoint = [o[0] + dx, o[1] + dy];
    o[0] = pointInvFilter(newpoint)[0];
    o[1] = pointInvFilter(newpoint)[1];
    optimalApp.selectedFunction.drawnPoints[i].moveTo(newpoint);
  });
  
  // update function graph and data table
  updateDataTable(optimalApp.selectedFunction);
  optimalApp.selectedFunction.drawnGraph.remove();
  optimalApp.selectedFunction.drawnGraph = drawFunctionGraph(optimalApp.selectedFunction);
  optimalApp.board.unsuspendUpdate();
}

function rotateFunction(theta, xpivot_px, ypivot_px) {
  optimalApp.board.suspendUpdate();
  
  var xpivot = (xpivot_px - optimalApp.board.cPos[0] - 
                optimalApp.board.origin.scrCoords[1]) / optimalApp.board.unitX;
  var ypivot = -(ypivot_px - optimalApp.board.cPos[1] - 
                 optimalApp.board.origin.scrCoords[2]) / optimalApp.board.unitY;
  console.log('Rotating by ' + theta * 180/Math.PI + 'deg ' + 
              'about (' + xpivot + ', ' + ypivot + ')');
  
  // update data and points
  $.each(optimalApp.selectedFunction.data, function(i,o) {
    var newpoint = [
      (pointFilter(o)[0]-xpivot) * Math.cos(theta) -
        (pointFilter(o)[1]-ypivot) * Math.sin(theta) + xpivot,
      (pointFilter(o)[0]-xpivot) * Math.sin(theta) +
        (pointFilter(o)[1]-ypivot) * Math.cos(theta) + ypivot
    ];
    o[0] = pointInvFilter(newpoint)[0];
    o[1] = pointInvFilter(newpoint)[1];
    optimalApp.selectedFunction.drawnPoints[i].moveTo(newpoint);
  });
  
  // update function graph and data table
  updateDataTable(optimalApp.selectedFunction);
  optimalApp.selectedFunction.drawnGraph.remove();
  optimalApp.selectedFunction.drawnGraph = drawFunctionGraph(optimalApp.selectedFunction);
  optimalApp.board.unsuspendUpdate();
}

// initialize a selection box around an SVG element
function initSelectionBox(jxg_elem) {
  console.log('Calling initSelectionBox');
  optimalApp.selectedFunction.drawnGraph = jxg_elem;
  
  // locate and size the SVG element
  var bbox = locateSelectionBox();
  var height = bbox.height;
  var width = bbox.width;
  var top = bbox.top;
  var left = bbox.left;
  
  var $parent = $(jxg_elem.rendNode).parents('div').first();
  
  // initialize a bounding box holder as a sibling to <svg>
  var $container = $('<div id="bounding-box" />').css({
    position: 'absolute',
    top: Math.round(top),
    left: Math.round(left),
    height: Math.round(height),
    width: Math.round(width),
    backgroundColor: 'rgba(0,0,0,0.05)'
  }).insertAfter($parent); 
  /* we should use appendTo so we can set overflow: hidden 
     on the parent element, which also requires us to position 
     the bounding box relative to the graph box rather than the page 
  */
  
  // initialize a layer to receive and handle events
  var $trigger = $('<div id="image-crop-trigger"/>')
    .appendTo($container);
  
  // initialize a marquee outline
  var $outlineN = $('<div id="image-crop-outline-n" />').appendTo($container);
  var $outlineE = $('<div id="image-crop-outline-e" />').appendTo($container);
  var $outlineW = $('<div id="image-crop-outline-w" />').appendTo($container);
  var $outlineS = $('<div id="image-crop-outline-s" />').appendTo($container);
  
  // initialize handle for rotating the selection
  var $rotator = $('<div id="image-crop-rotate-handle"/>')
    .appendTo($container);
  var $center = $('<div id="image-crop-rotate-center"/>')
    .appendTo($container);
  
  // initialize handles on the corners/sides
  var $nwResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-nw-resize-handle" />')
    .appendTo($container);
  var $nResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-n-resize-handle" />')
    .appendTo($container);
  var $neResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-ne-resize-handle" />')
    .appendTo($container);
  var $wResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-w-resize-handle" />')
    .appendTo($container);
  var $eResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-e-resize-handle" />')
    .appendTo($container);
  var $swResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-sw-resize-handle" />')
    .appendTo($container);
  var $sResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-s-resize-handle" />')
    .appendTo($container);
  var $seResizeHandle = $('<div class="image-crop-resize-handle" id="image-crop-se-resize-handle" />')
    .appendTo($container);
  
  // initialize a button to clear the selection
  var $clearbutton = $('<input id="image-crop-clear-selection" type="button" value="Clear Selection"/>')
    .mouseup(clearSelectionBox)
    .appendTo($container);
  
  $nResizeHandle.add($sResizeHandle).css({ cursor: 'row-resize' });
  $eResizeHandle.add($wResizeHandle).css({ cursor: 'col-resize' });
  $seResizeHandle.css({ cursor: 'se-resize' });
  $neResizeHandle.css({ cursor: 'ne-resize' });
  $swResizeHandle.css({ cursor: 'sw-resize' });
  $nwResizeHandle.css({ cursor: 'nw-resize' });
  $trigger.css({ cursor: 'move' });
  
  return {
    container: $container,
    outline: { north: $outlineN, east: $outlineE, west: $outlineW, south: $outlineS },
    trigger: $trigger,
    rotator: $rotator,
    center: $center,
    handle: { 
      n: $nResizeHandle, e: $eResizeHandle, w: $wResizeHandle, s: $sResizeHandle, 
      ne: $neResizeHandle, nw: $nwResizeHandle, se: $seResizeHandle, sw: $swResizeHandle 
    }
  };
}

// handler to clear selection when e.g. user clicks outside selection box
function clearSelectionBox() {
  console.log('clearSelectionBox called');
  unselectFunction();
}

// handler to redraw bounding box upon zooming/scrolling
function redrawSelectionBox() {
  console.log('redrawSelectionBox called');
  
  if (optimalApp.selectedFunction !== null && 
      optimalApp.selectedBBox !== null &&
      optimalApp.selectedBBox.container !== null) {
    optimalApp.selectedBBox.container.detach();
    
    optimalApp.selectedBBox = initSelectionBox(optimalApp.selectedFunction.drawnGraph);
    optimalApp.selectedBBox.trigger.mousedown(mousedownMoveHandler);
    optimalApp.selectedBBox.rotator.mousedown(mousedownRotateHandler);
    for (var i in optimalApp.selectedBBox.handle) {
      $(optimalApp.selectedBBox.handle[i]).mousedown(mousedownResizeHandler);
    }
  }
}

// Drag the bounding box
function mousedownMoveHandler(event) {
  setSelection();
  releaseSelection(event);
  $(document).mousemove(moveSelection);
  $(document).mouseup(releaseMoveSelection);
}

// Select one of the resize handles
function mousedownResizeHandler(event) {
  setSelection();
  releaseSelection(event);
  $(document).mousemove(resizeSelection);
  $(document).mouseup(releaseResizeSelection);
}

// Select the rotation handle
function mousedownRotateHandler(event) {
  setSelection();
  releaseSelection(event);
  $(document).mousemove(rotateSelection);
  $(document).mouseup(releaseRotateSelection);
}

// Resize the current selection
function resizeSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  console.log('Calling resizeSelection');
  
  var dx = event.pageX - optimalApp.selectionOrigin[0];
  var dy = event.pageY - optimalApp.selectionOrigin[1];
  
  if (optimalApp.resizingFrom === 'image-crop-nw-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-w-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-sw-resize-handle') {
    optimalApp.selectionPosition[0] = event.pageX;
    optimalApp.selectionWidth = optimalApp.selectionBaseWidth - dx;
  }
  if (optimalApp.resizingFrom === 'image-crop-nw-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-n-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-ne-resize-handle') {
    optimalApp.selectionPosition[1] = event.pageY;
    optimalApp.selectionHeight = optimalApp.selectionBaseHeight - dy;
  }
  if (optimalApp.resizingFrom === 'image-crop-se-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-s-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-sw-resize-handle') {
    optimalApp.selectionHeight = dy + optimalApp.selectionBaseHeight;
  }
  if (optimalApp.resizingFrom === 'image-crop-ne-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-e-resize-handle' ||
      optimalApp.resizingFrom === 'image-crop-se-resize-handle') {
    optimalApp.selectionWidth = dx + optimalApp.selectionBaseWidth;
  }
  
  updateSelection();
}

// Move the current selection
function moveSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  console.log('Calling moveSelection');
  
  optimalApp.selectionPosition[0] = event.pageX - optimalApp.selectionOffset[0];
  optimalApp.selectionPosition[1] = event.pageY - optimalApp.selectionOffset[1];
  
  updateSelection();
}

function rotateSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  console.log('Calling rotateSelection');
  
  // we assume the selection starts from vertical, and redraw the selection box upon rotation
  var cx = optimalApp.selectionBasePosition[0] + Math.round(optimalApp.selectionBaseWidth/2);
  var cy = optimalApp.selectionBasePosition[1] + Math.round(optimalApp.selectionBaseHeight/2);
  optimalApp.selectionRotation = 
    90 + (180/Math.PI) * Math.atan2(event.pageY - cy, event.pageX - cx);
  
  updateSelection();
}

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
  
  rotateFunction(
      -(optimalApp.selectionRotation % 360) * Math.PI/180,
    optimalApp.selectionBasePosition[0] + Math.round(optimalApp.selectionBaseWidth/2),
    optimalApp.selectionBasePosition[1] + Math.round(optimalApp.selectionBaseHeight/2)
  );
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

function releaseSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  $(document).unbind('mousemove');
  $(document).unbind('mouseup');  
}

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
  
  optimalApp.selectionRotation = 0;
  // since the box is redrawn after being rotated, it should start vertically aligned
  
  optimalApp.resizingFrom = event.target.id;
}

// temporarily transform the selection box we can redraw the graph
function updateSelection() {
  var bbox = $('#bounding-box')
    .css({ 
      left: Math.round(optimalApp.selectionPosition[0]),
      top: Math.round(optimalApp.selectionPosition[1])
    })
    .width(Math.round(Math.max(optimalApp.selectionWidth, 0)))
    .height(Math.round(Math.max(optimalApp.selectionHeight, 0)))
    .css('transform', 'rotate(' + optimalApp.selectionRotation + 'deg)')
    .css('-moz-transform', 'rotate(' + optimalApp.selectionRotation + 'deg)')
    .css('-webkit-transform', 'rotate(' + optimalApp.selectionRotation + 'deg)')
    .css('-o-transform', 'rotate(' + optimalApp.selectionRotation + 'deg)');
}

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

function initializeRangeSelectionBox() {
  var update = function (event, ui) {
    var slider = $(ui.handle.parentElement);
    var magnitude = '10<sup>' + ui.value + '</sup>';
    if (slider.attr('id') === 'graph-overlay-scale-x') {
      //$('#graph-overlay-min-x').html(min);
      $('#graph-overlay-max-x').html(magnitude);
      optimalApp.xLogRange = ui.value;
    } else {
      //$('#graph-overlay-min-y').html(min);
      $('#graph-overlay-max-y').html(magnitude);
      optimalApp.yLogRange = ui.value;
    }
  };
  
  $('#graph-overlay-scale-x').slider({
    orientation: 'horizontal',
    range: 'min',
    min: -40,
    max: 40,
    slide: update,
    change: update
  }).slider('value', 1);
  
  $('#graph-overlay-scale-y').slider({
    orientation: 'vertical',
    range: 'min',
    min: -40,
    max: 40,
    slide: update,
    change: update
  }).slider('value', 1);
  
  $('#graph-overlay-units-x')
    .hCenterInElement()
    .editable(function(value, settings) {
      $(this).hCenterInElement().css('background-color', '#aaa');
      optimalApp.xAxisName = value;
      return value;
    }, {
      onblur: 'submit',
      style: 'display: inline'
    });
  
  $('#graph-overlay-units-y')
    .vCenterInElement()
    .editable(function(value, settings) {
      $(this).vCenterInElement().css('background-color', '#aaa');
      optimalApp.yAxisName = value;
      return value;
    }, {
      onblur: 'submit',
      style: 'display: inline'
    });
}

$(document).ready(function() {
  initializeBoard();
  initializeRangeSelectionBox();
  $('#box').aToolTip({
    inSpeed: 0,
    outSpeed: 0,
    tipContent: function() { return getTooltip(); }
  });
  $('#func-copy').click(function() { optimalApp.copyMode = true; });
  $('#func-edit').click(function() { optimalApp.copyMode = false; });
  $('#xaxis-lin').click(function() { optimalApp.logXMode = false; updateAxes(); });
  $('#xaxis-log').click(function() { optimalApp.logXMode = true; updateAxes(); });
  $('#yaxis-lin').click(function() { optimalApp.logYMode = false; updateAxes(); });
  $('#yaxis-log').click(function() { optimalApp.logYMode = true; updateAxes(); });
  
  $('.jxgbox').css('opacity', 0.2);
  $('.nav-tabs a[href="#presets"]').bind('click', function() {
    $('.jxgbox').css('opacity', 0.2);
    $('#graph-overlay').show();
  });
  $('.nav-tabs a[href="#functions"]').bind('click', function() {
    $('.jxgbox').css('opacity', 1.0);
    $('#graph-overlay').hide();
  });
  
});