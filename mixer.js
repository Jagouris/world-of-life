function Mixer(placque){
    this.placque = placque;
	this.placque.style.display = "inline-block";
	
    this.pulley = this.placque.querySelector("#pulley");
    
    this.canvas = this.placque.querySelector("CANVAS");
    this.ctx = this.canvas.getContext("2d");
    
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    this.emitVolumeChange = function(){};
    this.gain = 1;
    
    this.adjusting = false;
    this.running = true;
	
	this.muted = false;
    
    this.init = function(audio, muted, nameNode, colorNode){
        this.splitter = context.createChannelSplitter(2);
		
		this.gain = audio.gain.value;
        
        audio.connect(this.splitter);
        
        this.analyzerL = new AnalyserNode(context);
        this.analyzerR = new AnalyserNode(context);

        this.bufferLength = this.analyzerL.frequencyBinCount;
        this.audioData = new Float32Array(this.bufferLength);
        
        this.splitter.connect(this.analyzerL, 0, 0);
        this.splitter.connect(this.analyzerR, 0, 0);

        this.pulley.addEventListener("mousedown", (e) => {
            this.pulleyPosition = parseInt(window.getComputedStyle(this.pulley)["top"]);
            
            this.yMin = parseInt(window.getComputedStyle(this.canvas)["top"]) - this.pulley.height / 2;
            this.yMax = this.yMin + this.height;
            
            this.pulley.style.cursor = "grabbing";
            
            this.adjusting = true;
        }, false);

        document.addEventListener("mousemove", (e) => {
            if(this.adjusting){
                this.pulleyPosition += e.movementY;
                
                if(this.pulleyPosition > this.yMin && this.pulleyPosition < this.yMax){
                    this.pulley.style.top = "" + this.pulleyPosition + "px";
                    
                    this.gain = (this.yMax - this.pulleyPosition) / this.height;
                }else if(this.pulleyPosition < this.yMin){
                    this.pulley.style.top = "" + this.yMin + "px";
                    
                    this.gain = 1;
                }else if(this.pulleyPosition > this.yMax){
                    this.pulley.style.top = "" + this.yMax + "px";
                    
                    this.gain = 0;
                }
                
                this.placque.querySelector("#gain").innerText = "Gain:\n" + this.gain;
                
                this.emitVolumeChange(this.gain);
            }
        }, false);

        document.addEventListener("mouseup", (e) => {
            this.adjusting = false;
            this.pulley.style.cursor = "grab";
        }, false);
		
		if(nameNode && colorNode){
			this.placque.querySelector("#instrument-name").innerText = nameNode.textContent;
			
			nameNode.addEventListener("input", (e)=>{
				this.placque.querySelector("#instrument-name").innerText = e.target.textContent;
			}, false);
			
			this.placque.querySelector("#instrument-name").style.background = colorNode.value;
			
			colorNode.addEventListener("input", (e)=>{
				this.placque.querySelector("#instrument-name").style.background = e.target.value;
			}, false);
		}else{
			this.placque.querySelector("#instrument-name").innerText = "MASTER";
			this.placque.querySelector("#instrument-name").style.background = "#000";
		}
		
        this.pulley.style.top = "" + (parseInt(window.getComputedStyle(this.canvas).top) + (this.height - this.gain * this.height) - this.pulley.height / 2) + "px";
        
		if(muted){
			this.toggleMute();
			audio.gain.value = 0;
		}
		
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        
        this.makeImage();
        
        this.draw();
    };
    
    this.draw = function(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#000';
        
        this.analyzerL.getFloatTimeDomainData(this.audioData);
        
        this.barHeight = Math.max.apply(null, this.audioData) * this.height * window.devicePixelRatio;
        
        this.ctx.fillRect(0, this.canvas.height - this.barHeight, 7, this.barHeight);
        
        this.analyzerR.getFloatTimeDomainData(this.audioData);
            
        this.barHeight = Math.max.apply(null, this.audioData) * this.height * window.devicePixelRatio;
        
        this.ctx.fillRect(12, this.canvas.height - this.barHeight, 7, this.barHeight);
        
        if(this.running) window.requestAnimationFrame(()=>{this.draw();});
    };
    
    this.makeImage = function(){
		this.ctx.font = "8px Open Sans";
		
        this.ctx.fillRect(0, this.height - this.barHeight, 7, this.barHeight);
        this.ctx.strokeRect(0, 0, 7, this.height);
        
        this.ctx.fillRect(12, this.height - this.barHeight, 7, this.barHeight);
        this.ctx.strokeRect(12, 0, 7, this.height);
        
        for(let i = 0; i < 5; i++){
            let y = i * this.height / 5;
            let dBFS = (20 * Math.log10((this.height - y) / this.height)).toFixed(2);
            
            this.ctx.beginPath();
            
            this.ctx.moveTo(20, y + 1);
            this.ctx.lineTo(25, y + 1);
            
            this.ctx.fillText(dBFS, 20, y + 10);
            this.ctx.fillText("dBFS", 20, y + 20);
            
            this.ctx.stroke();
        }
        
        this.placque.querySelector("#mixer-template").src = this.canvas.toDataURL();
        this.placque.querySelector("#mixer-template").width = this.width;
		this.placque.querySelector("#mixer-template").height = this.height;
    };
    
    this.startAnimation = function(){
        this.running = true;
        this.draw();
    };
    
    this.stopAnimation = function(){
        this.running = false;
    };
    
    this.onVolumeChange = function(fn){
        this.emitVolumeChange = fn;
    };
	
	this.__delete__ = function(){
		this.placque.remove();
	};
	
	this.toggleMute = function(){
		if(this.muted){
			this.muted = false;
			this.emitVolumeChange(this.gain);
			
			this.placque.querySelector("#muted").style.display = "none";
			this.placque.querySelector("#unmuted").style.display = "inline-block";
		}else{
			this.muted = true;
			this.emitVolumeChange(0);
			
			this.placque.querySelector("#muted").style.display = "inline-block";
			this.placque.querySelector("#unmuted").style.display = "none";
		}
	};
}