function speakerArray(len){
    
    this.CAB_X = 45;
    this.CAB_Y = 14;
    this.CAB_Z = 22;
    this.CAB_y = this.CAB_Y - (2 * (Math.tan(toRadians(5)) * this.CAB_Z));
    
    this.length = len;
    this.cabPosition = mouseToGrid(mouse.x, mouse.y, null);//position of top box
    this.selected = this.dragging = false;
    
    this.ogPos = new THREE.Vector3();
    this.rotY = 0;
    
    this.gainFontSize = 16;
    
    this.arr = [];
    this.angles = [];
    this.anglePos = [];
    this.angleSprites = [];
    this.spreadSprites = [];
    this.gain = [];
    this.mountPoints = [];
    this.rays = [];
    this.spreads = [];
    
    
    
    // cabinet child properties
    this.cabinetChildren = [this.arr, this.angles, this.anglePos, this.angleSprites, this.gain,                                     this.spreadSprites, this.rays, this.spreads];
    this.cabChildDefaults = [null/*arr*/, 0/*angle*/, 0/*angPos*/, null/*angSprite*/, 0/*gain*/,
                             null/*sprite*/, null/*ray*/, 80/*spread*/];

    this.mirror = null;
    this.mirrorAxis;
    this.moveLine = null;
    
    this.face = null;
    this.faceIndexi = {
        top: [4, 10],
        bottom: [2, 6],
        left: [7, 11],
        right: [1, 3],
        front: [0, 8],
        back: [5, 9]
    }
    
    
    let c1 = new THREE.Color("#666666");
    let c2 = c1.clone().lerp(new THREE.Color("#DDDDDD"), 0.4);
    this.colors = {
        og: c1,
        select: c2,
        hover: c2,
        hoverSelect: c1
    };
    
    
    this.lineMat = new THREE.LineBasicMaterial({color: 0xFF0000});
    this.lineLength = 50 *12;
    
    
    
    
    for (let cab in this.cabinetChildren){//pushing zeros to empty arrays
        for (let i = 0; i < this.length; i++){
            this.cabinetChildren[cab][i] = this.cabChildDefaults[cab];
        }
    }
    
    this.cabPosition.z += this.CAB_Z / 2;
    this.cabPosition.y = 1.2 * this.CAB_Y * (this.length - 0.5);
    
    
    for (let i = 0; i < this.length; i++){
        var cab = this.getCabinetMesh();
        allObjects.add(cab);
        this.arr[i] = cab;
        this.makeRay(i);
        this.angleSprites[i] = new textSprite(cab, views[0].camera);
        this.spreadSprites[i] = new textSprite(cab, views[0].camera);
        this.spreadSprites[i].defaultFontSize = this.gainFontSize;
    }
    this.updateMountPoints();
    this.makeMovementLine();
}

speakerArray.prototype.contains = function(speaker){
    for (let i in this.arr){
        if (this.arr[i] == speaker)
            return true;
    }
    return false;
};
speakerArray.prototype.indexOf = function(cabinet){
    for (let i in this.arr){
        if (this.arr[i] == cabinet)
            return i;
    }
    return -1;
}

speakerArray.prototype.updateStates = function(){

    if (this.selected){
        for (let i in this.arr)
            this.arr[i].material.color.set((this.arr[i].hover) ? this.colors.hoverSelect : this.colors.select);
    }
    else{
        for (let i in this.arr)
            this.arr[i].material.color.set((this.arr[i].hover) ? this.colors.hover : this.colors.og);
    }
    this.updateSprites();
};
speakerArray.prototype.updateMountPoints = function(){
    
    let permAng = toDegrees(Math.atan(this.CAB_Z / this.CAB_Y));
    let alpha = toRadians(-this.rotY);
    
    
//    if (typeof this.mountPoints[0] == 'null' || typeof this.mountPoints[0] == 'undefined'){
    if (this.mountPoints[0] == null){
        let beta = toRadians(permAng + this.getNetAngle(0));

        let vecLength = Math.sqrt(
            (this.CAB_Y / 2)**2 +
            (this.CAB_Z / 2)**2
        );
//        pVis(this.mountPoints[0]);
        this.mountPoints[0] = this.cabPosition.clone().add(
            new THREE.Vector3(
                Math.sin(alpha) * Math.sin(beta) * vecLength,
                1               * Math.cos(beta) * vecLength,
                Math.cos(alpha) * Math.sin(beta) * vecLength
            )
        );
    }

    for (let i = 1; i < this.length; i++){
        let prev = this.mountPoints[i - 1].clone();    
        beta = toRadians(180 + this.getNetAngle(i - 1));
        let frontLength = new THREE.Vector3(
            Math.sin(alpha) * Math.sin(beta) * this.CAB_Y,
            1               * Math.cos(beta) * this.CAB_Y,// y is not effected by rotY
            Math.cos(alpha) * Math.sin(beta) * this.CAB_Y
        );

        this.mountPoints[i] = prev.add(frontLength);
    }
    this.hangCabinets();
};

