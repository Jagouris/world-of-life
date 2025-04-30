(function(){
    let canvas, ctx;
    let placque;
    
    let width, height;

    let octave = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let startKey = 21;
    let endKey = 128;
    let keyWidth;
    let keys = [];
	let values = [];
    let keysImage;
    let highlightKey = null;
    let selectedKey = 39;
    
    let hidden = true;
    let visualOffset = 0;
    
    let piano = {
        keyListeners: [function(key){}],
        onKeyChange: function(fn){
            this.keyListeners.push(fn);
        },
        setKey: function(key){
            selectedKey = key;
            
            for(let listener of this.keyListeners) listener(keys[key].key);
        },
		get selectedKey(){
			return selectedKey;
		},
        hiddenListeners: [function(){}],
        onHide: function(fn){
            this.hiddenListeners.push(fn);
        },
        get hidden(){
            return hidden;
        },
        show: function(key, x, y){
            show(key, x, y);
            
            for(let listener of this.hiddenListeners) listener(hidden);
        },
        hide: function(){
            hide();
            
            for(let listener of this.hiddenListeners) listener(hidden);
        }
    };

    window.loadPiano = function(){
        placque = document.querySelector("#piano");
        
        canvas = placque.querySelector("CANVAS");
        ctx = canvas.getContext("2d");
        
        width = canvas.width;
        height = canvas.height;
        
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        
        ctx.lineWidth *= window.devicePixelRatio;
        ctx.font = (11 * window.devicePixelRatio) + "px Open Sans";

        keyWidth = canvas.width / 14;
        keysImage = new Image();
        
        makeImage();
        loadKeys();
        
        ctx.fillStyle = "#f00";

        canvas.addEventListener("mousemove", (e) => {
            ctx.fillStyle = "#f00";

            for(let i in keys){
                if(keys[i].collides((e.offsetX * window.devicePixelRatio) + visualOffset, (e.offsetY * window.devicePixelRatio))){
                    if(i != highlightKey){
                        highlightKey = i;
                        
                        document.querySelector("#selected-note").innerText = keys[i].tag; 

                        draw();

                        break;
                    }
                }
            }
        }, false);

        canvas.addEventListener("mousedown", (e) => {
            if(highlightKey) piano.setKey(highlightKey);
            
            draw();
        }, false);

        canvas.addEventListener("mouseout", (e) => {
            highlightKey = null;

            document.querySelector("#selected-note").innerText = keys[selectedKey].tag;

            draw();
        }, false);
        
        for(let button of placque.querySelectorAll("BUTTON")){
            let mousehold;
			
            button.addEventListener("mousedown", (e) => {
                shiftKeys(visualOffset + parseInt(e.target.value) * keyWidth);
				
				mousehold = setInterval(()=>{
					shiftKeys(visualOffset + parseInt(e.target.value) * keyWidth);
				}, 100);
            }, false);
			
			document.addEventListener("mouseup", (e)=>{
				clearInterval(mousehold);
			}, false);
        }
        
        document.addEventListener("mousedown", (e)=>{
            if(e.button == 0){
                if(e.target == placque || e.target.offsetParent == placque){
                    //
                }else{
                    piano.hide();
                }
            }
        }, false);
        
        return piano;
    };
    
    function show(key, x, y){
        selectedKey = values[key];
        
        shiftKeys(keys[selectedKey].x - canvas.width / 2);

        placque.style.left = "" + x + "px";
        placque.style.top = "" + y + "px";
        
        hidden = false;
        placque.style.display = "block";

        document.querySelector("#selected-note").innerText = keys[selectedKey].tag;
        
        draw();
    }
    
    function hide(){
        hidden = true;
        
        placque.style.display = "none";
    }
    
    function shiftKeys(newOffset){
        if(newOffset >= keys[0].x && newOffset + canvas.width <= keys[keys.length - 1].x){
            visualOffset = newOffset;
        }else if(newOffset < keys[0].x){
            visualOffset = keys[0].x;
        }else if(newOffset + canvas.width > keys[keys.length - 1].x){
            visualOffset = keys[keys.length - 1].x - canvas.width + keyWidth;
        }

        draw();
    }

    function draw(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
            keysImage, visualOffset % (canvas.width / 2), 0, canvas.width / 2, canvas.height, 0, 0, canvas.width/2, canvas.height
        );

        ctx.drawImage(
            keysImage, visualOffset % (canvas.width / 2), 0, canvas.width / 2, canvas.height, canvas.width / 2, 0, canvas.width / 2, canvas.height
        );
        
        ctx.fillStyle = "#ccff00";
        
        if(highlightKey){
            ctx.fillRect(
                keys[highlightKey].x - visualOffset,
                keys[highlightKey].y,
                keyWidth,
                canvas.height / 2
            );
        }

        ctx.beginPath();
        ctx.arc(keys[selectedKey].x - visualOffset + keyWidth / 2, keys[selectedKey].y + canvas.height / 2 - keyWidth / 2, keyWidth / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = "#000";
        
        ctx.fillText("C" + Math.floor(visualOffset/(keyWidth * 7) - 1), - (visualOffset % (canvas.width / 2)) + 1, canvas.height - 4 * window.devicePixelRatio);
        ctx.fillText("C" + Math.floor(visualOffset/(keyWidth * 7)), (canvas.width / 2) - (visualOffset % (canvas.width / 2)) + 1, canvas.height - 4 * window.devicePixelRatio);
        ctx.fillText("C" + Math.floor(visualOffset/(keyWidth * 7) + 1), canvas.width - (visualOffset % (canvas.width / 2)) + 1, canvas.height - 4 * window.devicePixelRatio);
    }

    function makeImage(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let j = 0;
        ctx.fillStyle = "#000";

        for(let i = 0; i < 24; i++){
            if(octave[i % 12].includes("#")){
                ctx.strokeStyle = "#fff";

                ctx.rect(
                    j * keyWidth - keyWidth / 2,
                    0,
                    keyWidth,
                    canvas.height/2
                );

                ctx.fill();
                ctx.stroke();
            }else{
                ctx.strokeStyle = "#000";

                ctx.strokeRect(
                    j * keyWidth,
                    0,
                    keyWidth,
                    canvas.height
                );

                j++;
            }
        }

        keysImage.src = canvas.toDataURL();
    }
    
    function loadKeys(){
        let j = 0;

        for(let i = 0; i < endKey; i++){
            if(octave[i % 12].includes("#")){
                if(i >= startKey){
					keys.push(new Key(j * keyWidth - keyWidth / 2, 0, i));
					values[i] = keys.length - 1;
				}
            }else{
                if(i >= startKey){
					keys.push(new Key(j * keyWidth, canvas.height / 2, i));
					values[i] = keys.length - 1;
				}

                j++;
            }
        }
    }

    function Key(x, y, key){
        this.x = x;
        this.y = y;
        this.key = key;
        this.tag = octave[key % 12] + Math.floor((key - 12) / 12);

        this.collides = function(x, y){
            if(x > this.x && x < this.x + keyWidth && y > this.y && y < this.y + canvas.height / 2) return true;

            return false;
        };
    }
})();