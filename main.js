//let context;
let master;

let gameList = [];
let mixerList = [];

let running = true;
let clock;
let tempo;
let clockInterval;
let beat = 0;

let mousePos = {x: 0, y: 0};
let prevMousePos = {x: 0, y: 0};
let selectedGame = null;

let zIndex = [];

let translating = false;
let resizing = false;
let resizeDirection = {left: false, right: false, up: false, down: false};

let title = "Untitled Project";

let piano;

function init(WAcontext){
	document.querySelector("#project-title").addEventListener("input", (e)=>{
		title = e.target.textContent;
	}, false);
	
	document.addEventListener('mouseup', function(){
		if(selectedGame && resizing){
			selectedGame.canvas.width = selectedGame.width * window.devicePixelRatio;
			selectedGame.canvas.height = selectedGame.width * window.devicePixelRatio;

			selectedGame.makeImage();
		}

		if(selectedGame) selectedGame = null;
		
		translating = false;
		resizing = false;
	}, false);

	document.addEventListener('mousemove', function(e){
		if(selectedGame){
			if(translating) selectedGame.translate(e.movementX, e.movementY);
			
			if(resizing){
				if(resizeDirection.left){
					selectedGame.scale(-e.movementX, 0);
					selectedGame.translate(e.movementX, 0);
				}

				if(resizeDirection.right) selectedGame.scale(e.movementX, 0);

				if(resizeDirection.up){
				   selectedGame.scale(0, -e.movementY);
				   selectedGame.translate(0, e.movementY);
				}

				if(resizeDirection.down) selectedGame.scale(0, e.movementY);
			}
		}
	}, false);
	
	for(let button of document.querySelectorAll("#tempo-button")){
		let mousehold;
		
		button.addEventListener("mousedown", (e)=>{
			changeTempo(tempo += parseInt(button.dataset.amount));
			
			mousehold = setInterval(()=>{
				changeTempo(tempo += parseInt(button.dataset.amount));
			}, 100);
		}, false);
		
		document.addEventListener("mouseup", (e)=>{
			clearInterval(mousehold);
		}, false);
	}
	
	document.querySelector("#tempo-display").addEventListener("focusout", (e)=>{
		changeTempo(parseInt(e.target.textContent));
		
		document.querySelector("#tempo-display").innerText = tempo + " bpm";
	}, false);
	
	document.querySelector("#tempo-display").addEventListener("keydown", (e)=>{
		if(e.key == "Enter"){
			window.getSelection().removeAllRanges();
			
			changeTempo(parseInt(e.target.textContent));
		}
	}, false);
	
	document.querySelector("#file").addEventListener("change", (e)=>{
		loadProject();
	}, false);
	
	document.addEventListener("contextmenu", (e) => e.preventDefault(), false);
	
	context = WAcontext;
	
	piano = loadPiano();
	
	tempo = 120;
	
	let json = sessionStorage.getItem("Project File");
	
	if(json){
		json = JSON.parse(json);
		
		for(let i in json.games){
			let gameIndex = addInstrument(json.games[i]);
		}
		
		title = json.projectTitle;
		document.querySelector("#project-title").innerText = title;
		
		tempo = json.tempo;
	}
	
	sessionStorage.clear();

	changeTempo(tempo);

	metro();
}

function changeTempo(bpm){
	if(isNaN(bpm) == false) tempo = bpm;
	
	clockInterval = 60000 / tempo / 8;
				
	document.querySelector("#tempo-display").innerText = tempo + " bpm";
}

function metro(){
	step();
	
	setTimeout(metro, clockInterval);
}

function addInstrument(json){
	let mixerNode = document.querySelector("#mixer").cloneNode(true);
	document.querySelector("#mixing-desk").appendChild(mixerNode);
	
	let i = gameList.push(new Game()) - 1;
	gameList[i].init(document.querySelector("#placque"), i, piano, mixerNode, json);
	
	return i;
}

function step(){
	for(let game of gameList){
		if(game) game.calculate();
	}
	
	beat++;
}

function movePlacque(){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.updateCoordinates();
	
	translating = true;
}

function resizeGame(direction){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.updateDimensions();
	selectedGame.updateCoordinates();
	
	resizing = true;
	resizeDirection = direction;
}

function toggleEditor(){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.toggleEditor();
}

function toggleRunning(){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.toggleRunning();
}

function toggleMute(){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.mixer.toggleMute();
}

function toggleProperties(tab){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.toggleProperties(tab);
}

function deleteInstrument(){
	if(!event.target.dataset.instance) event.target.dataset.instance = findInstance(event.target);
	selectedGame = gameList[event.target.dataset.instance];
	
	selectedGame.__delete__();
	gameList[gameList.indexOf(selectedGame)] = undefined;
}

function findInstance(node){
    while(node){
	    if(node.id == "placque") return node.dataset.instance;
		if(node.id == "mixer") return node.dataset.instance;

		node = node.parentNode;
	}
}

function saveProject(){
	let json = {};
	let i = 0;
	
	json.projectTitle = title;
	json.tempo = tempo;
	
	json.games = {};
	
	for(let game of gameList){
		game.updateCoordinates();
		game.updateDimensions();
		
		json.games[i] = {
			name: game.name,
			color: game.color,
			tempo: game.tempo,
			repeatCount: game.repeatCount,
			repeatTempo: game.repeatTempo,
			gridSize: game.gridSize,
			grid2: game.grid2,
			left: game.left,
			top: game.top,
			width: game.width,
			height: game.height,
			gain: game.mixer.gain,
			soundPath: game.soundPath,
			muted: game.mixer.muted,
			running: game.running
		};
		
		
		//Breaks when you delete while running
		json.games[i].grid = game.running == true ? game.srcPattern : game.grid;

		
		json.games[i].synth = {};
		
		for(let node of game.placque.querySelector("#synth-properties")){
			json.games[i].synth[node.id] = node.value;
		}
		
		i++;
	}
	
	let file = new Blob([JSON.stringify(json)], {type: "application/json"});
	
	let a = document.createElement("a");
	a.download = title + ".json";
	a.href = window.URL.createObjectURL(file);
	
	a.click();
}

async function loadProject(){
	let json = await document.querySelector("#file").files[0].text();
	
	sessionStorage.setItem("Project File", json);

	window.location.href = window.location.href;
}

function newProject(){
	window.location.href = window.location.href;
}

function HSLtoHex(h, s, l){
	let r, g, b;
	let c = (1 - Math.abs((2 * l) - 1)) * s;
	let x = c * (1 - Math.abs((h / 60) % 2 - 1));
	let m = l - (c / 2);

	switch(Math.floor(h / 60)){
		case 0: r = c; g = x; b = 0; break;
		case 1: r = x; g = c; b = 0; break;
		case 2: r = 0; g = c; b = x; break;
		case 3: r = 0; g = x; b = c; break;
		case 4: r = x; g = 0; b = c; break;
		case 5: r = c; g = 0; b = x; break;
	}

	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);

	return "#" + r.toString(16) + g.toString(16) + b.toString(16);
}
