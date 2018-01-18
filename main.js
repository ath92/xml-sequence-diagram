//All this file does is check if there are any diagrams on the page, and then lazily load the required scripts to handle all of that,
//So that we can have a very minimal script loaded on most pages, and a larger script on other pages.
var elements = document.querySelectorAll('[data-xml]');
console.log(elements);
if(elements.length > 0){
	loadScript("svg.min.js", function(){
		loadScript("svg.foreignobject.js", function(){
			loadScript("Diagram.js", function(){
				for(var element of elements){
					var url = element.getAttribute('data-xml');
					Diagram.createFromXML(url, element);
				}
			})
		})
	})
}

function loadScript(url, callback){
	var script = document.createElement('script');
	script.onload = callback;
	script.src = url;
	document.head.appendChild(script);
}