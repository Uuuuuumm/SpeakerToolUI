var stageMoveable = false;
var snapping = false;

var venueLength = 0;
var venueCenter = 0;
var venueDown = false;

var currStage = null;
var worldLine = {};
var stageLines = [];

//////// venue/speaker importation ----------------
function addGeometry(zone){

    let geo;
    let mat = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, vertexColors: THREE.VertexColors});
    let mesh;

    if(zone.AreaCount === 1)
        zone.Area = [zone.Area]
    
    if(zone.Type === "Annulus" || zone.Type === "Arc"){

        let radiusBottom = parseFloat(zone.InnerRadius) || 0
        let radialSegments = Math.floor(64 * zone.SweepAngle/360);
        let heightSegments
        let openEnded = true;
        let orientation = parseFloat(zone.Orientation)
        let sweepAngle = parseFloat(zone.SweepAngle)
        let thetaStart = 0
        let thetaLength = toRadians(sweepAngle)

        for(let a in zone.Area){

            let area = zone.Area[a]
            let height = Math.abs(area.Z2 - area.Z1);
            let depth = Math.abs(area.D2 - area.D1)
            heightSegments = Math.min(16, Math.floor(Math.sqrt(depth**2 + height**2)))

            let pos = {
                x: zone.Y,
                y: area.Z1 + height/2,
                z: zone.X
            }
            pos.x *= mToInch;
            pos.y *= mToInch;
            pos.z *= mToInch;

            if(height > 0){
                geo = new THREE.CylinderGeometry(radiusBottom + area.D2, radiusBottom + area.D1, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
                let rotationY = toRadians(orientation - sweepAngle/2)
                geo.rotateY(rotationY)
            }
            else{
                geo = new THREE.RingGeometry(radiusBottom + area.D2, radiusBottom + area.D1,  radialSegments, heightSegments, thetaStart, thetaLength)
                geo.rotateX(toRadians(90))
                let rotationY = toRadians(orientation + sweepAngle/2)
                geo.rotateY(toRadians(-90) + rotationY)
            }
            
            geo.scale(mToInch, mToInch, mToInch);
            colorFace(geo.faces);

            geo.colorsNeedUpdate = true;

            mesh = new THREE.Mesh( geo , mat )
            mesh.position.set(pos.x, pos.y, pos.z)
            mesh.label = zone.Label + area.Label

            let lines = new THREE.LineSegments(
                new THREE.EdgesGeometry(geo.clone()),
                new THREE.LineBasicMaterial({ color: 0xffffff })
            ); 
            mesh.add(lines)

            venuePieces.push(mesh)
        }
    }
       
    else if(zone.Type === 'Rectangle'){
        

        for(let a in zone.Area){

            let area = zone.Area[a];

            let width = parseFloat(zone.Width);

            let deltaH = Math.abs(area.Z2 - area.Z1);
            let deltaD = Math.abs(area.D2 - area.D1);

            let rotZ = Math.atan(deltaH/deltaD);
            let depth = deltaD / Math.cos(rotZ);

            let widthSegments = Math.min( 16, Math.floor(width * 2));
            let heightSegments = Math.min(16, Math.floor(depth * 2));

            geo = new THREE.PlaneGeometry(width, depth, widthSegments, heightSegments);

            let pos = {
                x: zone.Y + (-zone.Depth/2  + area.D1 + deltaD/2) * Math.sin(toRadians(zone.Orientation)), 
                y: area.Z1 + deltaH/2,
                z: zone.X + (-zone.Depth/2  + area.D1 + deltaD/2) * Math.cos(toRadians(zone.Orientation))
            }
            
            pos.x *= mToInch;
            pos.y *= mToInch;
            pos.z *= mToInch;
            
            geo.scale(mToInch, mToInch, mToInch);
            colorFace(geo.faces);
            
            geo.colorsNeedUpdate = true;

            mesh = new THREE.Mesh( geo , mat )
            mesh.setRotationFromEuler(new THREE.Euler(toRadians(90) - rotZ, toRadians(parseFloat(zone.Orientation)), 0, 'YXZ'))
            mesh.position.set(pos.x, pos.y, pos.z)

            mesh.label = zone.Label + area.Label
            let lines = new THREE.LineSegments( new THREE.EdgesGeometry( geo.clone() ), new THREE.LineBasicMaterial( { color: 0xffffff } ) ); 
            mesh.add(lines)

//            domEvents.addEventListener(mesh, 'click', onVenueClick, false);
            venuePieces.push(mesh)

        }
    }

    else if(zone.Type === 'Trapezoid' || zone.Type === 'Right Trapezoid'){

        for(let a in zone.Area){

            let area = zone.Area[a]
            let totalDepth = zone.Depth
            let baseWidth = zone.FrontEdge
            let deltaWidth = zone.BackEdge - zone.FrontEdge


            let d1Percent = area.D1/totalDepth
            let d2Percent = area.D2/totalDepth

            let width1 = baseWidth + deltaWidth * d1Percent
            let width2 = baseWidth + deltaWidth * d2Percent

            let deltaH = Math.abs(area.Z1 - area.Z2)
            let deltaD = Math.abs(area.D1 - area.D2)

            let rotZ = Math.atan(deltaH/deltaD)
            let depth = Math.sqrt( Math.pow(deltaH, 2) + Math.pow(deltaD, 2) )

            let geo = new THREE.Geometry()
 
            const w = function(y){
                return y/depth * width1 + (depth - y)/depth * width2
            }

            let maxColumns = Math.min(16, width1 * 2)
            let rows = Math.min(8, depth * 2)
            
            rowLengths = []

            let origin = new THREE.Vector3();
            let inc = {
                x: width1/maxColumns,
                y: depth/rows
            }



            let indX = 0
            let indY = 0


            if(zone.Type === 'Trapezoid'){

                origin.set(-width2/2, depth/2, 0)

                    while (inc.y * indY < depth + inc.y)
                    {
                        let y = inc.y * indY
                        while(inc.x * indX < w(y) + inc.x)
                        {
                            let x = inc.x * indX;
                            geo.vertices.push(origin.clone().add(new THREE.Vector3(width2/2 - w(y)/2 + Math.min(x, w(y)), Math.max(-y, -depth), 0)))
                            indX ++
                        }

                        rowLengths.push(indX)

                        indX = 0;
                        indY ++;   
                    }
            }

            else
            {
                if(zone.RightAngleLeft === 1){
                    origin.set(0, depth/2, 0);

                    while (inc.y * indY < depth + inc.y){
                        let y = inc.y * indY
                        while(inc.x * indX < w(y) + inc.x) {
                            let x = inc.x * indX;
                            geo.vertices.push(origin.clone().add(new THREE.Vector3(Math.min(x, w(y)), Math.max(-y, -depth), 0)));
                            indX++;
                        }

                        rowLengths.push(indX);

                        indX = 0;
                        indY ++;   
                    }
                }

                else{

                    origin.set(0, depth/2, 0)

                    while (inc.y * indY < depth + inc.y)
                    {
                        let y = inc.y * indY
                        while(inc.x * indX < w(y) + inc.x)
                        {
                            let x = inc.x * indX;
                            geo.vertices.push(origin.clone().add(new THREE.Vector3(Math.max(-x, -w(y)), Math.max(-y, -depth), 0)))
                            indX ++
                        }

                        rowLengths.push(indX)

                        indX = 0;
                        indY ++;   
                    }
                }
                
            }

            
            let offset = 0;
            for(let row = 0; row < rowLengths.length - 1; row ++){
                for(let col = 0; col < rowLengths[row] - 1; col ++){
                    if(col + offset + rowLengths[row] < offset + rowLengths[row] + rowLengths[row + 1]){
                        geo.faces.push(new THREE.Face3(col + offset, col + rowLengths[row] + offset, col + 1 + offset))
                    }

                    else{
                        geo.faces.push(new THREE.Face3(col + offset,offset + rowLengths[row] + rowLengths[row + 1] - 1, col + 1 + offset))
                    }
        
                    if(col + rowLengths[row] + offset + 1 < offset + rowLengths[row] + rowLengths[row + 1] && col + rowLengths[row] + offset + 1 < geo.vertices.length)
                        geo.faces.push(new THREE.Face3(col + 1 + offset, col + rowLengths[row] + offset, col + rowLengths[row] + offset + 1))
                    
                }
                offset += rowLengths[row];
            }

            let pos = {
                x: zone.Y + (-zone.Depth/2  + area.D1 + deltaD/2) * Math.sin(toRadians(zone.Orientation)), 
                y: area.Z1 + deltaH/2,
                z: zone.X + (-zone.Depth/2  + area.D1 + deltaD/2) * Math.cos(toRadians(zone.Orientation)), 
            }
            
            pos.x *= mToInch;
            pos.y *= mToInch;
            pos.z *= mToInch;

            geo.scale(mToInch, mToInch, mToInch);
            colorFace(geo.faces);

            geo.colorsNeedUpdate = true;
            
            mesh = new THREE.Mesh( geo , mat )
            mesh.setRotationFromEuler(new THREE.Euler(toRadians(90) - rotZ, toRadians(parseFloat(zone.Orientation)), 0, 'YXZ'))
            mesh.position.set(pos.x, pos.y, pos.z)
            mesh.label = zone.Label + area.Label


            let lines = new THREE.LineSegments( new THREE.EdgesGeometry( geo.clone() ), new THREE.LineBasicMaterial( { color: 0xffffff } ) ); 
            mesh.add(lines)
//            domEvents.addEventListener(mesh, 'click', onVenueClick, false);
            venuePieces.push(mesh)
        }
    }
    if(zone.Label === 'Stage'){
        stagePos = new THREE.Vector3(
            zone.Y * mToInch,
            0,
            zone.X * mToInch
        );
        currStage = mesh;
//        p("1 " + currStage);
        views[0].domEvents.addEventListener(currStage, 'mousedown', onVenueDown, true);
//        domEvents.addEventListener(currStage, 'mouseup', onMouse, true);
    }
    else{// just to stop stage from being grabbed through venue walls
        views[0].domEvents.addEventListener(mesh, 'mousedown', function(){}, true);
    }
}
function colorFace(faces, v1='gray', v2='gray', v3='gray'){
    
    for (let f in faces) {
        faces[f].vertexColors[0] = new THREE.Color(v1);
        faces[f].vertexColors[1] = new THREE.Color(v2);
        faces[f].vertexColors[2] = new THREE.Color(v3);
    }
}

