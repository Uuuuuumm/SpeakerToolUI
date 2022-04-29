var counter = 0;
const DEGSYMBOL = "&#176;";

//////// preference variables ---------------------
var defaultGridSize = 600 *12;//in feet
var gridSize = defaultGridSize;

var axisWidth = 30;// not adjustable currently

var maxAngSensitivity = 100;
var angleSensitivity = 75;

var maxFrameRate = 60;
var lastFrame = Date.now();
var weightRatio = 0.5;
var fps = 1;

var roughPin = true;
var relativeDial = false;

var arraySize = 12;


//////// operational variables --------------------
var scene = new THREE.Scene();
var controls;
var updated = false;

var lastClick = 'left';//'left, 'middle', 'right'
var flashing = false;
var x = false;
var y = false;
var z = false;
var shift = false;
var ctrl = false;

var clipBoard = [];

var mouse = {x: 0, y: 0};
var oldMouseY;
var rotYDiv = {x: 0, y: 0};
var axes;
var axesOut = false;

var white = new THREE.Color("#FFFFFF");
var black = new THREE.Color("#000000");
var gray = new THREE.Color("#777777");

var pins = [0,1,2,3,4,5,6,8,10];

var allObjects = new THREE.Object3D();
var allArrays = [];
var objects = allObjects.children;
var clickedObj = null;
var specialArray = null;
var dragging = 'n';// v - vertical, h - horizontal, a - angular, n - none
var draggedArray = null;
var draggingArrs = [];
var numSelected = 0;

var venuePieces = [];
var venueObjects = new THREE.Object3D();
var stagePos;

var sideViewOut = false;
var spreadBalls = [];
var sideMode = 'angle';

var mouseDrag = false;
var mouseDown = false;
var addNew = false;
var nullifyClick = false;
var nullifyKey = false;

// used to stop event propagation
var mouseDownMeshLast = false;
var mouseUpMeshLast = false;

var anglingArr = null;
var anglePos = 0;


var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
var gridHelper = new THREE.GridHelper(gridSize, 100, 0x00FF00, 0x008800);
let c0 = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 1, 30000);
let c2 = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 2 *12);

var views = [
    {// main camera
        left: 0,
        bottom: 0,
        width: 1,
        height: 1,
        
        camPos: [-30 *12, 10 *12, 0],
        up: [0, 1, 0],
        fov: 75,
        
        camera: c0,
        domEvents: new THREEx.DomEvents(c0, renderer.domElement)
    },
    {// overhead view in bot right corner
        left: 0.75,
        bottom: 0,
        width: 0.25,
        height: 0.25,
        
        camPos: [0, 500 *12, 0],
        up: [1, 0, 0],
        
        camera: new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 700 *12)
    },
    {// side view of special array
        left: 0.25,
        bottom: 0,
        width: 0.15,
        height: 0.35,
        
        camPos: [0, 0, 0],
        up: [0, 1, 0],
        
        camera: c2,
        domEvents: new THREEx.DomEvents(c2, document.getElementById("sideView"))//<-- THIS IS THE PROBLEM
        //make a smaller container (prefferebly not a div) to use instead of entire domElement
    }
];


//////// conversions ------------------------------
function toRadians(angle){
    return angle * (Math.PI / 180);
}
function toDegrees(angle){
    return angle / (Math.PI / 180);
}
const mToInch = 39.3701;

function mouseToGrid(x, y){
    let pos = new THREE.Vector3();
    if (dragging == 'v'){
        pos.x = 0;
        pos.z = 0;
        pos.y = y * 1000;
    }
    else{// dragging == 'h'
        let camera = views[0].camera;
        let vec = new THREE.Vector3();
        vec.set(x, y, 0);
        vec.unproject(camera);
        vec.sub(camera.position).normalize();
        let distance = -camera.position.y / vec.y;
        pos.copy(camera.position).add(vec.multiplyScalar(distance));
//        pos.y = 0;
    }
    return pos;
}
function toScreenPosition(vec, camera=views[0].camera){
    let vector = vec.clone();
    
    // check if position is behind camera
    let camFaceVec = camera.getWorldDirection(new THREE.Vector3());
    let camPointVec = vector.clone().sub(camera.position).normalize();
    
    if (camFaceVec.distanceTo(camPointVec) > camPointVec.length())
        return { x: 0, y: -1000 };// move off screen
        
   
    let widthHalf = 0.5 * renderer.context.canvas.width;
    let heightHalf = 0.5 * renderer.context.canvas.height;
    
    vector.project(camera);

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    return { 
        x: vector.x,
        y: vector.y
    };
}
// duplicate function, but first doesn't work for orthographic
function toScreenXY( position, camera, jqdiv ) {

    let pos = position.clone();
    let projScreenMat = new THREE.Matrix4();
    projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
//    projScreenMat.multiplyVector3( pos );
    pos.applyMatrix4(projScreenMat);
//    pVec(pos);
//    p(jqdiv.style);
    
    let top = window.innerHeight - (parseInt(jqdiv.style.bottom) + parseInt(jqdiv.style.height));
    return { x: ( pos.x + 1 ) * parseInt(jqdiv.style.width) / 2 + parseInt(jqdiv.style.left),
         y: ( - pos.y + 1) * parseInt(jqdiv.style.height) / 2 + top };

}

