//Diagram: main class, goes through XML and draws the right objects in the right places
class Diagram{
	static createFromXML(url, element){
		//Get the XML file and create a Diagram out of it
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
		  if (this.readyState == 4 && this.status == 200) {
		  	var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(this.responseText,"text/xml");
		    var diagram = new Diagram(element, xmlDoc, 918, 918); // here's where we start the magic
		  }
		};
		xhttp.open("GET", url, true);
		xhttp.send();
	}  

	constructor(element, xmlDom, width, height){
		this.width = width;
		this.height = height;
		this.svg = SVG(element).size(width, height);

		//set some semiglobal variables 
		this.verticalMargin = 20;//margin between actions
		this.actorNameSpace = 100;

		this.actors = this.createActors(xmlDom.getElementsByTagName('actor'));
		this.actions = this.createActions(xmlDom.getElementsByTagName('actions')[0]);

		this.draw();
	}

	createActors(xmlActors){
		let spacing = this.width / (xmlActors.length);
		let offset = spacing / 2; 
		var actors = {};
		for(var i=0;i<xmlActors.length;i++){
			actors[xmlActors[i].getAttribute('name')] = new Actor(offset + i * spacing, this.actorNameSpace, this.svg, xmlActors[i], this);
		}
		return actors;
	}

	createActions(xml){
		var actions = new Array();
		var children = xml.children;
		this.actionsGroup = this.svg.group().y(this.actorNameSpace);
		for(var i = 0; i < children.length; i++){
			var child = children[i];
			switch(child.tagName.toLowerCase()){
				case "message":
					actions.push(new Message(this.actors[child.getAttribute('from')], this.actors[child.getAttribute('to')], child.getAttribute('content'), this.actionsGroup, child, this));
					break;
				case "interactive-message":
					actions.push(new InteractiveMessage(this.actors[child.getAttribute('from')], this.actors[child.getAttribute('to')], child.getAttribute('content'), this.actionsGroup, child, this))
					break;
				case "note":
					actions.push(new Note(this.actors[child.getAttribute('actor')], child.getAttribute('content'), this.actionsGroup, child, this))
					break;
			}
		}
		return actions;
	}

	draw(){
		//first loop through actors
		for(var key in this.actors){
			this.actors[key].draw();
		}
		//then do all of the actions
		var yPos = 0;
		for(var i = 0; i < this.actions.length; i++){
			var action = this.actions[i];
			action.draw(yPos);
			var newPos = (action.rbox().y - this.actionsGroup.rbox().y) + action.rbox().height + this.verticalMargin;
			yPos = (newPos > yPos) ? newPos : yPos;
		}
	}

	rootSvg(){
		return this.svg;
	}
}
//Drawable class handles everything that is shared among all drawable objects
class Drawable{
	constructor(svg, xml, diagram){
		this.context = svg.group();
		this.xml = xml;
		this.diagram = diagram;

		this.offsetY = xml.getAttribute('offset-y');
		this.offsetX = xml.getAttribute('offset-x');
	}

	remove(){
		this.context.remove();
	}

	rbox(){
		return this.context.rbox();
	}

	draw(){
		this.context.dmove(parseFloat(this.offsetX), parseFloat(this.offsetY));
	}
}
//Actors
class Actor extends Drawable{
	constructor(x, nameSpace, svg, xml, diagram){
		super(svg, xml, diagram);
		this.x = x;
		//this.draw();
		this.nameSpace = nameSpace;
		this.name = xml.getAttribute("name");
	}

	draw(){
		this.context.dx(this.x);
		var name = this.context.text(this.name).dy(60);
		name.dx(name.rbox().width/-2)
		this.context.line(0, this.nameSpace, 0, this.diagram.height).stroke({color: "#DFDFDF", width: "10"});
	}
}
//Messages: simple arrow with text
class Message extends Drawable{
	constructor(from, to, content, svg, xml, diagram){
		super(svg, xml, diagram);
		this.from = from;
		this.to = to;
		this.content = content;
		//this.draw();

		this.color = "#999";
		this.boxMargin = 20;
	}

	draw(yPos){
		super.draw();

		this.context.dx(this.from.x);
		this.context.dy(yPos);



		var textBox = new TextBox(this.content, Math.abs(this.from.x - this.to.x) - this.boxMargin * 2, this.context, 'message');
		textBox.rect.opacity(0);
		
		textBox.container.dmove(this.boxMargin + (this.from.x > this.to.x ? this.to.x - this.from.x : 0) ,0);

		var arrow = this.drawArrow();
		arrow.move(0, textBox.container.rbox().height + 5);
	}