speakerArray.prototype.move = function(deltaPos, timeToLive=2){
    if (timeToLive == 0)
        return;
    let regretMovement = false;
    this.cabPosition.add(deltaPos);

    
    // limit y movement
    if (this.cabPosition.y < -100 *12){
        regretMovement = true;
    }
    else if (this.cabPosition.y > 500 *12){
        regretMovement = true;
    }
    
    // limit horiz movement speed (caused by low viewing angle)
    let moveDist = Math.sqrt(
        (deltaPos.x)**2 + 
        (deltaPos.z)**2
    );
    if (moveDist > 0 *12 && Math.abs(controls.getPolarAngle() - Math.PI*3/2) < Math.PI/12 ){
        this.cabPosition.sub(deltaPos.multiplyScalar(0.1));
        p("slowing");
    }
    
    if (regretMovement){
        this.cabPosition.sub(deltaPos);
        p("regretful");
        return;
    }
    
    this.mountPoints[0].add(deltaPos);
    this.updateMountPoints();
    this.updateMovementLine();
    
    if (this.mirror != null && !this.mirror.selected){
        if (this.mirrorAxis == 'x'){
            this.mirror.move(new THREE.Vector3(deltaPos.x, deltaPos.y, - deltaPos.z), timeToLive - 1);
        }
        else if (this.mirrorAxis == 'z'){
            this.mirror.move(new THREE.Vector3(-deltaPos.x, deltaPos.y, deltaPos.z), timeToLive - 1);
        }
    }
//    rotDivOut = false;
};
speakerArray.prototype.rotateY = function(theta, timeToLive=2){
    if (timeToLive == 0)
        return;
    
    this.rotY = theta % 360;
    
    
    this.cabPosition.set(
        this.mountPoints[0].x + (Math.sin(-toRadians(this.rotY + 180)) * this.CAB_Z/2),
        this.cabPosition.y,
        this.mountPoints[0].z + (Math.cos(-toRadians(this.rotY + 180)) * this.CAB_Z/2)
    );
//    pVec(this.cabPosition, true);
    

    for (let i = 0; i < this.length; i++){
        this.arr[i].setRotationFromEuler(new THREE.Euler(
            toRadians(this.getNetAngle(i)),
            toRadians(-this.rotY),
            0,
            "YXZ"
        ));
        this.updateRay(i);
    }
    this.updateMountPoints();
    if (this.mirror != null && !this.mirror.selected){
        if (this.mirrorAxis == 'x'){
            this.mirror.rotateY(-180 - this.rotY, timeToLive - 1);
        }
        else if (this.mirrorAxis == 'z'){
            this.mirror.rotateY(-this.rotY, timeToLive - 1);
        }
    }
};

speakerArray.prototype.getNetAngle = function(i){
    var sum = 0;
    if (typeof i != 'number'){//if given cabinet object
        var index = 0;
        for (let j = 0; j < this.length; j++){
            if (this.arr[j] == i)
                index = j;
        }
        i = index
    }
    for (let cab = 0; cab <= i; cab++)
        sum += this.angles[cab];
    return sum;
};

