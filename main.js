//Get the XML file and create a Diagram out of it
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
  	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(this.responseText,"text/xml");
    var diagram = new Diagram(xmlDoc, 918, 918);
  }
};
xhttp.open("GET", "sample.xml", true);
xhttp.send();



class Diagram{
	constructor(xmlDom, width, height){
		this.width = width;
		this.height = height;
		this.svg = SVG('diagram').size(width, height);

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
				case "process":
					actions.push(new InteractiveMessage(this.actors[child.getAttribute('actor')], child.getAttribute('content'), this.actionsGroup, child, this))
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
			console.log(action.rbox(), action.context.bbox());
			var newPos = (action.rbox().y - this.actionsGroup.rbox().y) + action.rbox().height + this.verticalMargin;
			console.log(yPos, newPos);
			yPos = (newPos > yPos) ? newPos : yPos;
		}
	}

	rootSvg(){
		return this.svg;
	}
}

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

class Message extends Drawable{
	constructor(from, to, content, svg, xml, diagram){
		super(svg, xml, diagram);
		this.from = from;
		this.to = to;
		this.content = content;
		//this.draw();

		this.color = "#999";
	}

	draw(yPos){
		super.draw();

		this.context.dx(this.from.x);
		this.context.dy(yPos);
		var text = this.context.text(this.content);
		text.dx( (Math.abs(this.to.x - this.from.x) - text.rbox().width) /2);
		if(this.to.x < this.from.x) text.dx( this.to.x - this.from.x);
		var line = this.context.line(0, text.rbox().height + 10, this.to.x - this.from.x, text.rbox().height + 10).stroke({color: this.color, width: "2"});
		this.drawArrow(this.context, line, this.to.x > this.from.x);
	}

	drawArrow(context, line, right){
		context.line(this.to.x - this.from.x, line.bbox().y, this.to.x - this.from.x + 15 * (right?-1:1), line.bbox().y - 5).stroke({color: this.color, width: "2"});
		context.line(this.to.x - this.from.x, line.bbox().y, this.to.x - this.from.x + 15 * (right?-1:1), line.bbox().y + 5).stroke({color: this.color, width: "2"});
	}
}

class InteractiveMessage extends Message{
	constructor(from, to, content, svg, xml, diagram){
		super(from, to, content, svg, xml, diagram);
		this.color = "#00f";

		if(this.xml.getElementsByTagName('modal').length > 0){
			this.modal = new Modal(svg, xml, diagram);
		}

	}

	draw(yPos){
		this.context.x(this.from.x);
		this.context.y(yPos);
		this.line = this.context.line(0, 0, this.to.x - this.from.x, 0).stroke({color: this.color, width: "20"});

		if(this.modal){
			this.modal.draw();
		}

		this.addEventHandlers();
	}

	addEventHandlers(){
		var _self = this;
		this.context.click(function(e){
			_self.modal.toggleShow();
		})
	}
}


class Modal extends Drawable{
	constructor(svg, xml, diagram){
		super(svg,xml,diagram);
	}

	draw(){
		var modal = this.xml.getElementsByTagName('modal')[0];
		this.modal = this.diagram.rootSvg().foreignObject("80%","80%").attr({class: 'modal'});
		this.modal.appendChild("div", {class: 'modal-container', innerHTML: modal.innerHTML.replace("<![CDATA[", "").replace("]]>", "")});
	}

	toggleShow(){
		this.modal.toggleClass("show-modal");
	}
}

class Note extends Drawable{
	constructor(actor, content, svg, xml, diagram){
		super(svg,xml,diagram);
		this.actor = actor;
		this.content = content;
	}

	draw(yPos){
		super.draw();
	}
}