function importVenue(){
    venueObjects = new THREE.Object3D();    

    let geoProperties = {};
    let name;
    let file = this.files[0];
    let zones;
    
    let reader = new FileReader();
    reader.onload = function(progressEvent){
        zones = JSON.parse(this.result);
//        p(zones)
        for (let i in zones)
            addGeometry(zones[i]);

        if (stagePos){
            for (let v in venuePieces)
                venuePieces[v].position.sub(stagePos);
        }
        if (currStage == null){
            p("no stage found. certain features not supported for this venue")
        }
        makeStageLines();
        setSnapVisible(false);
        
        
        let farEnd = 0, closeEnd = 100 *12;
        for (let i in venuePieces){
        
            if (venuePieces[i].position.z > farEnd){
                farEnd = venuePieces[i].position.z;
            }
            else if (venuePieces[i].position.z < closeEnd){
                closeEnd = venuePieces[i].position.z;
            }
        }
        venueLength = farEnd - closeEnd;
        venueCenter = venueLength / 2 + closeEnd;
    }
        
    reader.readAsText(file);
    

    let nam = document.getElementById('file').value.substr(12);
    nam = nam.substr(0, nam.length - 8);
    document.getElementById('venueName').innerHTML = nam;
    let topValue = settingsOpen ? 75 : 25;
    $('#venueContDiv').animate({top: topValue}, 200);
    document.getElementById('file').value = null;
    
    updated = false;
}
function removeVenue(){
    if (venuePieces.length === 0)
        return;
    
    if (stageLines.length > 0){
        for (let i in stageLines)
            scene.remove(stageLines[i]);
    }
    
    for (let i in venuePieces)
        venueObjects.remove(venuePieces[i]);
    venuePieces = [];
    currStage = null;
    $('#venueContDiv').animate({top: -50}, 200);
}