//////// main view mouse & key listeners ----------
function onMouseDownHelperDoc(event){
    if (mouseDownMeshLast)
        mouseDownMeshLast = false;
    else
        onMouseDown(event);
}
function onMouseDownHelperMesh(event){
    onMouseDown(event);
    mouseDownMeshLast = true;
}
function onMouseDown(event){
//    p(event);
    let which = event.which || event.origDomEvent.which;
    if (mouseOverDiv() && which == 3)//(event.origDomEvent.which != 2 || event.which != 2))
        return;

    mouseDown = true;
    dragging = 'n';
    clickedObj = event.target;
    
    if (addNew){
        let spkArr = new speakerArray(arraySize);
        allArrays.push(spkArr);
    }
    else{//dragging array
        draggedArray = ownerArray(event.target);
        
        if (draggedArray == null)
            return;
        
        if (draggedArray.selected){//just checking if dragging should be occuring
            switch (event.origDomEvent.which - 1){
                case THREE.MOUSE.LEFT:
                    if (mouseOverDiv()){
                        dragging = 'a';
                        sideMode = 'gain';
                    }
                    else
                        popDispType = dragging = 'h';
                    break;
                case THREE.MOUSE.MIDDLE:
                    dragging = 'a';
                    sideMode = 'angle';
                    break;
                case THREE.MOUSE.RIGHT:
                    dragging = 'v';
                    draggedArray.showMoveLine();
            }
            controls.enabled = false;
            
            if (!ctrl){
                specialArray = draggedArray;
            }
        }
        setOldVals(draggedArray);
    }
}

function onMouseUpHelperDoc(event){
    if (mouseUpMeshLast)
        mouseUpMeshLast = false;
    else
        onMouseUp(event);
}
function onMouseUpHelperMesh(event){
    onMouseUp(event);
    mouseUpMeshLast = true;
}
function onMouseUp(event){
//    event.cancelBubble = true;
//    event.stopPropagation();
//    event.stopImmediatePropagation();
    if (nullifyClick){
        nullifyClick = mouseDrag = mouseDown = false;
        controls.enabled = true;
        return;
    }
    
    if (!mouseDrag){
        select(event);
    }
    if (draggedArray != null){
        scene.remove(draggedArray.moveLine);
    }
    
    mouseDown = mouseDrag = false;
    
    controls.enabled = true;//re-enable orbit controls of screen when dragging
    clickedObj = null;
    numSelected = 0;
    draggingArrs = [];
    draggedArray = null;
    
    if (venueDown)
        venueUp();
    
    
    for (let i in allArrays)
        allArrays[i].dragging = false;
    
}

function onMouseMove(event){
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (nullifyClick)
        return;
    
    
    if (venueDown){
        venueDrag(event);
        return;
    }
    
    mouseDrag = mouseDown;
    
    if (mouseDrag){
        if (numSelected > 0){
            dragArrays();
        }
        rotDivOut = false;
    }
}
function onDblClick(event){

    let owner = ownerArray(event.target);
    if (owner == null)
        return;
    let tarPos = owner.mountPoints[parseInt(owner.length / 2)].clone();
//            pVis(tarPos);
    let camPos = tarPos.clone().add(
        new THREE.Vector3().setFromSphericalCoords(
            30 *12,
            Math.PI/2,
            toRadians(-owner.rotY) + Math.PI*3/2
        ) 
    );
    controls.target = tarPos;
    views[0].camera.position.set(camPos.x, camPos.y, camPos.z);

}
function onMouseWheel(event) {
    setTimeout(function(){    
        rotDivOut = false;
    }, 10);
	
}

