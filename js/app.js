/* **********************************************************************
   Globals
*/

var optimalApp = {
  tooltip: null,
  selection: null,
  copy_mode: true,
  functionmodel: JXG.Math.Numerics.lagrangePolynomial
};

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
    optimalApp.copy_mode = true;
  });
  $('#func-edit').click(function() {
    optimalApp.copy_mode = false;
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
    JXG.addEvent(p.rendNode, 'click', function(e) {
      //selectFunction(p.rendNode, data_table.rootElement.context);
    }, p);
    JXG.addEvent(p.rendNode, 'mouseover', function(e) {
      if (optimalApp.copy_mode === true) {
        setTooltip('Drag to edit and copy function');
      } else {
        setTooltip('Drag to edit');
      }
    }, p);
    JXG.addEvent(p.rendNode, 'mouseout', function(e) { // TODO: a proper interaction for canceling the selection
      unselectFunction(p.rendNode, data_table.rootElement.context);
      setTooltip();
    }, p);
    
    // handle copying of functions
    JXG.addEvent(p.rendNode, 'mousedown', function(e) {
      if (!optimalApp.copy_mode) return;
      addFunction(deepcopy(point_data));
    }, p);
    
    // handle editing of functions
    JXG.addEvent(p.rendNode, 'mouseup', function(e) {
      data_table.setDataAtCell(i, 0, p.coords.usrCoords[1]);
      data_table.setDataAtCell(i, 1, p.coords.usrCoords[2]);
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
    optimalApp.functionmodel(points), x_min, x_max], function_options);
  
  // handle mouseover on function
  JXG.addEvent(func.rendNode, 'click', function(e) {
    selectFunction(func.rendNode, data_table.rootElement.context);
  }, func);
  JXG.addEvent(func.rendNode, 'mouseover', function(e) {
    if (optimalApp.copy_mode === true) {
      setTooltip('Click to transform and copy function');
    } else {
      setTooltip('Click to transform function');
    }
  }, func);
  JXG.addEvent(func.rendNode, 'mouseout', function(e) { // TODO: a proper interaction for canceling the selection
    unselectFunction(func.rendNode, data_table.rootElement.context);
    setTooltip();
  }, func);
  
  // TODO: handle click/drag on function
  JXG.addEvent(func.rendNode, 'click', function(e) {
    // TODO: do stuff to the function when it is clicked on, dragged, etc.
  }, func);
  
  return func;
}

/* **********************************************************************
   Selection box for functions
*/

function selectFunction(graph_element, sidebar_element) {
  $(sidebar_element).css('opacity', 0.5);
  setGrabBox(graph_element);
}

function unselectFunction(graph_element, sidebar_element) {
  $(sidebar_element).css('opacity', 1.0);
}

function initGrabBox(object) {
  
  var height, width, top, left;
  
  if (typeof object.getBBox === 'function' &&
      typeof object.getBoundingClientRect === 'function') {
    height = object.getBBox().height;
    width = object.getBBox().width;
    top = Math.round(object.getBoundingClientRect().top);
    left = Math.round(object.getBoundingClientRect().left);
  } else {
    height = $image.height();
    width = $image.width();
    top = $image.position().top;
    left = $image.position().left;
  }
  
  var $parent = $(object).parents('div').first();
  
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
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $nResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-n-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $neResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-ne-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $wResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-w-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $eResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-e-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $swResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-sw-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $sResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-s-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
    }).insertAfter($selection);
  var $seResizeHandler = $('<div class="image-crop-resize-handler" id="image-crop-se-resize-handler" />')
    .css({
      opacity : 0.5,
      position : 'absolute'
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

function setGrabBox(object) {
  var box = initGrabBox(object);
  // TODO let's just disable all the other interactions for now and lightbox everything
  
  // TODO interaction: translate
  // TODO interaction: scale (X, Y)
  // TODO interaction: scale (XY)
  // TODO component: rotate
  // TODO interaction: rotate
  // TODO component: clear selection
  // TODO: interaction: clear selection
  // TODO: respond to zooming
  // TODO: respond to panning
  
  box.selection.mousedown(pickSelection);
  $('div.image-crop-resize-handler').mousedown(pickResizeHandler);
}

function unsetGrabBox() {
  
}

/* From http://net.tutsplus.com/tutorials/javascript-ajax/how-to-create-a-jquery-image-cropping-plug-in-from-scratch-part-ii/ */

// Pick the current selection
function pickSelection(event) {
  // Prevent the default action of the event
  event.preventDefault();
  
  // Prevent the event from being notified
  event.stopPropagation();
  
  // Bind an event handler to the 'mousemove' event
  $(document).mousemove(moveSelection);
  
  // Bind an event handler to the 'mouseup' event
  $(document).mouseup(releaseSelection);
  
  var mousePosition = getMousePosition(event);
  
  // Get the selection offset relative to the mouse position
  selectionOffset[0] = mousePosition[0] - options.selectionPosition[0];
  selectionOffset[1] = mousePosition[1] - options.selectionPosition[1];
  
  // Update only the needed elements of the plug-in interface
  // by specifying the sender of the current call
  updateInterface('pickSelection');
};

// Pick one of the resize handlers
function pickResizeHandler(event) {
  // Prevent the default action of the event
  event.preventDefault();
  
  // Prevent the event from being notified
  event.stopPropagation();
  
  switch (event.target.id) {
  case 'image-crop-nw-resize-handler' :
    selectionOrigin[0] += options.selectionWidth;
    selectionOrigin[1] += options.selectionHeight;
    options.selectionPosition[0] = selectionOrigin[0] - options.selectionWidth;
    options.selectionPosition[1] = selectionOrigin[1] - options.selectionHeight;
    
    break;
  case 'image-crop-n-resize-handler' :
    selectionOrigin[1] += options.selectionHeight;
    options.selectionPosition[1] = selectionOrigin[1] - options.selectionHeight;
    
    resizeHorizontally = false;
    
    break;
  case 'image-crop-ne-resize-handler' :
    selectionOrigin[1] += options.selectionHeight;
    options.selectionPosition[1] = selectionOrigin[1] - options.selectionHeight;
    
    break;
  case 'image-crop-w-resize-handler' :
    selectionOrigin[0] += options.selectionWidth;
    options.selectionPosition[0] = selectionOrigin[0] - options.selectionWidth;
    
    resizeVertically = false;
    
    break;
  case 'image-crop-e-resize-handler' :
    resizeVertically = false;
    
    break;
  case 'image-crop-sw-resize-handler' :
    selectionOrigin[0] += options.selectionWidth;
    options.selectionPosition[0] = selectionOrigin[0] - options.selectionWidth;
    
    break;
  case 'image-crop-s-resize-handler' :
    resizeHorizontally = false;
    
    break;
  }
  
  // Bind an event handler to the 'mousemove' event
  $(document).mousemove(resizeSelection);
  
  // Bind an event handler to the 'mouseup' event
  $(document).mouseup(releaseSelection);
  
  // Update only the needed elements of the plug-in interface
  // by specifying the sender of the current call
  updateInterface('pickResizeHandler');
};

// Resize the current selection
function resizeSelection(event) {
  // Prevent the default action of the event
  event.preventDefault();
  
  // Prevent the event from being notified
  event.stopPropagation();
  
  var mousePosition = getMousePosition(event);
  
  // Get the selection size
  var height = mousePosition[1] - selectionOrigin[1],
  width = mousePosition[0] - selectionOrigin[0];
  
  // If the selection size is smaller than the minimum size set it
  // accordingly
  if (Math.abs(width) < options.minSize[0])
    width = (width >= 0) ? options.minSize[0] : - options.minSize[0];
  
  if (Math.abs(height) < options.minSize[1])
    height = (height >= 0) ? options.minSize[1] : - options.minSize[1];
  
  // Test if the selection size exceeds the image bounds
  if (selectionOrigin[0] + width < 0 || selectionOrigin[0] + width > getWidth())
    width = - width;
  
  if (selectionOrigin[1] + height < 0 || selectionOrigin[1] + height > $image.height())
    height = - height;
  
  if (options.maxSize[0] > options.minSize[0] &&
      options.maxSize[1] > options.minSize[1]) {
    // Test if the selection size is bigger than the maximum size
    if (Math.abs(width) > options.maxSize[0])
      width = (width >= 0) ? options.maxSize[0] : - options.maxSize[0];
    
    if (Math.abs(height) > options.maxSize[1])
      height = (height >= 0) ? options.maxSize[1] : - options.maxSize[1];
  }
  
  // Set the selection size
  if (resizeHorizontally)
    options.selectionWidth = width;
  
  if (resizeVertically)
    options.selectionHeight = height;
  
  // If any aspect ratio is specified
  if (options.aspectRatio) {
    // Calculate the new width and height
    if ((width > 0 && height > 0) || (width < 0 && height < 0))
      if (resizeHorizontally)
        height = Math.round(width / options.aspectRatio);
    else
      width = Math.round(height * options.aspectRatio);
    else
      if (resizeHorizontally)
        height = - Math.round(width / options.aspectRatio);
    else
      width = - Math.round(height * options.aspectRatio);
    
    // Test if the new size exceeds the image bounds
    if (selectionOrigin[0] + width > getWidth()) {
      width = getWidth() - selectionOrigin[0];
      height = (height > 0) ? Math.round(width / options.aspectRatio) : - Math.round(width / options.aspectRatio);
    }
    
    if (selectionOrigin[1] + height < 0) {
      height = - selectionOrigin[1];
      width = (width > 0) ? - Math.round(height * options.aspectRatio) : Math.round(height * options.aspectRatio);
    }
    
    if (selectionOrigin[1] + height > $image.height()) {
      height = $image.height() - selectionOrigin[1];
      width = (width > 0) ? Math.round(height * options.aspectRatio) : - Math.round(height * options.aspectRatio);
    }
    
    // Set the selection size
    options.selectionWidth = width;
    options.selectionHeight = height;
  }
  
  if (options.selectionWidth < 0) {
    options.selectionWidth = Math.abs(options.selectionWidth);
    options.selectionPosition[0] = selectionOrigin[0] - options.selectionWidth;
  } else
    options.selectionPosition[0] = selectionOrigin[0];
  
  if (options.selectionHeight < 0) {
    options.selectionHeight = Math.abs(options.selectionHeight);
    options.selectionPosition[1] = selectionOrigin[1] - options.selectionHeight;
  } else
    options.selectionPosition[1] = selectionOrigin[1];
  
  // Trigger the 'onChange' event when the selection is changed
  options.onChange(getCropData());
  
  // Update only the needed elements of the plug-in interface
  // by specifying the sender of the current call
  updateInterface('resizeSelection');
};

// Move the current selection
function moveSelection(event) {
  // Prevent the default action of the event
  event.preventDefault();
  
  // Prevent the event from being notified
  event.stopPropagation();
  
  var mousePosition = getMousePosition(event);
  
  // Set the selection position on the x-axis relative to the bounds
  // of the image
  if (mousePosition[0] - selectionOffset[0] > 0)
    if (mousePosition[0] - selectionOffset[0] + options.selectionWidth < getWidth())
      options.selectionPosition[0] = mousePosition[0] - selectionOffset[0];
  else
    options.selectionPosition[0] = getWidth() - options.selectionWidth;
  else
    options.selectionPosition[0] = 0;
  
  // Set the selection position on the y-axis relative to the bounds
  // of the image
  if (mousePosition[1] - selectionOffset[1] > 0)
    if (mousePosition[1] - selectionOffset[1] + options.selectionHeight < $image.height())
      options.selectionPosition[1] = mousePosition[1] - selectionOffset[1];
  else
    options.selectionPosition[1] = $image.height() - options.selectionHeight;
  else
    options.selectionPosition[1] = 0;
  
  // Trigger the 'onChange' event when the selection is changed
  options.onChange(getCropData());
  
  // Update only the needed elements of the plug-in interface
  // by specifying the sender of the current call
  updateInterface('moveSelection');
};

// Release the current selection
function releaseSelection(event) {
  // Prevent the default action of the event
  event.preventDefault();
  
  // Prevent the event from being notified
  event.stopPropagation();
  
  // Unbind the event handler to the 'mousemove' event
  $(document).unbind('mousemove');
  
  // Unbind the event handler to the 'mouseup' event
  $(document).unbind('mouseup');
  
  // Update the selection origin
  selectionOrigin[0] = options.selectionPosition[0];
  selectionOrigin[1] = options.selectionPosition[1];
  
  // Reset the resize constraints
  resizeHorizontally = true;
  resizeVertically = true;
  
  // Verify if the selection size is bigger than the minimum accepted
  // and set the selection existence accordingly
  if (options.selectionWidth > options.minSelect[0] &&
      options.selectionHeight > options.minSelect[1])
    selectionExists = true;
  else
    selectionExists = false;
  
  // Trigger the 'onSelect' event when the selection is made
  options.onSelect(getCropData());
  
  // If the selection doesn't exist
  if (!selectionExists) {
    // Unbind the event handler to the 'mouseenter' event of the
    // preview
    $previewHolder.unbind('mouseenter');
    
    // Unbind the event handler to the 'mouseleave' event of the
    // preview
    $previewHolder.unbind('mouseleave');
  }
  
  // Update only the needed elements of the plug-in interface
  // by specifying the sender of the current call
  updateInterface('releaseSelection');
};

        // Update the plug-in interface
        function updateInterface(sender) {
            switch (sender) {
                case 'setSelection' :
                    updateOverlayLayer();
                    updateSelection();
                    updateResizeHandlers('hide-all');
                    updatePreview('hide');

                    break;
                case 'pickSelection' :
                    updateResizeHandlers('hide-all');

                    break;
                case 'pickResizeHandler' :
                    updateSizeHint();
                    updateResizeHandlers('hide-all');

                    break;
                case 'resizeSelection' :
                    updateSelection();
                    updateSizeHint();
                    updateResizeHandlers('hide-all');
                    updatePreview();
                    updateCursor('crosshair');

                    break;
                case 'moveSelection' :
                    updateSelection();
                    updateResizeHandlers('hide-all');
                    updatePreview();
                    updateCursor('move');

                    break;
                case 'releaseSelection' :
                    updateTriggerLayer();
                    updateOverlayLayer();
                    updateSelection();
                    updateSizeHint('fade-out');
                    updateResizeHandlers();
                    updatePreview();

                    break;
                default :
                    updateTriggerLayer();
                    updateOverlayLayer();
                    updateSelection();
                    updateResizeHandlers();
                    updatePreview();
            }
        };


/* **********************************************************************
   Helper functions
*/

// TODO SVG-ize
        // Get the current offset of an element
        function getElementOffset(object) {
            var offset = $(object).offset();

            return [offset.left, offset.top];
        };

// TODO SVG-ize
        // Get the current mouse position relative to the image position
        function getMousePosition(event) {
            var imageOffset = getElementOffset($image);

            var x = event.pageX - imageOffset[0],
                y = event.pageY - imageOffset[1];

            x = (x < 0) ? 0 : (x > getWidth()) ? getWidth() : x;
            y = (y < 0) ? 0 : (y > $image.height()) ? $image.height() : y;

            return [x, y];
        };

        // Return an object containing information about the plug-in state
        function getCropData() {
            return {
                selectionX : options.selectionPosition[0],
                selectionY : options.selectionPosition[1],
                selectionWidth : options.selectionWidth,
                selectionHeight : options.selectionHeight,

                selectionExists : function() {
                    return selectionExists;
                }
            };
        };

        // Update the selection
        function updateSelection() {
            // Update the outline layer
            $outline.css({
                    cursor : 'default',
                    display : selectionExists ? 'block' : 'none',
                    left : options.selectionPosition[0],
                    top : options.selectionPosition[1]
                })
                .width(options.selectionWidth)
                .height(options.selectionHeight);

            // Update the selection layer
            $selection.css({
                    backgroundPosition : ( - options.selectionPosition[0] - 1) + 'px ' + ( - options.selectionPosition[1] - 1) + 'px',
                    cursor : options.allowMove ? 'move' : 'default',
                    display : selectionExists ? 'block' : 'none',
                    left : options.selectionPosition[0] + 1,
                    top : options.selectionPosition[1] + 1
                })
                .width((options.selectionWidth - 2 > 0) ? (options.selectionWidth - 2) : 0)
                .height((options.selectionHeight - 2 > 0) ? (options.selectionHeight - 2) : 0);
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

/* **********************************************************************
   Initialization
*/

$(document).ready(initialize);