function addNewArray(){
    let spkArr = new speakerArray(arraySize);
    let origin = new THREE.Vector3(0, spkArr.CAB_Y * (spkArr.length - 0.5), 0);
    
    for (let i in allArrays){
        if (vecsEqual(allArrays[i].mountPoints[0], origin)){
//            p('dup');
            spkArr.eradicate();
            return;
        }
    }    
    
    allArrays.push(spkArr);
    spkArr.mountPoints[0] = origin;
    spkArr.updateMountPoints();
}


//////// button functions --------------------------
function toggleStageMove(){
    document.getElementById('stageMoveBttn').firstChild.style.opacity = stageMoveable ? "1" : "0.6";
    document.getElementById('stageMoveBttn').title = stageMoveable ? "enable movement of the venue" : "disable movement of the venue";
    stageMoveable = !stageMoveable;
}


//////// other venue functions ------------------------
function onVenueDown(){
    if (!stageMoveable)
        return;
    venueDown = true;
    controls.enabled = false;
    currStage.ogPos = mouseToGrid(mouse.x, mouse.y);
    setSnapVisible();
}
function venueDrag(event){
    
    let newPos = mouseToGrid(mouse.x, mouse.y);
    let oldPos = currStage.ogPos;
    let deltaPos = newPos.sub(oldPos);
    deltaPos.setY(0);
    
    
    for (let i in venuePieces){
        venuePieces[i].position.add(deltaPos);
        venuePieces[i].material.transparent = true;
        venuePieces[i].material.opacity = (venuePieces[i] != currStage) ? 0.15 : 0.4;
        
    }
    currStage.ogPos = mouseToGrid(mouse.x, mouse.y);
    snapStage();
}
function venueUp(){
    for (let i in venuePieces){
        venuePieces[i].material.opacity = 1;
        venuePieces[i].material.transparent = false;
    }
    venueDown = false;
    setSnapVisible(false);
    if (snapping)
        toggleStageMove();
}