function enter(event){
//    p('main');
    if (event.target.parent != null){
        event.target.hover = true;
        if (mouseOverDiv()){
            setTimeout(function(){
                let own = ownerArray(event.target);
                spreadBalls[own.indexOf(event.target)].style.opacity = 0.6;
                
            }, 10);
            
        }
    }
    event.stopPropagation();
}
function exit(event){
    if (event.target.parent != null){
        event.target.hover = false;   
        if (mouseOverDiv())
            for (let i in spreadBalls)
                spreadBalls[i].style.opacity = 0.9;
    }
}

function KeyDown(event){
//    p(controls.enabled);
    if (nullifyKey)
        return;
    
    
    if (parseInt(event.key) < 10){//enter key stop 1 from taking a partner
        flashNum(parseInt(event.key));
        return;
    }
    
    switch(event.key){
        case 'a':
            for (let i in allArrays){
                if (allArrays[i].selected){
                    allArrays[i].addCabinet();
                }
            }
            break;
            
        case 'c':
            if (ctrl){
                let mirrorPairs = [];
                delete clipBoard;
                clipBoard = [];
                for (let i = 0; i < allArrays.length && allArrays[i].selected; i++){
                    
                    let pairMember = false;
                    for (let k in mirrorPairs){
                        if (mirrorPairs[k][1] == i && i != 0){//if current i was a j
                            pairMember = true;
                            break;
                        }
                    }
                    if (pairMember)
                        continue;
                        
                    let hasMirror = false;
                    if (allArrays[i].mirror != null){
                        //check if sp arr and mirror are selected
                        for (let j = i; j < allArrays.length; j++){
                            if (allArrays[i].mirror === allArrays[j] && allArrays[j].selected){
                                mirrorPairs.push([i, j]);
                                hasMirror = true;
                                p('i: ' + i + '  j: ' + j);
                                break;
                            }
                        }
                    }
                    if (!hasMirror){
                        clipBoard.push(allArrays[i].clone());
                        last(clipBoard).rotateY(allArrays[i].rotY);
                        last(clipBoard).hide();
                    }
                }
                for (let i = 0; i < mirrorPairs.length; i++){
                    let arr1 = allArrays[mirrorPairs[i][0]];
                    let arr2 = allArrays[mirrorPairs[i][1]];
                    clipBoard.push(arr1.clone());
                    last(clipBoard).rotateY(arr1.rotY);
                    last(clipBoard).hide();

                    clipBoard.push(arr2.clone());
                    last(clipBoard).rotateY(arr2.rotY);
                    last(clipBoard).hide();


                    last(clipBoard).setMirror(
                        clipBoard[clipBoard.length - 2],
                        arr2.mirrorAxis
                    );
                }
            }
            break;
            
        case 'm':
            axesOut = true;
            showAxes(axes.x, axesOut);
            showAxes(axes.z, axesOut);
            break;
            
        case 'n':
            document.getElementById('body').style.cursor = "crosshair";
            addNew = true;
            controls.enabled = false;
            break;
            
        case 'q':
            artificialCheck(document.getElementById('roughPinBox'), 0);
            break;
            
        case 'r':
            for (let i = 0; i < allArrays.length; i++){// for loop must be like this
                if (allArrays[i].selected){
                    allArrays[i].rmCabinet();
                }
            }
            break;
            
        case 's':
            toggleSettings();
            break;
            
        case 't':
            p('t');
//            allArrays[0].move(new THREE.Vector3(0,0,0));
//            allObjects.matrixWorldNeedsUpdate = true;
            counter++;
            p('counter: ' + counter);
            break;
            
        case 'v':
            if (ctrl){
                let mirrorPairs = [];
                for (let i = 0; i < clipBoard.length; i++){
                    p(clipBoard);
                    if (clipBoard[i].mirror != null){
                        for (let j = i; j < clipBoard.length; j++){
                            if (clipBoard[i].mirror === clipBoard[j]){
                                mirrorPairs.push([i, j]);
                                break;
                            }
                        }
                    }
                    else{
                        allArrays.push(clipBoard[i].clone());
                        last(allArrays).rotateY(clipBoard[i].rotY);
                    }
                }
                for (let i = 0; i < mirrorPairs.length; i++){
                    let arr1 = clipBoard[mirrorPairs[i][0]];
                    let arr2 = clipBoard[mirrorPairs[i][1]];
                    allArrays.push(arr1.clone());
                    last(allArrays).rotateY(arr1.rotY);

                    allArrays.push(arr2.clone());
                    last(allArrays).rotateY(arr2.rotY);
                    
                    last(allArrays).setMirror(
                        allArrays[allArrays.length - 2],
                        arr2.mirrorAxis
                    );
                } 
            }
            break;
            
        case 'x':
            x = true;
            showAxes(axes.x);
            break;
            
        case 'y'://debug key
            y = true;
            break;
            
        case 'z':
            z = true;
            showAxes(axes.z);
            break;
            
        case 'Control':
            ctrl = true;
            break;
            
        case 'Enter':
            flashing = false;
            break;
            
        case 'Shift':
            shift = true;
            break;
            
        case 'Backspace':
            let temp = [];
            let gap = 0;
            for (let arr in allArrays){
                if (allArrays[arr].selected){
                    allArrays[arr].eradicate();
    //                delete(allArrays[arr]);
                    gap++;
                }
                else{
                    temp.push(allArrays[arr]);
                }
            }
            delete(allArrays);
            allArrays = temp.slice(0);
            break;
            
        default:
            p('unassigned key: "' + event.key + '"');
//            p(event);
    }
    
}
function KeyUp(event){
    if (event.key == 'm'){//mirror function
        axesOut = false;
         showAxes(axes.x, axesOut || x);
        showAxes(axes.z, axesOut || z);
    }
    else if (event.key == 'n'){
        document.getElementById('body').style.cursor = "default";
        addNew = false;
        controls.enabled = true;
    }
    else if (event.key == 'x'){
        x = false;
        showAxes(axes.x, axesOut);
    }
    else if (event.key == 'y'){
        y = false;
    }
    else if (event.key == 'z'){
        z = false;
        showAxes(axes.z, axesOut);
    }
    else if (event.key == "Control"){
        ctrl = false;
    }
    else if (event.key == "Shift"){
        shift = false;
        
    }
}
function flashNum(num){
    
    let div = document.getElementById('numIdent');
    
    if (flashing && div.innerHTML == 1){
        num += 10;
    }
    
    div.innerHTML = num;
    flashing = true;
    div.style.opacity = 1;
    div.style.zIndex = 100;
    $('#numIdent').stop().animate({'opacity': 0}, 1500);
    setTimeout(function(){
        if (div.style.opacity < 0.3){
            flashing = false;
            div.style.zIndex = -1;
            p(lastClick);
            if (lastClick == 'middle'){
                let index = 0;
                if (sideMode == 'angle'){
                    specialArray.angles[index] = num;
                }
                else{
                    specialArray.gain[index] = num;
                }
            }
        }
//        p(div.style.opacity);
//        flashNum(num + 1);
    }, 1000);
}


