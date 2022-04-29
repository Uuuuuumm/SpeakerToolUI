var popNumTop = 80;

var htmlDisplaying = rotYDragging = false;
var trackersOnScreen = true;

var trackWidth = 30;
var trackerPos = {
    x: 0,
    y: 0
};
var trackerDim = {
    x: 0,
    y: 0
};

var settingsOpen = false;

var overRotDiv = rotDivOut = false;
var netRotAngle = dispRotation = 0;
const rotYSize = 170;
const divRadius = rotYSize / 2;

var txtSprites = [];


//////// display controllers ----------------------
function updateHTML(){

    htmlDisplaying = (specialArray != null);
    
    if (specialArray != null)
        popDisplay();
    else{//displays are not out
//        let popDivs = document.getElementsByClassName('popNum');
//        for (let i in popDivs)
//            popDivs[i].innerHTML = "";
    }
    
    for (let i in allArrays)
        allArrays[i].updateSprites();
    updateTrackers();
}

function popDisplay(){
//    p('yup');
    document.getElementById('popRot').innerHTML =
        (netRotAngle % 360) <= 180
        ? round1(netRotAngle % 360) + "&#176;"/*degree symbol*/
        : -round1(360 - (netRotAngle % 360)) + DEGSYMBOL/*degree symbol*/;
    
    document.getElementById('popY').innerHTML = "height:<br>" +
        round1((specialArray.arr[0].position.y + specialArray.CAB_Y/2)/12) + "ft";
    
    document.getElementById('popLen').innerHTML = "cabinet count: " + specialArray.length;
    
    document.getElementById('popXZ').innerHTML = "x: " +
        round1((specialArray.mountPoints[0].x)/12) + "ft <br>z: " +
        round1((specialArray.mountPoints[0].z)/12) + "ft";
    

}

