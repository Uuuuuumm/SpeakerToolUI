var spriteRenderDist = 70 *12;

function textSprite(cab, camera){
//    this.width = 15;
//    this.height = 20;
//    p(cab);
    this.defaultFontSize = 20;
    
    this.ownerCab = cab;
    this.camera = camera;
    
    this.dispVal = 0;
    this.position = new THREE.Vector3();
    
    this.node = this.makeSprite();
}

textSprite.prototype.makeSprite = function(){
    var node = document.createElement('SPAN');
    
//    node.style.backgroundColor = 'black';
    
    node.innerHTML = this.dispVal;
    
    node.style.fontSize = this.defaultFontSize;
    node.style.fontFamily = " 'Ubuntu', sans-serif";
    node.style.fontWeight = 'bold';
    node.style.textAlign = 'center';
    node.style.textShadow = '0 0 4px red';
    node.style.color = 'lime';
    
//    node.style.backgroundColor = "red";
    
    node.style.borderRadius = 10;
//    node.style.width = this.width;
    node.style.height = this.height;
    node.style.lineHeight = 1;
    node.style.position = 'absolute';
    
    gub = this.ownerCab.hover;
    
//    p(this.hoverSpeaker);
//    node.addEventListener("onmouseenter", this.hoverSpeaker );
//    node.addEventListener("onmouseout", this.hoverSpeaker );
    
    document.getElementById('graph').appendChild(node);
    return node;
};
textSprite.prototype.updateSprite = function(newPos, text){
        
    let camToSpriteDist = this.camera.position.distanceTo(newPos);
    
    let distHoriz = Math.sqrt(
        (this.camera.position.x - newPos.x)**2 +
        (this.camera.position.z - newPos.z)**2 
    );
    let distVert = Math.abs(this.camera.position.y - newPos.y);
    let polarAngle = Math.atan(distVert / distHoriz);
//    p(polarAngle);
    
    if (camToSpriteDist < spriteRenderDist && polarAngle < Math.PI*5/12){
        newPos = toScreenPosition(newPos);
        this.dispVal = text;
        this.node.innerHTML = this.dispVal;
        if (newPos != this.position){
            this.position = newPos;
            
            this.node.style.left = newPos.x - (this.node.getBoundingClientRect().width / 2);
            this.node.style.top = newPos.y - (this.node.getBoundingClientRect().height / 2);
        }
//        this.dispVal = text;
        this.node.style.fontSize = this.defaultFontSize - ((this.dispVal == 10) ? 3 : 0);

        
    }
    else
        this.node.style.top = -500;
};

textSprite.prototype.updateSpriteSideView = function(newPos, text, i=0){
    
    this.dispVal = text;
    this.node.innerHTML = this.dispVal;
    
    if (newPos != this.position){
        let rot = (specialArray == null) ? 180 : specialArray.getNetAngle(i);
//        p(rot + '  ,   ' + i);
        this.node.style.transform = 'rotate(' + rot + 'deg)';
        this.position = newPos;
//        p(this.node.getBoundingClientRect().width);
        this.node.style.left = newPos.x - (this.node.getBoundingClientRect().width / 2);
        this.node.style.top = newPos.y - (this.node.getBoundingClientRect().height / 2);
    }
//    if (text != this.dispVal){
//    this.dispVal = text;
    this.node.style.fontSize = this.defaultFontSize - ((this.dispVal == 10) ? 5 : 0);

    
//    }
};

textSprite.prototype.rmSprite = function(){
    this.node.parentNode.removeChild(this.node);
};