speakerArray.prototype.setPin = function(index, angle, timeToLive=2){
    if (timeToLive == 0)
        return;
        
    this.angles[index] = angle;
    this.rotateY(this.rotY);
    if (this.mirror != null)
        this.mirror.setPin(index, angle, timeToLive - 1);
};
speakerArray.prototype.hangCabinets = function(i=0){

    for (; i < this.length; i++){
        let permAng = toDegrees(Math.atan(this.CAB_Z / this.CAB_Y));

        let cornToCentDist = Math.sqrt( (this.CAB_Y/2)**2 + (this.CAB_Z/2)**2 );

        let alpha = toRadians(-this.rotY * 1);
        let beta = toRadians(180 + (this.getNetAngle(i) + permAng));
        let newDist = new THREE.Vector3(
            Math.sin(alpha) * Math.sin(beta) * cornToCentDist,
            1               * Math.cos(beta) * cornToCentDist,
            Math.cos(alpha) * Math.sin(beta) * cornToCentDist
        );
        let newPos = this.mountPoints[i].clone().add(newDist);

        this.arr[i].position.set(newPos.x, newPos.y, newPos.z);
        this.updateRay(i);
    }
};

speakerArray.prototype.clone = function(obj=this){ 
    var copy = new speakerArray(this.length);
    
    for (let i in this.arr){
//        var pos = this.arr[i].position;
//        copy.arr[i].position.set(pos.x, pos.y, pos.z);
        
        copy.angles[i] = this.angles[i];
    }
    copy.mountPoints[0] = this.mountPoints[0].clone();
    copy.cabPosition = this.cabPosition.clone();
    return copy;
};
speakerArray.prototype.setMirror = function(mirr, axis, timeToLive=2){
    if (timeToLive == 0)
        return;
        
    if (this.mirror != null){
        this.mirror.mirror = null;
    }
    this.mirror = mirr;
    this.mirrorAxis = axis;
    this.mirror.setMirror(this, axis, timeToLive - 1);
};

speakerArray.prototype.hide = function(){
    for (let spk = 0; spk < this.length; spk++){
        allObjects.remove(this.arr[spk]);
        scene.remove(this.rays[spk]);
        this.sprites[spk].rmSprite();
    }
};
speakerArray.prototype.show = function(){
    for (let spk = 0; spk < this.length; spk++){
        allObjects.add(this.arr[spk]);
        this.updateRay(spk);
        scene.add(this.rays[spk]); 
    }
};
speakerArray.prototype.eradicate = function(){
    if (specialArray == this){
//        p("spec");
        specialArray = null;
    }
    this.hide();
    for (let i = 0; i < this.length; i++){
//        allObjects.remove(this.arr[i]);
//        scene.remove(this.rays[i]);
        delete this.arr[i];
    }
    delete this;
    
    if (this.mirror != null)
        this.mirror.mirror = null;
};