function snapStage(){
    updateStageLines();
    snapping = false;
    
    let camera = views[0].camera;
    
    let snapThreshold = Math.sqrt(//horiz distance from array
        (camera.position.x - currStage.position.x)**2 +
        (camera.position.y - currStage.position.y)**2 +
        (camera.position.z - currStage.position.z)**2
    ) * 0.005;
        
    
    //check x snaps
    for (let i = 0; i < stageLines.length/2; i++){  
        if (Math.abs(stageLines[i].zVal - worldLine.zVal) < snapThreshold && !ctrl){
//            p('snap');
            let deltaPos = new THREE.Vector3(0,0, -stageLines[i].zVal + worldLine.zVal);
            
            worldLine.x.material.setValues({color: 0xff8800});
            stageLines[i].material.setValues({color: 0xff8800});
            
            for (let i in venuePieces){
                venuePieces[i].position.add(deltaPos);
            }
            updateStageLines();
            snapping = true;
            break;
        }
        else{
            worldLine.x.material.setValues({color: 0x00ffff});
            stageLines[i].material.setValues({color: 0x00ffff});
        }
    }
    
    //check z snaps
    for (let i = stageLines.length/2; i < stageLines.length; i++){  
        if (Math.abs(stageLines[i].xVal - worldLine.xVal) < snapThreshold && !ctrl){
//            p('snap');
            let deltaPos = new THREE.Vector3(-stageLines[i].xVal + worldLine.xVal, 0,0);
            
            worldLine.z.material.setValues({color: 0xff8800});
            stageLines[i].material.setValues({color: 0xff8800});
            
            for (let i in venuePieces){
                venuePieces[i].position.add(deltaPos);
            }
            updateStageLines();
            snapping = true;
            break;
        }else{
            worldLine.z.material.setValues({color: 0x00ffff});
            stageLines[i].material.setValues({color: 0x00ffff});
        }
    }
    
}
function setSnapVisible(vis=true){
    let op = vis ? 1 : 0;
    worldLine.x.material.opacity = op;
    worldLine.z.material.opacity = op;
    worldLine.x.material.transparent = !vis;
    worldLine.z.material.transparent = !vis;
    
    for (let i in stageLines){
        stageLines[i].material.opacity = op;
        stageLines[i].material.transparent = !vis;
    }
    
}

function makeWorldLines(){
    let matX = new THREE.LineBasicMaterial({color: 0x00ffff});
    let matZ = new THREE.LineBasicMaterial({color: 0x00ffff});
    matX.transparent = true;
    matZ.transparent = true;
    
    // x lines
    let geom = new THREE.Geometry();
    geom.vertices.push(new THREE.Vector3(-gridSize/2, 0, 0));
    geom.vertices.push(new THREE.Vector3(gridSize/2, 0, 0));
    
    worldLine.x = new THREE.Line(geom, matX);
    
    geom = new THREE.Geometry();
    geom.vertices.push(new THREE.Vector3(0, 0, -gridSize/2));
    geom.vertices.push(new THREE.Vector3(0, 0, gridSize/2));
    
    worldLine.z = new THREE.Line(geom, matZ);
    worldLine.xVal = worldLine.zVal = 0;
 
    scene.add(worldLine.x);
    scene.add(worldLine.z);
    
}
function updateWorldLines(){
    let mat = new THREE.LineBasicMaterial({color: 0x00ffff});
    
    // x lines
    let xVerts = [];
    xVerts.push(new THREE.Vector3(-gridSize/2, 0, 0));
    xVerts.push(new THREE.Vector3(gridSize/2, 0, 0));
    
    // z lines
    let zVerts = [];
    zVerts.push(new THREE.Vector3(0, 0, -gridSize/2));
    zVerts.push(new THREE.Vector3(0, 0, gridSize/2));

 
    worldLine.x.geometry.vertices = xVerts;
    worldLine.z.geometry.vertices = zVerts;
    worldLine.x.geometry.computeBoundingSphere();
    worldLine.z.geometry.computeBoundingSphere();
    worldLine.x.geometry.verticesNeedUpdate = true;
    worldLine.z.geometry.verticesNeedUpdate = true;
    
}