//////// side view mouse listeners ----------------
function onMouseDownSide(event){
    if (!mouseOverDiv())
        return;
    
    if (event.origDomEvent.which == 3){
        let index = specialArray.indexOf(event.target);
        specialArray.spreads[index] = (specialArray.spreads[index] == 80) ? 120 : 80;
    }
    
    if (event.origDomEvent.which == 3){
        lastClick = 'right';
        nullifyClick = true;
        controls.enabled = false;
    }
    else if (event.origDomEvent.which == 1){
        lastClick = 'left';
    }
    else{
        lastClick = 'middle';
    }
}
//function onDblClickSide(event){
//
//    p('mode switched');
//
//}
//function enterSide(event){
////    p(event);
////    p('side');
//    if (event.target.parent != null){
//        event.target.hover = true;
//        let own = ownerArray(event.target);
//        p(own)
//        spreadBalls[own.indexOf(event.target)].style.opacity = 0.2;
//    }
//}

function mouseOverDiv(){
    let mx = (mouse.x + 1) / 2 * window.innerWidth//(event.clientX / window.innerWidth) * 2 - 1;
    let my = -(mouse.y - 1) / 2 * window.innerHeight//-(event.clientY / window.innerHeight) * 2 + 1;
    let div = document.getElementById('sideView').style;
//    p(my)// < parseInt(window.innerHeight) - parseInt(div.bottom));
    return (mx > parseInt(div.left) && mx < parseInt(div.left) + parseInt(div.width)
            && my < parseInt(window.innerHeight) - parseInt(div.bottom)
            && my > parseInt(window.innerHeight) - (parseInt(div.bottom) + parseInt(div.height)));
}