speakerArray.prototype.getCabinetMesh = function(){
    
    this.angle = 0;
    var points = [
        new
        THREE.Vector3(this.CAB_X / 2, this.CAB_Y / 2, this.CAB_Z / 2),// top front right
        new
        THREE.Vector3(-this.CAB_X / 2, this.CAB_Y / 2, this.CAB_Z / 2),// top front left
        new
        THREE.Vector3(-this.CAB_X / 2, -this.CAB_Y / 2, this.CAB_Z / 2),// bot front left
        new
        THREE.Vector3(this.CAB_X / 2, -this.CAB_Y / 2, this.CAB_Z / 2),// bot front right
        
        new
        THREE.Vector3(this.CAB_X / 2, this.CAB_y / 2, -this.CAB_Z / 2),// top back right
        new
        THREE.Vector3(-this.CAB_X / 2, this.CAB_y / 2, -this.CAB_Z / 2),// top back left
        new
        THREE.Vector3(-this.CAB_X / 2, -this.CAB_y / 2, -this.CAB_Z / 2),// bot back left
        new
        THREE.Vector3(this.CAB_X / 2, -this.CAB_y / 2, -this.CAB_Z / 2)// bot back right
        
    ];
    let geom = new THREE.ConvexGeometry(points);
//    var mat = new THREE.LineBasicMaterial({color: this.ogColor});
    let mat = new THREE.MeshBasicMaterial({color: this.colors.og});
    let mesh = new THREE.Mesh(geom, mat);
    
    mesh.add(new THREE.LineSegments(
                new THREE.EdgesGeometry(geom),
                new THREE.LineBasicMaterial({color: 0x222222})
    ));
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    views[0].domEvents.addEventListener(mesh, 'mousedown', onMouseDownHelperMesh, true);
    views[0].domEvents.addEventListener(mesh, 'mouseup', onMouseUpHelperMesh, true);
    views[0].domEvents.addEventListener(mesh, 'mouseover', enter, !true);
    views[0].domEvents.addEventListener(mesh, 'mouseout', exit, true);
    views[0].domEvents.addEventListener(mesh, 'dblclick', onDblClick, true);// only works for left click

    views[2].domEvents.addEventListener(mesh, 'mousedown', onMouseDownSide, true);
    views[2].domEvents.addEventListener(mesh, 'mouseover', enter, true);
//    views[2].domEvents.addEventListener(mesh, 'dblclick', onDblClickSide, true);// only works for left click
    
    mesh.name = 'cabinet' + this.arr.length;
    
    return mesh;
};
speakerArray.prototype.addCabinet = function(timeToLive=2){
    if (timeToLive == 0 || this.length >= 20)
        return;
    
    this.length++;
    let cab = this.getCabinetMesh();

    allObjects.add(cab);
    
    if (this.angles[this.length - 1] == undefined)
        this.angles[this.length - 1] = 0;
    
    this.arr.push(cab);
    this.anglePos[this.length - 1] = 0;
    this.makeRay(this.length - 1);
    this.gain.push(0);
    this.angleSprites.push(new textSprite(cab, views[0].camera));
    this.spreadSprites.push(new textSprite(cab, views[0].camera));
    this.spreadSprites[this.length -1].defaultFontSize = this.gainFontSize;
    this.spreads.push(80);
    this.setPin(this.length - 1, this.angles[this.length - 1]);
    
    if (this.mirror != null){
        this.mirror.addCabinet(timeToLive - 1);
    }
};
speakerArray.prototype.rmCabinet = function(timeToLive=2){
    if (timeToLive == 0)
        return;
    
    this.length--;
    
    allObjects.remove(this.arr[this.length]);
//    scene.remove(this.arr[this.length]);
    scene.remove(this.rays[this.length]);
//    p(allObjects);
    
    
    let newArr = [];
    let newRay = [];
    let newAngSpri = [];
    let newGainSpri = [];
//    let newSpread = [];
    for (let i = 0; i < this.length; i++){
        newArr[i] = this.arr[i];
        newRay[i] = this.rays[i];
        newAngSpri[i] = this.angleSprites[i];
        newGainSpri[i] = this.spreadSprites[i];
    }
    
    this.angleSprites[this.length].rmSprite();
    this.spreadSprites[this.length].rmSprite();
    
    this.arr = newArr;
    this.rays = newRay;
    this.angleSprites = newAngSpri;
    this.spreadSprites = newGainSpri;

    
    if (this.length == 0){// same code from backspace
        let temp = [];
        for (let arr in allArrays){
            if (allArrays[arr] == this)
                allArrays[arr].eradicate();
            else
                temp.push(allArrays[arr]);
        }
        delete(allArrays);
        allArrays = temp.slice(0);
    }
    
    if (this.mirror != null)
        this.mirror.rmCabinet(timeToLive - 1);
};


//////// extra componets of a speaker array ------------------
speakerArray.prototype.makeRay = function(i){
//    p(this.arr);
    if (this.rays[i] == null){
        let geom = new THREE.Geometry();
        geom.vertices.push(this.arr[i].position);
        
        let faceVec = new THREE.Vector3(
            0,
            Math.sin(toRadians(-this.getNetAngle(i))) * this.lineLength,
            Math.cos(toRadians(-this.getNetAngle(i))) * this.lineLength
        );

        faceVec.add(this.arr[i].position);
        geom.vertices.push(faceVec);
        
        this.rays[i] = new THREE.Line(geom, this.lineMat);
        this.rays[i].geometry.computeBoundingSphere();
//        this.rays[i].frustumCulled = false;
        scene.add(this.rays[i]);
    }
    else{
        alert("bad code!!!")
    }
};
speakerArray.prototype.updateRay = function(i){
    let alpha = toRadians(-this.rotY);
    let beta = toRadians(-this.getNetAngle(i));
    let faceVec = new THREE.Vector3(
        Math.sin(alpha) * Math.cos(beta) * this.lineLength,
        1               * Math.sin(beta) * this.lineLength,
        Math.cos(alpha) * Math.cos(beta) * this.lineLength
    );

    faceVec.add(this.arr[i].position);

    this.rays[i].geometry.vertices[1] = faceVec;
    this.rays[i].geometry.computeBoundingSphere();
    this.rays[i].geometry.verticesNeedUpdate = true;
};