function makeStageLines(){
    
    // remove old stagelines
//    if (stageLines.length > 0){
//        for (let i in stageLines)
//            scene.remove(stageLines[i]);
//    }
//    p(currStage);
    let width = currStage.geometry.parameters.width * mToInch;
    let length = currStage.geometry.parameters.height * mToInch;
    let pos = currStage.position;
    
    // x lines
    let geom = [new THREE.Geometry(), new THREE.Geometry(), new THREE.Geometry(),
        new THREE.Geometry(), new THREE.Geometry(), new THREE.Geometry()];
    geom[0].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z));
    geom[0].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z));
    
    geom[1].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z + length/2));
    geom[1].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z + length/2));
    
    geom[2].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z - length/2));
    geom[2].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z - length/2));
    
    
    // z lines
    geom[3].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z));
    geom[3].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z));
    
    geom[4].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z + length/2));
    geom[4].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z + length/2));
    
    geom[5].vertices.push(new THREE.Vector3(-width/2, pos.y, pos.z - length/2));
    geom[5].vertices.push(new THREE.Vector3(width/2, pos.y, pos.z - length/2));
    

    stageLines = [];
    for (let i in geom){
        let mat = new THREE.LineBasicMaterial({color: 0x00ffff});
        mat.transparent = true;
        stageLines.push(new THREE.LineSegments(geom[i], mat));
        scene.add(stageLines[i]);   
    }
 
}

function updateStageLines(){
    
//    p(currStage);
    let width = currStage.geometry.parameters.width * mToInch;
    let length = currStage.geometry.parameters.height * mToInch;
    let pos = currStage.position;
    
    // x lines
    let xVerts = [[],[],[]];
    xVerts[0].push(new THREE.Vector3(pos.x - width/2, pos.y, pos.z));
    xVerts[0].push(new THREE.Vector3(pos.x + width/2, pos.y, pos.z));
    stageLines[0].zVal = pos.z;
    
    xVerts[1].push(new THREE.Vector3(pos.x - width/2, pos.y, pos.z + length/2));
    xVerts[1].push(new THREE.Vector3(pos.x + width/2, pos.y, pos.z + length/2));
    stageLines[1].zVal = pos.z + length/2;
    
    xVerts[2].push(new THREE.Vector3(pos.x - width/2, pos.y, pos.z - length/2));
    xVerts[2].push(new THREE.Vector3(pos.x + width/2, pos.y, pos.z - length/2));
    stageLines[2].zVal = pos.z - length/2;
    
    
    
    // z lines
    let zVerts = [[],[],[]];
    zVerts[0].push(new THREE.Vector3(pos.x, pos.y, pos.z - length/2));
    zVerts[0].push(new THREE.Vector3(pos.x, pos.y, pos.z + length/2));
    stageLines[3].xVal = pos.x;
    
    zVerts[1].push(new THREE.Vector3(pos.x + width/2, pos.y, pos.z - length/2));
    zVerts[1].push(new THREE.Vector3(pos.x + width/2, pos.y, pos.z + length/2));
    stageLines[4].xVal = pos.x + width/2;
    
    zVerts[2].push(new THREE.Vector3(pos.x - width/2, pos.y, pos.z - length/2));
    zVerts[2].push(new THREE.Vector3(pos.x - width/2, pos.y, pos.z + length/2));
    stageLines[5].xVal = pos.x - width/2;
    
    
    for (let i in xVerts){
        stageLines[i].geometry.vertices = xVerts[i];
        stageLines[i].geometry.computeBoundingSphere();
        stageLines[i].geometry.verticesNeedUpdate = true;
    }
//    p(stageLines[3]);
    for (let i in zVerts){
//        p(i)
        i = parseInt(i);
//        p(stageLines[3 + 0]);
        stageLines[3 + i].geometry.vertices = zVerts[i];
        stageLines[3 + i].geometry.computeBoundingSphere();
        stageLines[3 + i].geometry.verticesNeedUpdate = true;
    }
}
