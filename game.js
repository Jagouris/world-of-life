//https://fonts.adobe.com/fonts/pf-pixelscript#fonts-section

function Game(){
	this.grid = [];
	this.grid2 = [];
	this.srcPattern = [];
	this.cache = [];
	
	this.running = false;
	this.propertyEdit = false;
	this.patternEdit = false;
	this.mixing = true;
	
	this.selectedSquare = null;

	this.init = function(gameNode, index, piano, mixerNode, json){
		if(!json){
			json = {
				name: "Instrument " + (index + 1),
				color: HSLtoHex(Math.floor(Math.random() * 360), 0.66, 0.53),
				gridSize: 14,
				width: 200,
				height: 200,
				top: ((window.innerHeight / 2) - 200),
				left: ((window.innerWidth / 2) - 100),
				tempo: 2,
				repeatTempo: 32,
				repeatCount: 2,
				gain: 1,
				soundPath: "",
				muted: false,
				running: false
			}
		}
		
		this.name = json.name;
		
		this.placque = gameNode.cloneNode(true);
		this.placque.style.display = "block";
		
		this.placque.addEventListener("mousedown", () => {
			this.bringToFront();
		}, false);
		
		this.placque.querySelector("#instrument-name").innerText = this.name;
		this.placque.querySelector("#color").value = json.color;
		this.placque.dataset.instance = index;
		
		document.body.appendChild(this.placque);
		
		this.width = json.width;
		this.height = json.height;
		this.top = json.top;
		this.left = json.left;
		
		this.canvas = document.createElement("CANVAS");
		this.ctx = this.canvas.getContext("2d");
		
		this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.width * window.devicePixelRatio;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.width = this.width + 'px';
		
		this.placque.style.top = this.top + 'px';
        this.placque.style.left = this.left + 'px';
		
		this.placque.querySelector("#game").appendChild(this.canvas);
		zIndex.push(this);
		this.placque.style.zIndex = zIndex.length - 1;
		
		this.gridSize = json.gridSize;
		
		this.makeGrid();
		this.makeImage();
		this.updateColor();
		
		if(json.grid) this.grid = json.grid;
		if(json.grid2) this.grid2 = json.grid2;
		
		this.tempo = json.tempo;
		this.repeatTempo = json.repeatTempo;
		this.repeatCount = json.repeatCount;
		
		for(let property of this.placque.querySelector("#game-properties")){
			switch(property.id){
				case "size":
					property.value = json.gridSize;
					
					break;
				case "tempo":
					for(let option of property){
						if(parseInt(option.value) == json.tempo) option.setAttribute("selected", "selected");
					}
					
					break;
				case "repeat-tempo":
					for(let option of property){
						if(parseInt(option.value) == json.repeatTempo) option.setAttribute("selected", "selected");
					}
					
					break;
				case "repeat-count":
					property.value = json.repeatCount;
					
					break;
				case "synth":
					for(let option of property){
						if(option.value == json.soundPath) option.setAttribute("selected", "selected");
					}
					
					break;
			}
		}
		
		this.canvas.addEventListener("mousedown", (e) => {
			let x = Math.floor(e.offsetX / (this.width / this.gridSize));
			let y = Math.floor(e.offsetY / (this.width / this.gridSize));
			
			if(piano.hidden){
				if(e.button == 0){
					if(this.patternEdit) this.grid2[x][y] = this.grid2[x][y] ? 0 : new Note(piano.selectedKey);
					else if(this.running == false) this.grid[x][y] = this.grid[x][y] ? 0 : 1;

					this.draw();

					return;
				}
			}else{
				piano.hide();
			}
			
			if(this.patternEdit){
				if(this.grid2[x][y]){
					this.selectedSquare = this.grid2[x][y];

					piano.show(this.selectedSquare.note, e.clientX, e.clientY);

					this.draw();
				}
			}
		}, false);
		
		this.placque.querySelector("#game-properties").addEventListener("input", (e) => {
			switch(e.target.id){
				case "color":
					this.updateColor();
					
					break;
				case "size":
					this.gridSize = e.target.valueAsNumber;
					this.makeGrid();
					this.makeImage();
					this.draw();
					
					break;
				case "tempo":
					this.tempo = parseInt(e.target.value);
					
					break;
				case "repeat-tempo":
					this.repeatTempo = parseInt(e.target.value);
					
					break;
				case "repeat-count":
					this.repeatCount = e.target.valueAsNumber;
					
					break;
				case "synth":
					this.soundPath = e.target.value;
				
					if(this.soundPath != ""){
						this.loadDevice(this.soundPath);
					}else{
						this.soundPath = "";
						
						this.device.node.disconnect();
						this.device = undefined;
						
						let propertyForm = this.placque.querySelector("#synth-field");
						
						propertyForm.innerHTML = "";
						
						let textNode = document.createElement("LI");
						
						textNode.innerText = "Please select a sound from the game properties.";
						
						propertyForm.appendChild(textNode);
					}
					
					break;
			}
		});
		
		this.placque.querySelector("#instrument-name").addEventListener("input", (e) => {
			this.name = e.target.textContent;
		}, false);
		
		piano.onKeyChange((note) => {
			if(this.selectedSquare) this.selectedSquare.note = note;
		});
		
		piano.onHide((state) => {
			if(state == true && this.selectedSquare){
				this.selectedSquare = null;
				
				this.draw();
			}
		});
		
		this.output = new GainNode(context);
		this.output.connect(context.destination);
		this.output.gain.value = json.gain;
		
		this.mixer = new Mixer(mixerNode);
		mixerNode.dataset.instance = index;
		this.mixer.init(this.output, json.muted, this.placque.querySelector("#instrument-name"), this.placque.querySelector("#color"));
		
		this.mixer.onVolumeChange((gain) => {
			this.output.gain.value = gain;
		});
		
		this.soundPath = json.soundPath;
		if(this.soundPath) this.loadDevice(this.soundPath, json);

		this.draw();
		
		if(json.running) this.toggleRunning();
	};
	
	this.loadDevice = async function(path, json){
		let propertyForm = this.placque.querySelector("#synth-field");
		
		propertyForm.innerHTML = "";
		
		let patchSource = await fetch(path);
		let patcher = await patchSource.json();
		
		this.device = await RNBO.createDevice({context, patcher});
		
		this.device.node.connect(this.output);
		
		let patcherData = patcher.desc.parameters.sort(function(a, b){
			return a.order - b.order;
		});
					
		let currentCategory = "";

		for(let i in patcherData){
			let param = this.device.parametersById.get(patcherData[i].paramId);

			if(param){
				if(currentCategory != patcherData[i].meta.category){
					let categoryNode = document.createElement("li");
					
					categoryNode.style.fontSize = "15px";
					categoryNode.style.fontWeight = "bold";
					categoryNode.setAttribute("class", "property");
					categoryNode.innerText = patcherData[i].meta.category;

					propertyForm.appendChild(categoryNode);

					currentCategory = patcherData[i].meta.category;
				}

				let propertyNode = document.createElement("li");
				
				let titleNode = document.createElement("div");
				titleNode.setAttribute("class", "property");
				titleNode.innerText = patcherData[i].meta.title + ":";
				
				propertyNode.appendChild(titleNode);

				let inputNode = document.createElement("div");
				inputNode.setAttribute("class", "property");

				if(!patcherData[i].isEnum){
					let rangeNode = document.createElement("input");

					rangeNode.setAttribute("type", "range");
					rangeNode.setAttribute("min", param.min);
					rangeNode.setAttribute("max", param.max);
					
					if(json && json.synth){
						rangeNode.setAttribute("value", json.synth[patcherData[i].paramId]);
						
						param.value = json.synth[patcherData[i].paramId];
					}else{
						rangeNode.setAttribute("value", param.initialValue);
					}
					
					rangeNode.setAttribute("step", 0.001);
					rangeNode.setAttribute("width", "100%");
					rangeNode.setAttribute("id", patcherData[i].paramId);

					rangeNode.addEventListener("input", (e) => {
						param.value = e.target.valueAsNumber;
					}, false);

					inputNode.appendChild(rangeNode);
				}else{
					let selectNode = document.createElement("select");
					selectNode.setAttribute("id", patcherData[i].paramId);

					for(let j in patcherData[i].enumValues){
						let optionNode = document.createElement("option");

						optionNode.setAttribute("value", j);
						optionNode.innerText = patcherData[i].enumValues[j];

						selectNode.appendChild(optionNode);
					}
					
					if(json && json.synth){
						selectNode[json.synth[patcherData[i].paramId]].setAttribute("selected", "selected");
						
						param.value = json.synth[patcherData[i].paramId];
					}

					selectNode.addEventListener("input", (e) => {
						param.value = parseInt(e.target.value);
					}, false);

					inputNode.appendChild(selectNode);
				}
				
				propertyNode.appendChild(inputNode);

				propertyForm.appendChild(propertyNode);
			}
		}
	};

	this.draw = function(e){
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		for(let x = 0; x < this.gridSize; x++){
			for(let y = 0; y < this.gridSize; y++){
				if(this.patternEdit){
					if(this.grid2[x][y]){
						if(this.grid2[x][y] == this.selectedSquare){
							this.ctx.fillStyle = "#ccff00";
						}else{
							this.ctx.fillStyle = this.color;
						}
					
						this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
					}else if(this.grid[x][y]){
						this.ctx.fillStyle = "#00000040";
						this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
					}
				}else{
					if(this.grid[x][y]){
						this.ctx.fillStyle = "#000";
						this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
					}else if(this.grid2[x][y]){
						this.ctx.fillStyle = this.color+"50";
						this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
					}
				}
			}
		}
	};

	this.calculate = function(){
		if(this.running && beat % this.tempo == 0){
			this.cache = [];

			for(let x = 0; x < this.gridSize; x++){
				this.cache[x] = [];

				for(let y = 0; y < this.gridSize; y++){
					this.cache[x][y] = this.grid[x][y];

					var count = 0;

					for(let i = -1; i < 2; i++) for(let j = -1; j < 2; j++){
						if(i == 0 && j == 0) continue;

						x2 = x+i;
						y2 = y+j;

						x2 = x2 == this.gridSize ? 0 : x2 < 0 ? this.gridSize - 1 : x2;
						y2 = y2 == this.gridSize ? 0 : y2 < 0 ? this.gridSize - 1 : y2;

						if(this.grid[x2][y2] == 1) count += 1;
					}

					if(this.grid[x][y]){
						if(count < 2 || count > 3){
							this.cache[x][y] = 0;

							if(this.grid2[x][y]) this.grid2[x][y].await = false;
						}
					}else{
						if(count == 3){
							this.cache[x][y] = 1;

							if(this.grid2[x][y] && !this.grid2[x][y].await){
								this.grid2[x][y].await = true;
								
								if(this.device) this.playNote(this.grid2[x][y].note);
							}
						}
					}
				}
			}

			this.grid = this.cache;
			
			if(beat % (this.repeatTempo * this.repeatCount) == 0){
				this.grid = this.srcPattern;
			}
			
			this.draw();
		}
	};
	
	this.playNote = function(pitch){
		let midiChannel = 0;

		let noteOnMessage = [
			144 + midiChannel,
			pitch,
			100
		];

		let midiPort = 0;

		let noteDurationMs = 250;

		let noteOnEvent = new RNBO.MIDIEvent(context.currentTime * 1000, midiPort, noteOnMessage);

		this.device.scheduleEvent(noteOnEvent);
	};

	this.makeGrid = function(){
		for(let x = 0; x < this.gridSize; x++){
			this.grid[x] = [];
			this.grid2[x] = [];
			this.srcPattern[x] = [];

			for(let y = 0; y < this.gridSize; y++){
				this.grid[x][y] = 0;
				this.grid2[x][y] = 0;
				this.srcPattern[x][y] = 0;
			}
		}
	};
	
	this.makeImage = function(){
		this.tileSize = this.canvas.width / this.gridSize;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.ctx.lineWidth = 0.4;

		for(let i = 0; i <= this.gridSize; i++){
			this.ctx.beginPath();

			this.ctx.moveTo(i * this.tileSize, 0);
			this.ctx.lineTo(i * this.tileSize, this.canvas.height);

			this.ctx.stroke();

			this.ctx.beginPath();

			this.ctx.moveTo(0, i * this.tileSize);
			this.ctx.lineTo(this.canvas.width, i * this.tileSize);

			this.ctx.stroke();
		}

		this.placque.querySelector("#grid-template").src = this.canvas.toDataURL();
		this.placque.querySelector("#grid-template").width = this.width;
		this.placque.querySelector("#grid-template").height = this.width;

		this.draw();
	};
	
	this.updateColor = function(){
		this.color = this.placque.querySelector("#color").value;
		this.placque.querySelector("#instrument-name").style.backgroundColor = this.color;
		
		this.draw();
	};
	
	this.updateDimensions = function(){
		let CSS = window.getComputedStyle(this.placque.querySelector("#game"));
		
		this.width = parseInt(CSS["width"]);
		this.height = parseInt(CSS["height"]);
	};
	
	this.updateCoordinates = function(){
		let CSS = window.getComputedStyle(this.placque);
		
		this.left = parseInt(CSS["left"]);
		this.top = parseInt(CSS["top"]);
	};

	this.translate = function(dX, dY){
		this.left += dX;
		this.top += dY;

		this.placque.style.left = "" + this.left + "px";
		this.placque.style.top = "" + this.top + "px";
	};

	this.scale = function(dX, dY){
		this.height += dY;
		this.width += dX;

		this.canvas.style.width = "" + this.width + "px";
		this.canvas.style.height = "" + this.width + "px";

		this.placque.querySelector("#grid-template").style.width = "" + this.width + "px";
		this.placque.querySelector("#grid-template").style.height = "" + this.width + "px";
	};
	
	this.bringToFront = function(){
		let i = zIndex.indexOf(this);
		zIndex.splice(i, 1);

		for(i; i < zIndex.length; i++) zIndex[i].placque.style.zIndex--;

		zIndex[i] = this;
		this.placque.style.zIndex = i;
	};
	
	this.toggleEditor = function(){
		if(this.patternEdit == true){
			this.patternEdit = false;
			
			this.placque.querySelector("#trigger_toggle").style.display = "inline";
			this.placque.querySelector("#pattern_toggle").style.display = "none";
		}else{
			this.patternEdit = true;
			
			this.placque.querySelector("#trigger_toggle").style.display = "none";
			this.placque.querySelector("#pattern_toggle").style.display = "inline";
		}
		
		this.draw();
	};
	
	this.toggleProperties = function(tab){
		if(tab !== undefined){
			if(tab == "game"){
				this.placque.querySelector("#game-properties").style.display = "block";
				this.placque.querySelector("#synth-field").style.display = "none";
				
				this.placque.querySelector("#game-tab").style.zIndex = "auto";
				this.placque.querySelector("#game-tab").style.background = "#fff";
				
				this.placque.querySelector("#synth-tab").style.zIndex = "-1";
				this.placque.querySelector("#synth-tab").style.background = "#eee";
			}else if(tab == "synth"){
				this.placque.querySelector("#game-properties").style.display = "none";
				this.placque.querySelector("#synth-field").style.display = "block";
				
				this.placque.querySelector("#game-tab").style.zIndex = "-1";
				this.placque.querySelector("#game-tab").style.background = "#eee";
				
				this.placque.querySelector("#synth-tab").style.zIndex = "auto";
				this.placque.querySelector("#synth-tab").style.background = "#fff";
			}
		}else{
			if(this.propertyEdit){
				this.placque.querySelector("#properties").style.display = "none";
				this.propertyEdit = false;
			}else{
				this.placque.querySelector("#properties").style.display = "inline-block";
				this.propertyEdit = true;
			}
		}
	};
	
	this.toggleRunning = function(){
		if(this.running == true){
			this.grid = this.srcPattern;
			this.running = false;
			
			this.placque.querySelector("#play_toggle").style.display = "inline";
			this.placque.querySelector("#pause_toggle").style.display = "none";
		}else{
			this.srcPattern = this.grid;
			this.running = true;
			
			this.placque.querySelector("#play_toggle").style.display = "none";
			this.placque.querySelector("#pause_toggle").style.display = "inline";
		}
		
		this.draw();
	};
	
	this.__delete__ = function(){
		this.output.disconnect();
		this.mixer.__delete__();
		this.placque.remove();
	};
}

function Note(){
	this.note = 60;
	this.await = false;
}