speakerArray.prototype.makeMovementLine = function(){
    let geom = new THREE.Geometry();
    let lenVec = new THREE.Vector3(0, 1000 *12,0);
    
    geom.vertices.push(this.arr[0].position.clone().sub(lenVec));
    geom.vertices.push(this.arr[0].position.clone().add(lenVec));

    this.moveLine = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({color: 0x00FF00})
    );
    this.moveLine.geometry.computeBoundingSphere();
};
speakerArray.prototype.updateMovementLine = function(){
    let lenVec = new THREE.Vector3(0, 1000 *12,0);

    this.moveLine.geometry.vertices[0] = this.arr[0].position.clone().sub(lenVec);
    this.moveLine.geometry.vertices[1] = this.arr[0].position.clone().add(lenVec);
    
    this.moveLine.geometry.computeBoundingSphere();
    this.moveLine.geometry.verticesNeedUpdate = true;
};
speakerArray.prototype.showMoveLine = function(show=true){
    if (show){
        scene.add(this.moveLine);
    }
    else{
        scene.remove(this.moveLine);
    }
};

speakerArray.prototype.updateSprites = function(sideView=false){
    let faces = this.arr[parseInt(this.length / 2)].geometry.faces;
    let biggestAng = 0;
    let camera = views[0].camera;
    for (let faceInd in faces){
    
        let cameraVector = this.mountPoints[parseInt(this.length / 2)].clone().sub(camera.position.clone()).normalize();
        let faceVector = faces[faceInd].normal.clone().applyEuler(this.arr[parseInt(this.length / 2)].rotation.clone());

        let angle = toDegrees(faceVector.angleTo(cameraVector));
        
        // top and bottom are undesired for displaying pin angles
        if (angle > biggestAng
            && faceInd != this.faceIndexi.top[0]    && faceInd != this.faceIndexi.top[1]
            && faceInd != this.faceIndexi.bottom[0] && faceInd != this.faceIndexi.bottom[1]){
            
            biggestAng = angle;
            var faceIndex = faceInd;
        }
    }
//    p(biggestAng);
    
    for (let i in this.angleSprites){
        i = parseInt(i);
        let centerVec = this.mountPoints[i].clone().add(
            new THREE.Vector3(0,0, -this.CAB_Z / 2).applyEuler(this.arr[i].rotation)
        );
        let faceVec = faces[faceIndex].normal.clone();
        faceVec.y = 0;
        faceVec.applyEuler(this.arr[i].rotation);
        let finVec = centerVec.add(faceVec.multiplyScalar(
            (faceIndex == this.faceIndexi.left[0] || faceIndex == this.faceIndexi.left[1]
            || faceIndex == this.faceIndexi.right[0] || faceIndex == this.faceIndexi.right[1])
            ? this.CAB_X / 2 : this.CAB_Z / 2
        ));
        if (sideView){
//            if (sideMode == "angle"){
                let pos = toScreenXY(specialArray.mountPoints[i], views[2].camera, document.getElementById('sideView'));
                this.angleSprites[i].updateSpriteSideView(pos, this.angles[i]);// + '&#176;');
//            }
//            else{// gain
                pos = toScreenXY(specialArray.arr[i].position, views[2].camera, document.getElementById('sideView'));
                
                this.spreadSprites[i].updateSpriteSideView(pos, this.spreads[i] + DEGSYMBOL, i);// + '&#176;');
//            }
        }
        else{
            this.angleSprites[i].updateSprite(finVec, this.angles[i]);
            let pos = {x: 0, y: -500};
            this.spreadSprites[i].updateSpriteSideView(pos, 0);
        }
    }
};