//////// array state setting ----------------------
function select(event){// called if just a click (no dragging)
    
    if (axesOut){//only when holding 'm' key
        if (event.target == axes.x){
            mirror('x');
            return;
        }
        if (event.target == axes.z){
            mirror('z');
            return;
        }
    }
    
    
    if (isCabinet(event.target)){
        selectObject(event.target);
    }
    else{// select all when holding shift and clicking in open
        for (let i in allArrays)
            allArrays[i].selected = shift;
    } 

    if (specialArray != null){
        specialArray = specialArray.selected ? specialArray : null;
    }
}
function selectObject(obj){
    
    let objOwner = ownerArray(obj);
    
    if (!ctrl){
        if (!shift && !objOwner.selected){
            for (let arr in allArrays){
                allArrays[arr].selected = false;
            }
        }
        
        specialArray = objOwner;
        htmlDisplaying = false;//makes trackers animate to next speaker array
//        displayTrackers(objOwner);
    }
    objOwner.selected = !ctrl;
}



//////// side view --------------------------------
function updateSideView(){
    let height = window.innerHeight * views[2].height,
        width  = window.innerWidth  * views[2].width;
    let aspect = width / height;
    let scalar = 1 / 27 * specialArray.length;

//        let weight = avg([1.5, 10.2]);
//        scalar = avg([scalar, weight]);
//        p(scalar);

    views[2].camera.left  = -width  / 2 * scalar;
    views[2].camera.right =  width  / 2 * scalar;
    views[2].camera.top   =  height / 2 * scalar;
    views[2].camera.bottom= -height / 2 * scalar;


    let tarPos = specialArray.arr[0].position.clone().add(
        specialArray.arr[specialArray.length - 1].position).multiplyScalar(0.5);//avg 1st & last cab pos


    let camPos = tarPos.clone().add(
        new THREE.Vector3().setFromSphericalCoords(
            2 *12,
            Math.PI/2,
            toRadians(-specialArray.rotY) + Math.PI*3/2
        )
    );
    views[2].camera.position.set(camPos.x, camPos.y, camPos.z);
    views[2].camera.lookAt(tarPos);
    views[2].camera.aspect = aspect;


    views[2].left = ( (trackerPos.x - 30) / window.innerWidth) - views[2].width;
    views[2].bottom = (window.innerHeight - trackerPos.y - height) / window.innerHeight;

    let div = document.getElementById("sideView");
    div.style.left = views[2].left * window.innerWidth;
    div.style.width = width;
    div.style.height = height;
    div.style.bottom = views[2].bottom * window.innerHeight;
//    div.style.zIndex = 5;

//    pVisPos = toScreenXY(specialArray.mountPoints[0], views[2].camera, document.getElementById('sideView'); 
//    document.getElementById('pVis').style.left = pVisPos.x;
//    document.getElementById('pVis').style.top = pVisPos.y;
    
    
}
function updateSpreadBalls(){
    let len = (specialArray == null) ? 0 : specialArray.length;
    let divSize = 42 - len;
    if (specialArray != null && sideViewOut){
        if (spreadBalls.length != specialArray.length){//reconfigure
            while (spreadBalls.length > 0){
                spreadBalls[0].parentNode.removeChild(spreadBalls[0]);
                spreadBalls.shift();
            }
            for (let i in specialArray.arr){
                let elem = document.createElement("DIV");
                elem.style.width = elem.style.height = divSize;
                elem.style.lineHeight = divSize + 'px';
                elem.style.zIndex = 200;
                elem.classList.add("spreadBall");
//                elem.onmousedown = function(){
//                    nullifyClick = true;
//                    for (let i in spreadBalls)
//                        if (spreadBalls[i] == this){
//                            specialArray.spreads[i] = 200 - specialArray.spreads[i];
//                            return;
//                        }   
//                };
                document.getElementById('graph').appendChild(elem);
                spreadBalls[i] = elem;
            }
        }
        else{//update
            for (let i in spreadBalls){
                i = parseInt(i);
                let pos = toScreenXY(specialArray.arr[i].position, views[2].camera, sideView);
                spreadBalls[i].style.left = pos.x + (Math.cos(toRadians(specialArray.getNetAngle(i))) * 60) - divSize / 2;
                spreadBalls[i].style.top = pos.y + (Math.sin(toRadians(specialArray.getNetAngle(i))) * 60) - divSize / 2;
                
                
                let pref = (specialArray.gain[i] > 0) ? '+' : '';
                spreadBalls[i].innerHTML = pref + specialArray.gain[i];
                spreadBalls[i].style.backgroundColor = (specialArray.spreads[i] == 80 || true) ? "lime" : "green";
                
            }
        }
    }
    else{
        for (let i in spreadBalls)
            spreadBalls[i].style.top = -divSize;// off screen
    }
}