function updateTrackers(){
    if (specialArray != null){
 
        let leftest = 2000, rightest = 0;
        let upest = 2000, downest = 0;
        for (let i in specialArray.arr){
            let pos = toScreenPosition(specialArray.arr[i].position);
            if (pos.x < leftest){
                leftest = pos.x;
            }
            if (pos.x > rightest){
                rightest = pos.x;
            }
            if (pos.y < upest){
                upest = pos.y;
            }
            if (pos.y > downest){
                downest = pos.y;
            }
            
        }
//        p(parseInt(document.getElementById('topR').style.left));
        let zoomDist = views[0].camera.position.distanceTo(specialArray.arr[parseInt(specialArray.length/2)].position);
//        p(zoomDist);
        
        let vertBuffer = 10000 / zoomDist;
        let horizBuffer = 13000 / zoomDist;
        let animationTime = (!trackersOnScreen) ? 100 : 0;
//        p(animationTime);
        
        
        trackerDim.x = rightest - leftest + (2*horizBuffer);
        trackerDim.y = downest - upest + (2*vertBuffer);
        
        $('#topL').animate({left: leftest - horizBuffer - trackWidth, top: upest - vertBuffer}, animationTime);
        $('#topR').animate({left: rightest + horizBuffer, top: upest - vertBuffer}, animationTime);
        $('#botL').animate({left: leftest - horizBuffer - trackWidth, top: downest + vertBuffer}, animationTime);
        $('#botR').animate({left: rightest + horizBuffer, top: downest + vertBuffer}, animationTime);
      
        trackerPos.x = leftest - horizBuffer;
        trackerPos.y = upest - vertBuffer;
        
        updateRotDiv(trackerPos, animationTime);
        trackersOnScreen = true;
    }
    else{
        if (trackersOnScreen){
//            p("git");
            //move trackers to corners of screen
            $('#topL').stop().animate({left: -30, top: 25}, 100);
            $('#topR').stop().animate({left: window.innerWidth, top: 25}, 100);
            $('#botL').stop().animate({left: -30, top: window.innerHeight - 10}, 100);
            $('#botR').stop().animate({left: window.innerWidth, top: window.innerHeight - 10}, 100);

            updateRotDiv();
            trackersOnScreen = false;
        }
    }
}
function updateRotDiv(position=null, animationTime=0){
    if (position != null){
        
        netRotAngle = -specialArray.rotY;
        dispRotation = (relativeDial) ? 180 - toDegrees(controls.getAzimuthalAngle()) : 0;
        
        $("#rotDiv").css({transform: 'rotate(' + -(dispRotation + netRotAngle) + 'deg)'});
        
        
        if (rotYDragging){
            dispPopDivs(position, animationTime);
            return;
        }
        
        
        rotYDiv.x = position.x + trackerDim.x / 2 - divRadius;
        rotYDiv.y = position.y - rotYSize;
        
        let relocated = false;
        if (rotYDiv.y < 25){
            rotYDiv.y += trackerDim.y + rotYSize + 10;
            relocated = true;
        }
        
        
        $("#rotDiv").css("left", rotYDiv.x + "px");
        $("#rotDiv").css("top", rotYDiv.y + "px");
        
        $("#rotDiv").animate({width: rotYSize - 20, height: rotYSize - 20}, animationTime);
        $("#rotSpeaker").css("borderWidth", "1px");
        $("#rotDiv").css("borderWidth", "10px");
        
        dispPopRotDiv(position, animationTime, relocated);
        dispPopDivs(position, animationTime);
    }
    else{
        $("#rotDiv").stop().animate({width: 0, height: 0}, 100);
        $("#rotSpeaker").css("borderWidth", "0");
        $("#rotDiv").css("borderWidth", "0");
        
        dispPopRotDiv();
        dispPopDivs();
    }
    rotDivOut = (position != null);
}
function dispPopRotDiv(position=null, animationTime=0, relocated=false){
    if (position != null){
        // rotation label
        let popRotPos = {
            x: window.innerWidth - position.x - trackerDim.x / 2 + divRadius,
            y: position.y - divRadius - 20
        };
        if (relocated)
            popRotPos.y += trackerDim.y + rotYSize + 10;
        
        $("#popRot").css("top", popRotPos.y + "px");
        $("#popRot").animate({right: popRotPos.x - 10}, animationTime);
       
    }
    else{
        $("#popRot").stop().animate({right: window.innerWidth}, 100);
    }
}
function dispPopDivs(position=null, animationTime=0){
    if (position != null){
        
        // height label
        let popYPos = {
            x: position.x + trackerDim.x + trackWidth - 10,
            y: position.y + trackerDim.y / 8
        };
        if (trackerDim.y < 70){
            popYPos.y = -500;
        }
        
        $("#popY").css("top", popYPos.y + "px");
        $("#popY").delay(animationTime).animate({left: popYPos.x}, animationTime);
        
        // length label
        let popLenPos = {
            x: position.x + trackerDim.x + trackWidth,
            y: position.y
        };
        
        $("#popLen").css("top", popLenPos.y + "px");
        $("#popLen").delay(animationTime).animate({left: popLenPos.x}, animationTime);
        
        // x + z label
        let popXZPos = {
            x: position.x + trackerDim.x + trackWidth - 10,
            y: position.y + trackerDim.y - (trackerDim.y / 8) - 70
        };
        if (trackerDim.y < 180){
            popXZPos.y = -500;
        }
        
        $("#popXZ").css("top", popXZPos.y + "px");
        $("#popXZ").delay(animationTime).animate({left: popXZPos.x}, animationTime);
    }
    else{
        $("#popY").stop().animate({left: window.innerWidth}, 100);
        $("#popLen").stop().animate({left: window.innerWidth}, 100);
        $("#popXZ").stop().animate({left: window.innerWidth}, 100);
    }
}


