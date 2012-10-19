

// utility globals and functions

var board, xscale, yscale, cached;

function getMouseCoords(e) {
  var cPos = board.getCoordsTopLeftCorner(e),
  absPos = JXG.getPosition(e),
  dx = absPos[0]-cPos[0],
  dy = absPos[1]-cPos[1];
 
  return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
}

// draw a line from one point to another
function onMouseDown(e) {
  var el, coords = getMouseCoords(e);
  cached = undefined;
  for (el in board.objects) {
    
    //if (JXG.isLine(board.objects[el])) {
//    if (JXG.getReference(board, targetID).elementClass === JXG.OBJECT_CLASS_LINE) {
//      alert('line')
//    }
    
    if (JXG.isPoint(board.objects[el])) {
      if (board.objects[el].hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
        cached = board.objects[el];
        //alert('should copy')
        return;
      }
    }
  }
  cached = coords;
}

function onMouseUp(e) {
  var el, p1, p2, coords = getMouseCoords(e);

  // create the starting point
  if (JXG.isPoint(cached)) {
    if (coords.usrCoords[1] === cached.coords.usrCoords[1] && coords.usrCoords[2] === cached.coords.usrCoords[2]) return;
    p1 = cached;
  } else {
    if (coords.usrCoords[1] === cached.usrCoords[1] && coords.usrCoords[2] === cached.usrCoords[2]) return;
    p1 = board.create('point', [cached.usrCoords[1], cached.usrCoords[2]]);
  }

  // deduplicate the ending point
  for (el in board.objects) {
    if (!JXG.isPoint(board.objects[el])) continue;
    if (board.objects[el].hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
      p2 = board.objects[el];
      break;
    }
  }    

  if (p2 === undefined) {
    p2 = board.create('point', [coords.usrCoords[1], coords.usrCoords[2]]);
  }
  addLine(p1.coords, p2.coords);
}

// initialize the app
function initialize() {
  initializeBoard();
  initializeModel('linear');
}

// initialize the board with a new model; for the function library
function initializeModel(model) {
  var f = getModelFunction(model);
  document.getElementById('functionInput').value = f;
  addFunction(f);
}

// remove all functions from board
function initializeBoard() {
  if (board !== undefined) JXG.JSXGraph.freeBoard(board);
  board = JXG.JSXGraph.initBoard(
    'box', {axis: true, originX: 420, originY: 320, unitX: 25, unitY: 25});
  xscale = board.create(
    'slider', [[0,0], [10,0], [0,1,2]], {name:'Scale X'});
  yscale = board.create(
    'slider', [[0,0], [0,10], [0,1,2]], {name:'Scale Y'});
  board.addHook(onMouseUp, 'mouseup');
  board.addHook(onMouseDown, 'mousedown');
}

function getModelFunction(model) {
  switch (model) {
  case 'linear':      return 'x/2';
  case 'exponential': return 'exp(-x)';
  case 'logistic':    return '10-10/(1+exp(x))';
  case 'step':        return 'x/abs(x)';
  case 'peak':        return 'x';
  case 'gaussian':    return '4*exp(-2*x^2)';
  case 'bimodal':     return 'x';
  case 'composite':   return 'x';
  default:            return 'x/3';
  }
}

// convert function from human-readable to javascript text
function parseFunction(text) {
  return JXG.GeonextParser.geonext2JS(text);
}

// add a line going through two points to board
function addPolynomial(p1, p2, p3, p4) {
  board.suspendUpdate();

  var points = arguments;
  var polynomial = board.lagrangePolynomial(points);
  console.log(polynomial);
  board.create('functiongraph', [polynomial, -10, 10], {strokeWidth:3});

  board.unsuspendUpdate();
}

function addLine(p1, p2) {
  board.suspendUpdate();

  // point-slope formula
  var dy = p1.usrCoords[2] - p2.usrCoords[2];
  var dx = p1.usrCoords[1] - p2.usrCoords[1];
  var slope = dy/dx;
  var intercept = p1.usrCoords[2] - slope * p1.usrCoords[1];
  
  addFunction('x*' + slope + '+' + intercept);
  
  _addFunction(function(x) {
    return x*slope + intercept;
  });

  board.unsuspendUpdate();
}

// add mathematical function to board
function addFunction(txt_function, plot_derivative) {
  board.suspendUpdate();

  var js_function = parseFunction(txt_function);
  var closure_function = function(x) {
    x *= 1/xscale.Value();
    return eval(js_function) * yscale.Value();
  };
  _addFunction(closure_function, plot_derivative);
  $('<li>' + txt_function + '</li>')
    .appendTo($('#functions-list'));

  board.unsuspendUpdate();
}

function _addFunction(closure_function, plot_derivative) {
  // function graph
  var curve = 
    board.create(
      'functiongraph', 
      [closure_function,
       function(){ 
         var c = new JXG.Coords(JXG.COORDS_BY_SCREEN,[0,0],board);
         return c.usrCoords[1];
       },
       function(){ 
         var c = new JXG.Coords(JXG.COORDS_BY_SCREEN,[board.canvasWidth,0],board);
         return c.usrCoords[1];
       }
      ],{withLabel:false});
  
  // function derivative
/*  if (plot_derivative !== undefined && plot_derivative !== false)
    board.create(
      'functiongraph',
      [JXG.Math.Numerics.D(closure_function),
       function(){ 
         var c = new JXG.Coords(JXG.COORDS_BY_SCREEN,[0,0],board);
         return c.usrCoords[1];
       },
       function(){ 
         var c = new JXG.Coords(JXG.COORDS_BY_SCREEN,[board.canvasWidth,0],board);
         return c.usrCoords[1];
       }], {dash:2});
*/
}

$(document).ready(initialize);