//////// draw scene (render/animate) --------------
function setUpScene(){
    
    for (let i in views){
        let camera = views[i].camera;//(i == 0)
//        ? new THREE.PerspectiveCamera(views[i].fov, window.innerWidth / window.innerHeight, 1, 30000)
//        : new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 30000);
        camera.position.fromArray(views[i].camPos);
        camera.up.fromArray(views[i].up);
        
    }
//    views[0].domEvents = new THREEx.DomEvents(views[0].camera, renderer.domElement);
    controls = new THREE.OrbitControls(views[0].camera);
    controls.zoomSpeed = 2;
    
    views[1].camera.lookAt(new THREE.Vector3(views[1].camPos.x, 0, views[1].camPos.z));
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('graph').appendChild(renderer.domElement);
    scene.add(gridHelper);
    
//    camera.position.set(-30 *12, 10 *12, 0 *12);
    axes = {x: makeAxis('x'), z: makeAxis('z')};

    document.addEventListener('mousedown', onMouseDownHelperDoc);
    document.addEventListener('mouseup', onMouseUpHelperDoc);
    document.addEventListener('mousemove', onMouseMove);
    
    document.addEventListener('keydown', KeyDown);
    document.addEventListener('keyup', KeyUp);
    document.addEventListener('wheel', onMouseWheel);
    
    
    document.getElementById('file').onchange = importVenue;
    
    updateSliders(false);
    makeWorldLines();
    setSnapVisible(false);
}
function resizeScene(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    for (let i in views)
        views[i].camera.aspect = window.innerWidth / window.innerHeight;
//    p(window.innerWidth);
}

function zeroCamera(){
    controls.target = new THREE.Vector3(0,0,0);
    views[0].camera.position.setFromSpherical(
        new THREE.Spherical(200 *12, 0.0001, Math.PI*3/2)
    );
}
function resizeGrid(){
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(
        gridSize,        //size
        100 + (0*gridSize /12 /3),  //density
        0x00FF00,
        0x008800
    );
    scene.add(gridHelper);
}

function update(){
    updateHTML();
    //  set hover/selected color
    for (let i in allArrays)
        allArrays[i].updateStates();
    
    updateAxes();
    scene.add(allObjects);
    
    for (let i in venuePieces){
        venueObjects.add(venuePieces[i]);
    }
    scene.add(venueObjects);
    
//    views[0].domEvents.camera(views[0].camera);

    // side view
    if (specialArray != null)
        updateSideView();
    updateSpreadBalls();
    
    

     // bottom right venue view
    if (venueLength != 0 ){//&& !updated)
        
        let height = window.innerHeight * views[1].height,
            width  = window.innerWidth  * views[1].width;
        let aspect = width / height;
        let scalar = venueLength / 290;
        
        let weight = avg([4.8, 31.6]);
        scalar = avg([scalar, weight]);
//        p(scalar);
        
        views[1].camera.left  = -width  / 2 * scalar;
        views[1].camera.right =  width  / 2 * scalar;
        views[1].camera.top   =  height / 2 * scalar;
        views[1].camera.bottom= -height / 2 * scalar;
        
        views[1].camera.position.z = venueCenter;
        views[1].camera.aspect = aspect;
        
//        p(views[1].camera);
//        setTimeout(function(){
//            updated = true;
//        }, 1000);
    }
}
function render(){
//    p('avg: ' + avg([5,2]));
    for (let i in views){
        let view = views[i];
        let camera = views[i].camera;
        
        var left   = Math.floor(window.innerWidth  * view.left);
        var bottom = Math.floor(window.innerHeight * view.bottom);
        var width  = Math.floor(window.innerWidth  * view.width);
        var height = Math.floor(window.innerHeight * view.height);
    

        
        if (i == 2){
            var changeBack = [];
            if (specialArray == null || views[0].camera.position.distanceTo( specialArray.arr[parseInt(specialArray.length/2)].position) < spriteRenderDist){
                document.getElementById("sideView").style.left = left = window.innerWidth;
                sideViewOut = false;
            }
            else{
                specialArray.updateSprites(true);//move sprites to sideView div
                for (let i in scene.children){
                    if (typeof scene.children[i].material != 'undefined'){
                        changeBack.push([scene.children[i].material, scene.children[i].material.opacity]);
                        scene.children[i].material.transparent = true;
                        scene.children[i].material.opacity = 0;
                    }
                }
                for (let i in objects){
                    if (!specialArray.contains(objects[i])){
                        changeBack.push([objects[i].material, objects[i].material.opacity]);
                        objects[i].material.transparent = true;
                        objects[i].material.opacity = 0;
                        
                    }
                }
                for (let i in venuePieces){
                    changeBack.push([venuePieces[i].material, venuePieces[i].material.opacity]);
                    venuePieces[i].material.transparent = true;
                    venuePieces[i].material.opacity = 0;
                }
                sideViewOut = true;
            }
        }
        
        
        
        
        renderer.setViewport(left, bottom, width, height);
        renderer.setScissor(left, bottom, width, height);
        renderer.setScissorTest(true);
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.render(scene, camera);

        
        if (i == 2){
            for (let i in changeBack){
                changeBack[i][0].transparent = false;
                changeBack[i][0].opacity = changeBack[i][1];
            }
        }
    }
    
}
function Animate(){
    let delta = Date.now() - lastFrame;
    lastFrame += delta;

    let waitTime = (1000 / maxFrameRate) - (1 * delta);
    if (waitTime < 0)
        waitTime = 0;

//    fps = (fps * weightRatio) + ((1000 / (delta + waitTime)) * (1 - weightRatio));
//    p(fps);
    
    setTimeout(function(){
        requestAnimationFrame(Animate);
        controls.update();
        update();
        render();
    }, waitTime);
}