//////// JQUERY listeners ---------------------
$("document").ready(function(){
    
    $("#settingsDiv").mousedown(function(){
//        p("settings")
        enableCtrls(false);
    });
    $("#toolBar").mousedown(function(){
        enableCtrls(false);
    });
    $("#graph").mouseenter(function(){
        if (!mouseDown)
            enableCtrls(true);
    });


    $("#rotDiv").mouseenter(function(){
//        p('over');
        for (let i in objects){
            objects[i].hover = false;
        }
        
        $("#rotDiv").animate({'opacity': 1}, 10);
        overRotDiv = true;
    });
    $("#rotDiv").mouseleave(function(){
        
        if (!rotYDragging){
            $("#rotDiv").stop().animate({'opacity': 0.7}, 10);
        }
        overRotDiv = false;
    });

    $("#rotGrab").mousedown(function(m){
        if (m.which == 1){
            nullifyClick = rotYDragging = true;
            controls.enableRotate = controls.enablePan = false;
            dragging = 'r';
        }

    });
    $("body").mouseup(function(m){
        if (m.which == 1){
            if (!overRotDiv){
                $("#rotDiv").animate({'opacity': 0.7}, 100);
            }
    //        p('up');
            if (rotYDragging){
                rotYDragging = false;
                controls.enableRotate = controls.enablePan = true;
            }
        }

    });

    $("#body").mousemove(function(e){
        if (rotYDragging){
            let angle = 90 - toDegrees(Math.atan(
                ((rotYDiv.y + divRadius) - (e.clientY))/
                ((rotYDiv.x + divRadius) - (e.clientX))
            ));

            if ((rotYDiv.x + divRadius) - (e.clientX) < 0)
                angle += 180;

            netRotAngle = 360 - dispRotation + angle;

            for (let i in allArrays){
                if (allArrays[i].selected){
                    allArrays[i].rotateY(-netRotAngle);
//                    updateTrackers(specialArray);
                }
            }
        }
    });
});


//////// toolbar functions -------------
function enableCtrls(enabled=true){
//    p(enabled);
    controls.enabled = enabled;
    nullifyKey = !enabled;
    if (!enabled)
        nullifyClick = true;
    else{
        $('input').blur();
    }
}


// settings menu functions
function toggleSettings(){
    if (settingsOpen){// then close
        $("#settingsDiv").animate({ top: -50}, 300);
        if (venuePieces.length > 0)
            $('#venueContDiv').animate({top: 25}, 270);
    }
    else{// if closed, then open
        $("#settingsDiv").animate({top: 25}, 300);
        if (venuePieces.length > 0)
            $('#venueContDiv').animate({top: 75}, 270);
    }
    settingsOpen = !settingsOpen;
}

function artificialCheck(box, boxNumber){
    box.blur();
    if (boxNumber == 0){
        roughPin = !roughPin;
    }
    else if (boxNumber == 1){
        relativeDial = !relativeDial;
    }
    updateSliders(false);
}
function updateSliders(getNewVals=true){
    enableCtrls(true)
    if (getNewVals){
        angleSensitivity = document.getElementById('angleSensSlider').value;
        gridSize = document.getElementById('gridSizeField').value * 12;
        maxFrameRate = document.getElementById('frameRateField').value;
        roughPin = document.getElementById('roughPinBox').value == "on";
        relativeDial = document.getElementById('relativeDialBox').value == "on";
    }
    else{
        document.getElementById('angleSensSlider').value = angleSensitivity;
        document.getElementById('gridSizeField').value = gridSize / 12;
        document.getElementById('frameRateField').value = maxFrameRate;
        document.getElementById('roughPinBox').value = roughPin ? "on":"off";
        document.getElementById('relativeDialBox').value = relativeDial ? "on":"off";
    }
    
    document.getElementById('ASSlabel').innerHTML = "Middle Drag sensitivity: " + angleSensitivity;
    
    document.getElementById('GSFlabel').innerHTML = "Grid Size: <br>" + (gridSize/12) + "ft";
    resizeGrid();
    
    document.getElementById('MFRlabel').innerHTML = "Max Frame Rate: " + maxFrameRate + "fps";
    
    document.getElementById('RPlabel').innerHTML = "Quick Pinning: " + ((roughPin)? "on":"off");
    
    document.getElementById('RDlabel').innerHTML = "Relative Dial: " + ((relativeDial)? "on":"off");
    
    
    controls.enabled = false;
    if (getNewVals)
        updateWorldLines();
}