	drawArrow(){
		var arrow = this.context.group();
		var line = arrow.line(0, 0, this.to.x - this.from.x, 0).stroke({color: this.color, width: "2"});
		this.drawTip(arrow, line, this.to.x > this.from.x);
		return arrow;
	}

	drawTip(context, line, right){
		context.line(this.to.x - this.from.x, line.bbox().y, this.to.x - this.from.x + 15 * (right?-1:1), line.bbox().y - 5).stroke({color: this.color, width: "2"});
		context.line(this.to.x - this.from.x, line.bbox().y, this.to.x - this.from.x + 15 * (right?-1:1), line.bbox().y + 5).stroke({color: this.color, width: "2"});
	}
}
//Interactive Messages: clickable arrows with text
class InteractiveMessage extends Message{
	constructor(from, to, content, svg, xml, diagram){
		super(from, to, content, svg, xml, diagram);
		this.color = "#CDE";

		if(this.xml.getElementsByTagName('modal').length > 0){
			this.modal = new Modal(svg, xml, diagram);
		}
		this.boxMargin = 20;
		this.boxFill = "#CDE";
		this.boxOffset = -5;
	}

	draw(yPos){
		this.drawArrow();
		this.context.x(this.from.x);
		this.context.y(yPos);


		var textBox = new TextBox(this.content, Math.abs(this.from.x - this.to.x) - this.boxMargin * 2, this.context, 'interactive-message');
		textBox.rect.fill(this.boxFill).radius(10);
		
		textBox.container.move(this.from.x > this.to.x ? this.to.x - this.from.x - this.boxOffset + this.boxMargin: this.boxOffset + this.boxMargin, -textBox.container.rbox().height/2);

		this.context.dy(textBox.container.rbox().height/2);

		//this.line = this.context.line(0, 0, this.to.x - this.from.x, 0).stroke({color: this.color, width: "20"});
		//if this interactive message had a modal
		if(this.modal != null){
			this.modal.draw();
			this.addEventHandlers();
		}
	}

	addEventHandlers(){
		var _self = this;
		this.context.click(function(e){
			_self.modal.show();
		})
	}
}

//Modals: to show information (e.g. when an interactive message is clicked)
class Modal extends Drawable{
	constructor(svg, xml, diagram){
		super(svg,xml,diagram);
		this.active = false;
		this.x = this.diagram.width/4;
		this.y = this.diagram.height/4;
		this.hiddenY = this.diagram.height;
	}

	draw(){
		var xmlModal = this.xml.getElementsByTagName('modal')[0];
		this.modal = this.diagram.rootSvg().group().move(this.x, (this.active ? this.y : this.hiddenY));
		var modalContent = this.modal.foreignObject("50%","50%").attr({class: 'modal'});
		modalContent.appendChild("div", {class: 'modal-container', innerHTML: xmlModal.innerHTML.replace("<![CDATA[", "").replace("]]>", "")});
		this.modal.click(()=>{this.hide()});
	}

	show(){
		this.modal.animate(200, '>').move(this.x, this.y);
		this.active = true;
	}

	hide(){
		this.modal.animate(200, '>').move(this.x, this.hiddenY);
		this.active = false;
	}
}

//Notes: boxes on actors, e.g. to show what's happening on an actor at a given moment.
class Note extends Drawable{
	constructor(actor, content, svg, xml, diagram){
		super(svg,xml,diagram);
		this.actor = actor;
		this.content = content;
		this.color = "#eee";
		this.boxWidth = 160;
	}

	draw(yPos){
		super.draw();
		this.context.dmove(this.actor.x, yPos);

		var textBox = new TextBox(this.content, this.boxWidth, this.context, 'note-content');
		textBox.rect.fill(this.color).radius(10);
		textBox.container.dx(textBox.container.rbox().width/-2);
	}
}


//Textbox class for flowing text.
class TextBox{
	constructor(content, width, context, className){
		className = className || "textbox";
		this.container = context.group();
		this.rect = this.container.rect(width,100);
		var boxContent = this.container.foreignObject(width,10).attr({class: className});//10 is arbitrary, doesn't influene anything
		boxContent.appendChild("div", {innerHTML: content, width: width});
		boxContent.height(boxContent.node.getElementsByTagName('div')[0].clientHeight);
		this.rect.size(width, boxContent.height());
	}
}