//////// random decomp ----------------------------
function round1(val){
    return Math.round(val * 10) / 10;
}
function last(arr){
    return arr[arr.length - 1];
}
function vecsEqual(vec1, vec2){
    return vec1.x === vec2.x && vec1.y === vec2.y && vec1.z === vec2.z;
}
function avg(vals){
    for (var i = sum = 0; i < vals.length; i++)
        sum += vals[i];
    return sum / vals.length;
}

function ownerArray(obj){
    for (let i in allArrays){
        if (allArrays[i].contains(obj)){
            return allArrays[i];
        }
    }
    return null;
}
function isCabinet(object){
    for (let i in allArrays){
        if (allArrays[i].contains(object))
            return true;
    }
    return false;
}

function setOldVals(ownerArr){
    
    for (let arr in allArrays){
        allArrays[arr].dragging = allArrays[arr].selected;
        if (allArrays[arr].selected){
            numSelected++;
            draggingArrs.push(arr);
        }
    }
    if (dragging == 'h' || dragging == 'v'){
        for (let i in draggingArrs){
            allArrays[draggingArrs[i]].ogPos = mouseToGrid(mouse.x, mouse.y);  
        }
    }
    else if (dragging == 'a'){
        oldMouseY = event.clientY;
 
        let ind = 0;
        for (let i in ownerArr.arr){
            if (ownerArr.arr[i] == clickedObj){
                ind = i;
                break;
            }
        }
        anglePos = ownerArr.anglePos[ind];
    }
}
function dragArrays(){
    if (draggingArrs.length == 0)
        return;
    
    let camera = views[0].camera;
    
    if (dragging == 'v' || dragging == 'h'){
        let newPos = mouseToGrid(mouse.x, mouse.y);
        let perspectScalar = 1;
        
        if (dragging == 'v'){
            perspectScalar = Math.sqrt(//horiz distance from array
                (camera.position.x - draggedArray.arr[0].position.x)**2 +
                (camera.position.z - draggedArray.arr[0].position.z)**2
            ) * 0.0007;//artbitrary
        }

        
//        this line should work \/
//        let deltaPos = newPos.clone().sub(draggedArray.ogPos.clone());
        let deltaPos = new THREE.Vector3(
            (newPos.x - draggedArray.ogPos.x),
            (newPos.y - draggedArray.ogPos.y),
            (newPos.z - draggedArray.ogPos.z)
        );
        deltaPos.multiplyScalar(perspectScalar);
    

        // limit movement along certain axes
        if (x)
            deltaPos.z = 0;
        if (z)
            deltaPos.x = 0;

        for (let i in draggingArrs){
            allArrays[draggingArrs[i]].move(deltaPos);
            allArrays[draggingArrs[i]].ogPos = mouseToGrid(mouse.x, mouse.y);
        }
    }
    else if (dragging == 'a'){
        // find which cabinet is being angled
        let indx = 0;
        for (let i in draggedArray.arr){
            if (draggedArray.arr[i] == clickedObj){
                indx = i;
                break;
            }
        }
//        p(parseInt(9 *indx/draggedArray.length));
        let overallSensitivity = (roughPin && sideMode == 'angle')? maxAngSensitivity : angleSensitivity;
        
        let newVal = Math.round(event.clientY / (maxAngSensitivity + 1 - overallSensitivity));
        let oldVal = Math.round(oldMouseY / (maxAngSensitivity + 1 - overallSensitivity));
//        angle that cabinet in all arrays
        for (let i in draggingArrs){
            while (roughPin && sideMode == 'angle'){
                let maxPinVal = pins[parseInt(9 * indx / draggedArray.length)];
                if (--indx < 0 || (
                    (allArrays[draggingArrs[i]].angles[indx + 1] < maxPinVal || newVal >= oldVal) 
                    && (allArrays[draggingArrs[i]].angles[indx + 1] != 0 || newVal <= oldVal)) ){
                    if (indx++ == -1)
                        return;
                    break;
                }
            }
//            p(sideMode);
            if (sideMode == 'angle'){
                anglePos = allArrays[draggingArrs[i]].anglePos[indx];

                if (newVal < oldVal && anglePos < pins.length - 1)
                    anglePos++;
                else if (newVal > oldVal && anglePos > 0)
                    anglePos--;

                if (indx >= 0){
                    allArrays[draggingArrs[i]].anglePos[indx] = anglePos;
                    allArrays[draggingArrs[i]].setPin(indx, pins[anglePos]);
                }
            }
            else{//gain
                gain = allArrays[draggingArrs[i]].gain[indx];
//                p('firing');
                if (newVal < oldVal && gain < 6)
                    gain++;
                else if (newVal > oldVal && gain > -12)
                    gain--;

                if (indx >= 0)
                    allArrays[draggingArrs[i]].gain[indx] = gain;
            }
        }
        oldMouseY = event.clientY;
    }
}


