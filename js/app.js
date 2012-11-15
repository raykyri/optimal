var board, xscale, yscale;
var cached, cached_mouseUp, cached_mouseMove;
var functions = {};
var points = {};
var points2functions = {}; // hack! what if you have multiple functions through a point?
var points2points = {};

var functiongraph_options = {
strokeWidth: 2,
highlightstrokeWidth: 3,
withLabel: false
};

function getMouseCoords(e) {
    var cPos = board.getCoordsTopLeftCorner(e),
    absPos = JXG.getPosition(e),
    dx = absPos[0]-cPos[0],
    dy = absPos[1]-cPos[1];
    
    return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
}

// draw a line from one point to another
function onMouseDown(e) {
    var start_coords = getMouseCoords(e);
    cached = undefined;
    
    if (functions[e.srcElement.id] !== undefined) {
        
        // dragging on function
        cached_mouseUp = function(ee) {
            var end_coords = getMouseCoords(ee);
            
            var dx = end_coords.usrCoords[1] - start_coords.usrCoords[1];
            var dy = end_coords.usrCoords[2] - start_coords.usrCoords[2];
            board.create('functiongraph', [function(x) { 
                                           return functions[e.srcElement.id].yterm(x-dx) + dy;
                                           }], functiongraph_options);
            
            cached_mouseUp = null;
        };
        
        cached_mouseMove = function(ee) {
            var end_coords = getMouseCoords(ee);
        };
        
    } else if (points[e.srcElement.id] !== undefined) {
        
        // TODO dragging on point
        // TODO start_coords may be inaccurate because of tolerance
        cached_mouseUp = function(ee) {
            var end_coords = getMouseCoords(ee);            
            var pivot = points2points[e.srcElement.id];
            
            var x0 = pivot.coords.usrCoords[1];
            var x1 = start_coords.usrCoords[1];
            var x2 = end_coords.usrCoords[1];
            var y0 = pivot.coords.usrCoords[2];
            var y1 = start_coords.usrCoords[2];
            var y2 = end_coords.usrCoords[2];
            var th = Math.atan2(y2 - y0, x2 - x0) - Math.atan2(y1 - y0, x1 - x0);
            
            var f_new = function(x) {
                var f = points2functions[e.srcElement.id].yterm;
                var y = f(x-x0);
                var dx = (x-x0) * Math.cos(th) - (y-y0) * Math.sin(th);
                var dy = (x-x0) * Math.sin(th) + (y+y0) * Math.cos(th);
                return y + dy;
            };
            
            board.create('point', start_coords.usrCoords);
            board.create('functiongraph', [f_new], functiongraph_options);
            
            cached_mouseUp = null;
        };
        
        cached_mouseMove = function(ee) {
            var end_coords = getMouseCoords(ee);
        };
        
    } else {
        
        // dragging on empty space
        cached_mouseUp = function(ee) {
            var end_coords = getMouseCoords(ee);
            cached_mouseUp = null;
            onEventCreateFunction(end_coords);
        };
        
        cached_mouseMove = function(ee) {
            var end_coords = getMouseCoords(ee);
        };
        
    }
    onEventCreatePoint(start_coords);
}

function isInGraph(node) {
    var n = node;
    while (n !== null && n.parentElement !== n) {
        if (n.tagName === 'svg') return true;
        n = n.parentElement;
    }
    return false;
}

function onMouseUp(e) {
    if (!isInGraph(e.srcElement)) return;
    if (typeof cached_mouseUp === 'function') cached_mouseUp(e);
}

function onMouseMove(e) {
    if (!isInGraph(e.srcElement)) return;
    if (typeof cached_mouseMove === 'function') cached_mouseMove(e);
}

function onEventCreatePoint(coords) {
    var el;
    for (el in board.objects) {
        
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

function onEventCreateFunction(coords) {
    var el, p1, p2;
    
    // create the starting point
    if (JXG.isPoint(cached)) {
        if (coords.usrCoords[1] === cached.coords.usrCoords[1] && 
            coords.usrCoords[2] === cached.coords.usrCoords[2]) return;
        p1 = cached;
    } else {
        if (coords.usrCoords[1] === cached.usrCoords[1] && 
            coords.usrCoords[2] === cached.usrCoords[2]) return;
        p1 = board.create('point', [cached.usrCoords[1], cached.usrCoords[2]]);
        points[p1.rendNode.id] = p1;
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
        points[p2.rendNode.id] = p2;
    }
    
    var f = addLine(p1.coords, p2.coords);
    functions[f.rendNode.id] = f;
    points2functions[p1.rendNode.id] = f;
    points2functions[p2.rendNode.id] = f;
    points2points[p1.rendNode.id] = p2;
    points2points[p2.rendNode.id] = p1;
}

// initialize the app
function initialize() {
    initializeBoard();
    $('#box').aToolTip();
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
    board.addHook(onMouseMove, 'mousemove');
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

// TESTING
function addPolynomial(p1, p2, p3, p4) {
    board.suspendUpdate();
    
    var points = arguments;
    var polynomial = board.lagrangePolynomial(points);
    console.log(polynomial);
    board.create('functiongraph', [polynomial, -10, 10], {strokeWidth:3});
    
    board.unsuspendUpdate();
}

// add a line going through two points to board
function addLine(p1, p2) {
    board.suspendUpdate();
    
    // point-slope formula
    var dy = p1.usrCoords[2] - p2.usrCoords[2];
    var dx = p1.usrCoords[1] - p2.usrCoords[1];
    var slope = dy/dx;
    var intercept = p1.usrCoords[2] - slope * p1.usrCoords[1];
    
    var f = addFunction('x*' + slope + '+' + intercept);
    board.unsuspendUpdate();
    return f;
}

// add mathematical function to board
function addFunction(txt_function, plot_derivative) {
    board.suspendUpdate();
    
    var js_function = parseFunction(txt_function);
    var closure_function = function(x) {
        x *= 1/xscale.Value();
        return eval(js_function) * yscale.Value();
    };
    var f = board.create('functiongraph', [closure_function], functiongraph_options);
    $('<li>' + txt_function + '</li>')
    .appendTo($('#functions-list'));
    
    board.unsuspendUpdate();
    return f;
}

function setTooltip(tooltip) {
    $('#box').attr('title', tooltip);
}

$(document).ready(initialize);