//////// mirroring functionality ------------------
function makeAxis(axis){
    let g = (axis == 'x')
    ? new THREE.BoxGeometry(defaultGridSize, 1, axisWidth)
    : new THREE.BoxGeometry(axisWidth, 1, defaultGridSize);
    let m = new THREE.MeshBasicMaterial({color: 0x000000});
    let axi = new THREE.Mesh(g, m);
    views[0].domEvents.addEventListener(axi,'mouseover', enter, false);
    views[0].domEvents.addEventListener(axi,'mouseout', exit, false);
    views[0].domEvents.addEventListener(axi,'mousedown', onMouseDownHelperMesh);
    views[0].domEvents.addEventListener(axi, 'mouseup', onMouseUpHelperMesh);
    return axi;
}
function showAxes(axis, showing=true){
    if (showing){
        allObjects.add(axis);
    }
    else{
        axis.hover = false;
        allObjects.remove(axis);
    }  
}
function updateAxes(){
    
    axes.x.material.color.set(new THREE.Color(
        (axes.x.hover && axesOut) ? "#FF9999" : "#FF0000"));
                                  
    axes.z.material.color.set(new THREE.Color(
        (axes.z.hover && axesOut) ? "#4455FF" : "#0000FF"));
}

function mirror(axis){
    for (let i = allArrays.length - 1; i >= 0; i--){
        if (allArrays[i].selected){
            let clone = allArrays[i].clone();
            let pos = clone.mountPoints[0];
            if (axis == 'x'){//mirror over x axis
                clone.move(new THREE.Vector3(0, 0, -pos.z * 2));
                clone.rotateY(-180 - allArrays[i].rotY);
                allArrays[i].setMirror(clone, 'x');
//                pVis(clone.cabPosition);
            }
            else if (axis == 'z'){// mirror over z axis
                clone.move(new THREE.Vector3(-pos.x * 2, 0,0));
                clone.rotateY(-allArrays[i].rotY);
                allArrays[i].setMirror(clone, 'z');
            }            
            allArrays.push(clone);
        }   
    }
}


//////// debug functions --------------------------
function p(s){// print
    console.log(s);
}
function pVec(vector, shouldVisualize=false){
    p(vector.x /12 + ", " + vector.y/12 + ", " + vector.z/12);
    if (shouldVisualize)
        pVis(vector);
}

var pVisCount = 0;
var pVisObjects = [];
function pVis(point){
    if (y) return;
    let pVisSclr = 30.0;
    let col = new THREE.Color(0, (pVisCount / pVisSclr) + 0.3, 0);
    pVisCount++;
    let po = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshBasicMaterial({color: col})
    );
    po.position.set(point.x, point.y, point.z);
    pVisObjects.push(po);
    scene.add(po);
}
function clearVis(){
    for (let i in pVisObjects){
        scene.remove(pVisObjects[i]);
    }
    pVisObjects = [];
}


//////// animate ----------------------------------
$("document").ready(function(){
    setUpScene();
    Animate();
});
