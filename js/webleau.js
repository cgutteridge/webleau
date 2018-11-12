
class LQS {
	constructor() {
		this.nodesLayer = null;

		this.nodes = {};
		this.links = {};
		this.layoutScale = 1;
		this.offsetX = 5000;
		this.offsetY = 5000;
		this.curYPos = 0;
		this.curXPos = 0;
		this.curDown = false;
		this.layoutScaleSlider = null;
		this.defaultInspectorProxy = 'https://www.southampton.ac.uk/~totl/lqs-inspector-v1/';
		this.inspectorProxy = this.defaultInspectorProxy;
		this.mouse = new LQSPoint( this.offsetX, this.offsetY );

		var bgsvg = $('<svg class="lqs_bgsvg"><g id="axis"><line id="vaxis" /><line id="haxis" /></g></svg>');
		$('body').append(bgsvg);
		bgsvg.html( bgsvg.html() ); // reset SVG layer 
		$('#vaxis').attr('x1',this.offsetX).attr('y1',0).attr('x2',this.offsetX).attr('y2',this.offsetY*2);
		$('#haxis').attr('x1',0).attr('y1',this.offsetY).attr('x2',this.offsetX*2).attr('y2',this.offsetY);

		this.nodesLayer = $('<div class="lqs_nodes"></div>');
		$('body').append(this.nodesLayer);

		var svg = $('<svg class="lqs_svg"><defs><marker id="arrow" markerWidth="11" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#666" /></marker></defs><g id="svg_arrows"></g><g id="svg_labels"></g></svg>');
		$('body').append(svg);
		svg.html( svg.html() ); // reset SVG layer 
	
		var rpt = this.toReal(new LQSPoint(0,0));
		window.scrollTo( rpt.x-LQS.winWidth()/2, rpt.y-LQS.winHeight()/2 );

		this.nodesLayer.dblclick(function() {
			var pt = this.toVirtual( this.mouse );
			var nodeData = {
				id: LQS.uuid(),
				x: pt.x,
 				y: pt.y,	
				title: "",
				width:  LQS.winWidth() /2/this.layoutScale,
				height: LQS.winHeight()/2/this.layoutScale,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = this.addNode(nodeData);
			comment.showEdit();
		}.bind(this));

		$('body').append( $('<div class="ident">liquid space</div>'));

		/* CONTROLS */

		var controlsWrapper = $('<div class="controls_wrapper"><div class="controls_icon">TOOLS</div></div>');
		var controls = $('<div class="controls"></div>');
		$(controlsWrapper).append(controls);
		$('body').append(controlsWrapper);

		/* CONTROLS: sliders */

		this.layoutScaleSlider = $('<input type="range" value="1" min="0.05" max="2" step="0.001" />');
		var layoutScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Layout scale: </div>' ).append(layoutScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(this.layoutScaleSlider) );
		controls.append( this.layoutScaleSlider );
		//controls.append( contentToggle );
		this.layoutScaleSlider.on('propertychange input', function(event) {
			// find coords of screen centre
			var screenMiddleVirt = this.toVirtual(LQS.screenMiddle());
			this.layoutScale = this.layoutScaleSlider.val();
			var perc = Math.round( this.layoutScale*100000 ) / 1000;
			layoutScaleDisplay.text( ""+perc+"%" );
			this.nodesLayer.css( 'font-size',perc+"%" );
			var screenMiddleReal = this.toReal(screenMiddleVirt);
			window.scrollTo( screenMiddleReal.x-LQS.winWidth()/2, screenMiddleReal.y-LQS.winHeight()/2 );
			this.updateAllPositions();
		}.bind(this));


		/* CONTROLS: tools */
		var controlTools = $('<div class="this"></div>');
		controls.append( $("<div style='margin-top:1em'>Tools</div>"));
		controls.append(controlTools);

/*	 I've gone off this idea
		// rightsize
		var rightsizeTool = $('<div title="rightsize" class="this">+</div>');
		controlTools.append( rightsizeTool );
		rightsizeTool.click( function() {
			nodeKeys = Object.keys(this.nodes);
			for( var i=0; i<nodeKeys.length; ++i ) {
				this.nodes[nodeKeys[i]].fitSize();
			}
		});
*/

		// reset
		var resetTool = $('<div title="reset" class="lqs_tool">R</div>');
		controlTools.append( resetTool );
		resetTool.click( function() {
			this.layoutScaleSlider.val(1).trigger('input');
			this.centrePage();
			this.updateAllPositions();
		}.bind(this));

		// quine download
		var quineTool = $('<div title="quine" class="lqs_tool">Q</div>');
		controlTools.append( quineTool );
		quineTool.click( function() {
			var head = $('head').html();
			var jsonLayout = JSON.stringify( this.getLayout());
			jsonLayout = jsonLayout.replace( /<\/script>/ig, "<\/\"+\"script>" );
			var page = `<!DOCTYPE html>\n<html lang='en'><head>${head}</head><body></body><script>$(document).ready(function(){ var lqs = new LQS(); lqs.setLayout( ${jsonLayout} ); });</`+"script></html>" ;
			var filename = "liquid-space."+Date.now()+".html";
			LQS.download( filename, page, "text/html" );
		}.bind(this));

/*
		// screenshot
		var screenshotTool = $('<div title="screenshot" class="lqs_tool">S</div>');
		controlTools.append( screenshotTool );
		screenshotTool.click( function() {
			html2canvas(window).then(function(canvas){
				console.log(23);
				console.log(canvas.toDataURL("image/png"));
			});
		});
*/




		// graph
		var graphTool = $('<div title="graph" class="lqs_tool">G</div>');
		controlTools.append( graphTool );
		graphTool.click( function() {
			manifestGraphSelect();
		});

		/* CONTROLS: load/save */
		var controlIO = $('<div class="lqs_controls_tools"></div>');
		var ioTextarea = $('<textarea class="normal-paste" placeholder="save/load: hit save and copy this, or paste in here and hit load" style="width: 100%; height: 10%;" id="lqs_io"></textarea>');
		controls.append( $("<div style='margin-top:1em'>Upload/Download</div>"));
		controls.append( ioTextarea );
		var downloadTool = $('<div title="download" class="lqs_tool">&darr;<div>');
		controlIO.append( downloadTool );
		var uploadTool = $('<div title="upload" class="lqs_tool">&uarr;</div>');
		controlIO.append( uploadTool );
		controls.append(controlIO);
		downloadTool.click( function() {
			var layout = this.getLayout();
			ioTextarea.val( JSON.stringify( layout ) );
			ioTextarea.select();
		}.bind(this));
		uploadTool.click( function() {
			var layout = JSON.parse( ioTextarea.val() );
			if( !layout ) {
				alert( "LOADING ERROR. Rewind tape and try again.");
				return;
			}
	
			this.setLayout(layout);
		}.bind(this));
		
		/* end controls */


		/* MAIN EVENTS */

		// location of mouse on tablau
		$( document).on( "mousemove", function( event ) {
			this.mouse = new LQSPoint( event.pageX, event.pageY );
		}.bind(this));
	
	
		/* fancy stuff with paste */
		this.nodesLayer.focus();
		$('body').on('paste', function(event) {
			// if we are focused on a normal-paste element just skip this handler
			if( $('.normal-paste:focus').length ) { return; }
			this.pasteToBackground(event);
		}.bind(this));
	
		/* zoom on mousewheel */
		$('html,body').bind('wheel mousewheel', function(e){
			var delta;
	
			if (e.originalEvent.wheelDelta !== undefined) {
				delta = e.originalEvent.wheelDelta;
			} else {
				delta = e.originalEvent.deltaY * -1;
			}
			this.layoutScaleSlider.val( parseFloat(this.layoutScaleSlider.val())+delta*0.001 );
			this.layoutScaleSlider.trigger('propertychange');
			return false;
		}.bind(this));
	
		/* drag background to scroll */
	
		$(document).on("mousemove", function (event) {
			if (this.curDown === true) {
				$(document).scrollTop(parseInt($(document).scrollTop() + (this.curYPos - event.pageY)));
				$(document).scrollLeft(parseInt($(document).scrollLeft() + (this.curXPos - event.pageX)));
			}
		}.bind(this));
		
		$(document).on("mousedown", function (e) { 
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				this.curDown = true; this.curYPos = e.pageY; this.curXPos = e.pageX; e.preventDefault(); 
			}
		}.bind(this));
		$(window).on("mouseup", function (e) { this.curDown = false; }.bind(this));
		$(window).on("mouseout", function (e) { this.curDown = false; }.bind(this));
		
	}


	toVirtual(realpt) {
		return new LQSPoint( 
			(realpt.x-this.offsetX)/this.layoutScale,
			(realpt.y-this.offsetY)/this.layoutScale
		);
	}

	toReal(virtpt) {
		return new LQSPoint( 
			virtpt.x*this.layoutScale+this.offsetX,
			virtpt.y*this.layoutScale+this.offsetY
		);
	}



	
	manifestGraphBase(endpoint) {
		var id = "graph/"+endpoint;
		var node;
		if( this.nodes[id] ) {
			node = this.nodes[id];
			node.reveal();
		} else {
			var pt = this.toVirtual(LQS.screenMiddle());
			node = this.addNode({
				id: id,
				x: pt.x,
 				y: pt.y,	
				title: "Data connection",
				width:  ((LQS.winWidth() /2))/this.layoutScale,
				height: ((LQS.winHeight()/2))/this.layoutScale,
				type: "graph-base",
				endpoint: endpoint,
				gizmo: true,
				meta: {}
			});
		}
		return node;
	}

	manifestGraphSelect() {
		var pt = this.toVirtual(LQS.screenMiddle());
		var node = this.addNode({
			id: LQS.uuid(),
			x: pt.x,
 			y: pt.y,	
			title: "Data connector",
			width:  ((LQS.winWidth() /2))/this.layoutScale,
			height: ((LQS.winHeight()/2))/this.layoutScale,
			type: "graph-select",
			gizmo: true,
			meta: {}
		});
		return node;
	}


	getLayout() {
		var layout = { nodes: [], links: [] };
		var linkKeys = Object.keys( this.links );
		for( var i=0;i<linkKeys.length;++i ) {
			layout.links.push( this.links[linkKeys[i]].data );
		}

		var nodeKeys = Object.keys( this.nodes );
		for( var i=0;i<nodeKeys.length;++i ) {
			layout.nodes.push( this.nodes[nodeKeys[i]].data );
		}

		layout.inspectorProxy = this.inspectorProxy;
		return layout;
	}

	setLayout(layout) {
		// erase all stuff
		var linkKeys = Object.keys(this.links);
		for( var i=0; i<linkKeys.length; ++i ) {
			this.links[linkKeys[i]].remove();
		}
		var nodeKeys = Object.keys(this.nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			this.nodes[nodeKeys[i]].remove();
		}

		for( var i=0; i<layout.nodes.length; ++i ) {
			this.addNode( layout.nodes[i] );
		}
		for( var i=0; i<layout.links.length; ++i ) {
			this.addLink( layout.links[i] );
		}

		this.inspectorProxy = this.defaultInspectorProxy;
		if( layout.inspectorProxy ) {
			this.inspectorProxy = layout.inspectorProxy;
		}
	}

	centrePage() {
		this.focusPage( new LQSPoint(0,0) );
	}

	// focus the real scroll window onto a point on the virtual layout
	focusPage( vpt ) {
		var rpt = this.toReal(vpt);
		$('html,body').animate({
			'scrollLeft': rpt.x-LQS.winWidth()/2,
			'scrollTop': rpt.y-LQS.winHeight()/2
		},1000);
	}
		

	updateAllPositions() {
		var nodeKeys = Object.keys(this.nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			this.nodes[nodeKeys[i]].updatePosition();
		}
		var linkKeys = Object.keys(this.links);
		for( var i=0; i<linkKeys.length; ++i ) {
			this.links[linkKeys[i]].updatePosition();
		}
	}


	addLink( linkData ) {
		// validate link TODO
		
		// create link
		this.links[linkData.id] = new LQSLink( linkData, this );
		this.links[linkData.id].updatePosition();
		return this.links[linkData.id];
	}

	addNode( nodeData ) {
		// validate node TODO

		// create node
		this.nodes[nodeData.id] = new Node( nodeData, this );
		this.nodes[nodeData.id].updatePosition();
		return this.nodes[nodeData.id];
	}

	pasteToBackground(event) {
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var json = clipboardData.getData('application/json');
		var pt = this.toVirtual(this.mouse);
		var nodeData = {
			id: LQS.uuid(),
			x: pt.x,
 			y: pt.y,
			width:  LQS.winWidth() /2/this.layoutScale,
			height: LQS.winHeight()/2/this.layoutScale,
			meta: {}
		};
		if( json ) {
			//nb this can throw a syntax error, it really should be handled
			var jsonData = JSON.parse( json );
			// assume object
			// detect JRNL0.1
			if( jsonData.jrnlCitation ) {
				nodeData.title = jsonData.citation.title;
				nodeData.html = jsonData.citation.html; // or text
				nodeData.edit = false;
				nodeData.meta.source = {};
				nodeData.meta.source.URL = jsonData.citation.url;
				nodeData.meta.source.copiedTime = jsonData.citation.timestamp;
				nodeData.meta.source.creators = [ 
					{
						name: jsonData.citation.author,
						page: jsonData.citation.authorURL
					}
				]
				var newNode = this.addNode(nodeData);
				newNode.fitSize();
				return;
			}
		}

		var text = clipboardData.getData( 'text/plain' );
		if( LQS.validURL(text) ) {
			nodeData.title = "Pasted URL";
			nodeData.text = text+"\n(will lookup metadata in a mo...)";
			nodeData.edit = false;
			var newNode = this.addNode(nodeData);
			newNode.fitSize();
			$.ajax({
				method: "GET",
				data: { url: text },
				url: inspectorProxy
			}).done(function(data){
				nodeData.text=null;
				nodeData.html=null;
				// TOOO any kind of security
				var keys = Object.keys(data);	
				for( var i=0;i<keys.length; ++i) {
					nodeData[keys[i]] = data[keys[i]];
				}
				if( data.source && data.source.width ) { 
					newNode.data.width = data.source.width;
				}
				if( data.source && data.source.height ) { 
					newNode.data.height = data.source.height;
				}
				newNode.showFullContent();
				newNode.fitSize();
			}).fail(function(){
				nodeData.text = text+"\n(metadata query failed)";
				newNode.showFullContent();
				newNode.fitSize();
			})
			return;
		}

		var html = clipboardData.getData( 'text/html' );
		if( html ) {
			nodeData.title = "Pasted HTML";
			nodeData.html = html;
			nodeData.edit = true;
			var newNode = this.addNode(nodeData);
			newNode.fitSize();
			return;
		}

		nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.edit = true;
		var newNode = this.addNode(nodeData);
		newNode.fitSize();
	}	


	/* STATIC UTILITY FUNCTIONS */

	static download(filename, data, mimetype) {
		var blob = new Blob([data], {type: mimetype});
		if(window.navigator.msSaveOrOpenBlob) {
			window.navigator.msSaveBlob(blob, filename);
		}
		else{
			var elem = window.document.createElement('a');
			elem.href = window.URL.createObjectURL(blob);
			elem.download = filename;        
			document.body.appendChild(elem);
			elem.click();        
			document.body.removeChild(elem);
		}
	}

	// from http://forums.devshed.com/javascript-development-115/regexp-match-url-pattern-493764.html	
	static validURL(str) {
		//var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[-;&a-z\d%_.~+=]*)?(\#[-a-z\d_]*)?$/i;
		var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?[^ ]*/;
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	}

	/* not currently used!? 
	static ascii2hex(str) {
		var arr1 = [];
		for (var n = 0, l = str.length; n < l; n ++) 
     		{
			var hex = Number(str.charCodeAt(n)).toString(16);
			arr1.push(hex);
		}
		return arr1.join('');
   	}
	*/

	static dataToHTML(value) {
		if( value && typeof value === 'object' && value.constructor === Array ) {
			// array
			var table = $('<table class="meta_array"></table');
			for( var i=0; i<value.length; ++i ) {
				var tr = $('<tr></tr>');
				tr.append( $('<th></th>').text(i) );
				tr.append( $('<td></td>').append( LQS.dataToHTML( value[i] ) ) );
				table.append(tr);
			}
			return table;
		} else if( value && typeof value === 'object' && value.constructor === Object ) {
			// object
			var keys = Object.keys(value);
			var table = $('<table class="meta_object"></table');
			for( var i=0; i<keys.length; ++i ) {
				var tr = $('<tr></tr>');
				tr.append( $('<th></th>').text(keys[i]) );
				tr.append( $('<td></td>').append( LQS.dataToHTML( value[keys[i]] ) ) );
				table.append(tr);
			}
			return table;
		} else {
			return $('<span class="meta_value"></span>').text(value);
		}
	}

	static screenMiddle() {
		return new LQSPoint( LQS.winLeft()+LQS.winWidth()/2, LQS.winTop()+LQS.winHeight()/2 );
	}

	static winHeight() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerHeight || e.clientHeight || g.clientHeight;
	}
	static winWidth() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerWidth || e.clientWidth || g.clientWidth;
	}
	static winLeft() {
		var d = document.documentElement;
		return (window.pageXOffset || d.scrollLeft) - (d.clientLeft || 0);
	}
	static winTop() {
		var d = document.documentElement;
		return (window.pageYOffset || d.scrollTop)  - (d.clientTop || 0);
	}


	static uuid() {
		function randomDigit() {
			if (crypto && crypto.getRandomValues) {
				var rands = new Uint8Array(1);
				crypto.getRandomValues(rands);
				return (rands[0] % 16).toString(16);
			} else {
				return ((Math.random() * 16) | 0).toString(16);
			}
		}
		var crypto = window.crypto || window.msCrypto;
		return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
	}

	static noDragClick( element, fn ){
		if( !element.noDragClick ) {
			element.beingDragged = false;
			element.mousedown( function() {
		        	$(window).mousemove(function() {
            				this.beingDragged = true;
            				$(window).unbind("mousemove");
        			}.bind(this ));
			}.bind(element));
		}
		element.mouseup( function() {
        		var wasDragging = this.beingDragged;
        		this.beingDragged = false;
        		$(window).unbind("mousemove");
        		if (!wasDragging) {
				fn();
			}
		}.bind(element));		
	}

	// remove the obvious secruity issues from 3rd party html
	// may need to become a while list function instead. 
	// don't forget js attributes
	static sanitiseHtml( html ) {
		html = html.replace( /<script>.*?<\/script>/, '' );
		return html;
	}

}











class LQSPoint {
	constructor(x,y) {
		this.x=x;
		this.y=y;
	}
	distance( pt ) {
		var ld = (pt.x-this.x)*(pt.x-this.x)+(pt.y-this.y)*(pt.y-this.y);
		return Math.sqrt( ld );
	}
	inBounds( corner1, corner2 ) {
		return( this.x>=Math.min(corner1.x,corner2.x)-1 && this.x<=Math.max(corner1.x,corner2.x+1) 
		     && this.y>=Math.min(corner1.y,corner2.y)-1 && this.y<=Math.max(corner1.y,corner2.y+1) );
	}
}

class LQSLine {
	constructor( from, to ) {
		this.from = from;
		this.to = to;
	}
	intersect( that ) {
		var offx1 = this.to.x-this.from.x;
		var offy1 = this.to.y-this.from.y;
		var offx2 = that.to.x-that.from.x;
		var offy2 = that.to.y-that.from.y;
		if( offx1 == 0 ) { offx1 = 0.000000000001; }
		if( offx2 == 0 ) { offx2 = 0.000000000001; }
		var g1 = offy1/offx1;
		var g2 = offy2/offx2;
		if( g1==g2 ) { return null; } // parallel lines
		// y=a+x*g1;
		// y=b+x*g2;
		var a = this.from.y- this.from.x*g1;
		var b = that.from.y- that.from.x*g2;
		// a+x*g1 = b+x*g2
		// a-b = x*g2-x*g1
		// a-b = x*(g2-g1)
		// x= (a-b)/(g2-g1)
		var x = (a-b)/(g2-g1);
		var y = this.from.y +  ( x - this.from.x ) * g1;
		var pt = new LQSPoint( x, y );
		if( pt.inBounds( this.from, this.to ) && pt.inBounds( that.from, that.to ) ) {
			return pt;
		}
		return null;
	}
}

class LQSLink {

	constructor( linkData, lqs ) {
		this.lqs = lqs;

 		this.data = linkData;
		if( !this.data.id  ) { this.data.id=LQS.uuid(); }
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		if( !subjectNode ) {
			alert( "Failed to link subjectNode "+JSON.stringify( this.data.subject ));
			return;
		}
		var objectNode = this.lqs.nodes[this.data.object.node];
		if( !objectNode ) {
			alert( "Failed to link objectNode "+JSON.stringify( this.data.object ));
			return;
		}

		// TODO check if these exist and handle exceptions	
		subjectNode.registerLink(this);
		objectNode.registerLink(this);

		var arrowsG = document.getElementById('svg_arrows');
		var labelsG = document.getElementById('svg_labels');

		this.dom = {};

		this.dom.id = "link_"+LQS.uuid();
 		var line = document.createElementNS("http://www.w3.org/2000/svg","line");
		line.id = this.dom.id;
		line.setAttribute( "class", "lqs_link" );
		line.setAttribute( "marker-end", "url(#arrow)" );
		arrowsG.appendChild( line );

		this.dom.label_id = "link_from_"+LQS.uuid();
 		var fromText = document.createElementNS("http://www.w3.org/2000/svg","text");
		fromText.setAttribute( "class", "lqs_link_from_text" );
		fromText.id = this.dom.label_id;
		fromText.appendChild( document.createTextNode( linkData.label ));
		labelsG.appendChild( fromText );

/*
		this.dom.to_id = "link_to_"+linkData.id;
 		var toText = document.createElementNS("http://www.w3.org/2000/svg","text");
		toText.setAttribute( "class", "lqs_link_to_text" );
		toText.id = this.dom.to_id;
		toText.appendChild( document.createTextNode( "is "+linkData.label+" of" ));
		labelsG.appendChild( toText );
*/
	}


	updatePosition() {
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		var objectNode = this.lqs.nodes[this.data.object.node];
		var c1 = objectNode.centrePoint();
		var c2 = subjectNode.centrePoint();
		var pt1 = subjectNode.nearestPointTo( c1 );
		var pt2 = objectNode.nearestPointTo( c2 );
		if( pt1 && pt2 ) {
			$("#"+this.dom.id).attr('x1',pt1.x);	
			$("#"+this.dom.id).attr('y1',pt1.y);	
			$("#"+this.dom.id).attr('x2',pt2.x);	
			$("#"+this.dom.id).attr('y2',pt2.y);	
			$("#"+this.dom.label_id).attr('x',(pt1.x+(pt2.x-pt1.x)/4));
			$("#"+this.dom.label_id).attr('y',(pt1.y+(pt2.y-pt1.y)/4));
			$("#"+this.dom.label_id).css('font-size',(10*this.lqs.layoutScale)+"px"); 
/*
			$("#"+this.dom.to_id).attr('x',pt2.x);
			$("#"+this.dom.to_id).attr('y',pt2.y);
*/
		}
	}

	remove() {
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		var objectNode = this.lqs.nodes[this.data.object.node];
		subjectNode.deRegisterLink(this);
		objectNode.deRegisterLink(this);
		delete this.lqs.links[this.data.id];
		$("#"+this.dom.id).remove();
		$("#"+this.dom.label_id).remove();
		$("#"+this.dom.to_id).remove();
	}
}
// End LQSLink


class Node {
//todo, decouple manifest functions from the bit that creates links?
	constructor( nodeData, lqs ) {

		this.lqs = lqs;
		this.borderSize = 4;
		this.data = nodeData;

		// links
		// TODO should this distinguish incoming and outgoing?
		this.links = {};

		// dom
		this.dom = {};
		this.dom.outer = $('<div class="lqs_node"></div>').attr("data-node",this.data.id);
		this.dom.title = $('<div class="lqs_node_title"></div>');
		this.dom.titleLeft = $('<div class="lqs_node_title_left"></div>');
		this.dom.titleRight = $('<div class="lqs_node_title_right"></div>');
		this.dom.titleText = $('<div class="lqs_node_title_text"></div>');
		this.dom.content = $('<div class="lqs_node_content"></div>');

		this.dom.icon = $("<div class='lqs_node_icon'></div>");
		this.data.iconWidth = 32;
		this.data.iconHeight = 32;
		this.dom.icon.width( this.data.iconWidth );
		this.dom.icon.height( this.data.iconHeight );
		this.dom.icon.hide();
		this.lqs.nodesLayer.append( this.dom.icon );

		this.dotSize = 5;
		this.dom.dot_id = "dot_"+LQS.uuid();
 		var dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
		dot.id = this.dom.dot_id;
		dot.setAttribute( "class", "lqs_dot" );
		dot.setAttribute( "r", this.dotSize );
		var arrowsG = document.getElementById('svg_arrows');
		arrowsG.appendChild( dot );
		this.dom.dot = $(dot);

		this.dom.dot_label_id = "link_from_"+LQS.uuid();
 		var dotText = document.createElementNS("http://www.w3.org/2000/svg","text");
		dotText.setAttribute( "class", "lqs_dot_text" );
		dotText.id = this.dom.dot_label_id;
		dotText.appendChild( document.createTextNode( "XXX" ));
		var labelsG = document.getElementById('svg_labels');
		labelsG.appendChild( dotText );
		this.dom.dotText = $(dotText);


		if( nodeData.gizmo ) {
			this.dom.outer.addClass( 'lqs_gizmo' );
		}

		if( nodeData.link ) {
			this.dom.toolLink = $('<div class="lqs_tool">L</div>');
			this.dom.titleLeft.append( this.dom.toolLink );
			this.dom.toolLink.click( function() {
				if( this.data.view != 'link' ) {
					this.showLink();
				} else {
					this.showFullContent();
				}
			}.bind(this));
		}

		if( nodeData.edit ) {
			this.dom.toolEdit = $('<div class="lqs_tool">E</div>');
			this.dom.titleLeft.append( this.dom.toolEdit );
			this.dom.toolEdit.click( function() {
				this.showEdit();
			}.bind(this));
		}

		this.dom.toolfit = $('<div class="lqs_tool">+</div>');
		this.dom.titleLeft.append( this.dom.toolfit );
		this.dom.toolfit.click( function() {
			this.fitSize();
		}.bind(this));


		this.dom.toolicon = $('<div class="lqs_tool">-</div>');
		this.dom.titleLeft.append( this.dom.toolicon );
		this.dom.toolicon.click( function() {
			this.showIcon();
		}.bind(this));
		LQS.noDragClick( this.dom.icon, function() {
			this.hideIcon();
		}.bind(this) );


		this.dom.tooldot = $('<div class="lqs_tool">o</div>');
		this.dom.titleLeft.append( this.dom.tooldot );
		this.dom.tooldot.click( function() {
			this.showDot();
		}.bind(this));
		/*
		LQS.noDragClick( this.dom.dot, function() {
			this.hideDot();
		}.bind(this) );
		*/
		this.dom.dot.click( function() { this.hideDot(); }.bind(this) );




		this.dom.toolinfo = $('<div class="lqs_tool">M</div>');
		this.dom.titleLeft.append( this.dom.toolinfo );
		this.dom.toolinfo.click( function() {
			if( this.data.view != 'meta' ) {
				this.showMeta();
			} else {
				this.showFullContent();
			}
		}.bind(this));

		this.dom.toolRemove = $('<div class="lqs_tool">X</div>');
		this.dom.toolRemove.click( function() {
			if( confirm( "Really delete?" ) ) {
				this.remove();
				this.updateAllPositions();
			}
		}.bind(this)); 
		
		this.dom.titleRight.append( this.dom.toolRemove );
		//this.dom.toolResize = $('<div class="lqs_node_resize lqs_tool"><span class="glyphicon glyphicon-resize-small" aria-hidden="true"></span></div>');
		//this.dom.outer.append( this.dom.toolResize );
			
	
		this.dom.outer.append( this.dom.title );
		this.dom.title.append( this.dom.titleLeft );
		this.dom.title.append( this.dom.titleRight );
		this.dom.title.append( this.dom.titleText );
		this.dom.outer.append( this.dom.content );
		this.lqs.nodesLayer.append( this.dom.outer );
		this.dom.outer.dblclick(function() {
			var pt = this.lqs.toVirtual( this.lqs.mouse );
			var width = ((LQS.winWidth() /4))/this.lqs.layoutScale;
			var height= ((LQS.winHeight()/4))/this.lqs.layoutScale;
			var nodeData = {
				id: LQS.uuid(),
				x: this.data.x+(this.data.width/2)+width/2,
 				y: pt.y,	
				title: "",
				width: width,
				height: height,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = this.lqs.addNode(nodeData);
			comment.reveal();
			var linkData = {
				subject: { node: comment.data.id },
				object: { node: this.data.id },
				label: "comments",
				id: LQS.uuid() 
			};
			var newLink = this.lqs.addLink( linkData );
			//subjectNode.updateLinksPosition();
			comment.showEdit();
			return false; // don't also run on background
		}.bind(this));

		// state
		var view = this.data.view;
		this.showFullContent();
		if( view == "icon" ) {
			this.showIcon();
		} 
		if( view == "dot" ) {
			this.showDot();
		}

		// register UI hooks
		this.dom.outer.resizable({
			resize: this.resized.bind(this)
			//handles: "all"
		});
		this.dom.outer.draggable( { 
			containment: $('.lqs_nodes'),
			handle: ".lqs_node_title",
			opacity: 0.8,
			scroll: true,
		//	scrollSensitivity: 100,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStartX = this.data.x;
				this.dragStartY = this.data.y;
			}.bind(this)
		});
		this.dom.icon.draggable( { 
			containment: $('.lqs_nodes'),
			//handle: ".lqs_node_title",
			opacity: 0.8,
			scroll: true,
		//	scrollSensitivity: 100,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStartX = this.data.x;
				this.dragStartY = this.data.y;
			}.bind(this)
		});
		this.dom.outer.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: function( event , ui ) {
				var subjectNode = this.lqs.nodes[ui.draggable.attr('data-node')];
				var linkData = {
					subject: { node: ui.draggable.attr('data-node') },
					object: { node: this.data.id },
					label: "",
					id: LQS.uuid() 
				};
				var newLink = addLink( linkData );
				subjectNode.data.x = subjectNode.dragStartX;
				subjectNode.data.y = subjectNode.dragStartY;
				subjectNode.updatePosition();
				subjectNode.updateLinksPosition();
			}.bind(this)
		});
	} // end Node constructor


	setTitleText( text ) {
		this.dom.dotText.text( text );
		this.dom.titleText.text( text );
		if( text == "" ) {
			this.dom.title.addClass("lqs_node_empty_title");
		} else {
			this.dom.title.removeClass("lqs_node_empty_title");
		}
	}

	showGraphBase() {
		this.reset();
		this.setTitleText( this.data.title );
		this.dom.content.html("Loading...");
		var node = this;
		if( !this.data.graphIdent ) {
			$.ajax({
				method: "GET",
				data: {},
				url: node.data.endpoint
			}).done(function(data){
				node.data.graphIdent = data;
				if( node.data.graphIdent && node.data.graphIdent.title ) {
					node.setTitleText( node.data.graphIdent.title );
				}
			});
		}
		$.ajax({
			method: "GET",
			data: { action: 'nodeTypes' },
			url: node.data.endpoint
		}).done(function(data){
			this.dom.content.html("");
			//this.dom.content.append( $('<div>This endpoint has the following types of node:</div>'));
			var keys = Object.keys( data.nodeTypes );
			for( var i=0;i<keys.length;++i) {
				var type = keys[i];
				var seed = $('<div class="lqs_seed">'+type+' </div>');
				if( data.nodeTypes[type]["count"] ) {
					seed.append( $('<span>('+data.nodeTypes[type]["count"]+')</span>' ) );
				}
				this.dom.content.append(seed);
				seed.click( function() { 
					this.node.manifestGraphType(this.type); 
					this.node.showIcon();
				}.bind({node:this,type:type}) );
			}
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
			this.fitSize();
		}.bind(this))
	}
	
			
	showGraphType() {
		this.reset();
		this.setTitleText( this.data.title );
		if( this.data.graphIdent && this.data.graphIdent.title ) {
			this.setTitleText( this.data.graphIdent.title+" #"+this.data.nodeType );
		}
		this.dom.content.html("Loading...");
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', types:this.data.nodeType },
			url: node.data.endpoint
		}).done(function(data){
			this.dom.content.html("");
			//this.dom.content.html( LQS.dataToHTML( data ) );
			var keys = Object.keys( data.nodes );
			for( var i=0;i<keys.length;++i) {
				var apiNode = data.nodes[keys[i]];
				var seed = $('<div class="lqs_seed"></div>').text( " "+apiNode.title);
				this.dom.content.append(seed);
				seed.click( function() { 
				this.node.manifestGraphNode(this.apiNode,'belongs to',true); 
					this.node.showIcon();
				}.bind({node:this,apiNode:apiNode}) );
			}
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
			this.fitSize();
		}.bind(this))
	}

	showGraphNode() {
		this.reset();
		this.setTitleText( this.data.title );
		this.dom.content.html("Loading...");
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids:this.data.nodeID, data:1 },
			url: node.data.endpoint
		}).done(function(data){
			this.data.graph = data.nodes[this.data.nodeID];
			this.dom.content.text('');
			this.dom.content.append( this.renderGraphNodeContent() );
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.text( "Failed to get data (TODO: add a 'retry' icon). Using cached version." );
			this.dom.content.append( 
				$("<div class='lqs_cached'></div>").append(this.renderGraphNodeContent()));
			this.fitSize();
		}.bind(this))
	}

	renderGraphNodeContent() {	
		var content = $('<div></div>');
		if( !this.data.graph || !this.data.graph.data ) {
			content.text( "cache not available" );
		} else if( this.data.graph.data.html ) {
			content.html( this.data.graph.data.html );
			// duplicate code, candidate for a function?
			content.find( 'a' ).attr("target","_blank");
				content.find( 'img,iframe' ).css("max-width","100%");
		} else if( this.data.graph.data.icon ) {
			content.html( $("<img style='width:100%;min-width:50px;max-width:100%' />").attr('src',this.data.graph.data.icon));
		} else {
			content.text( "<null>" );
		}	
		return content;
	}

	manifestGraphNode(apiNode,relation,forwards) {
		var id = "graph/"+this.data.endpoint+"/node/"+apiNode.id;
		if( this.lqs.nodes[id] ) {
			this.lqs.nodes[id].reveal();
		} else {
			var pt = lqs.toVirtual(LQS.screenMiddle());
			addNode({
				id: id,
				x: pt.x,
 				y: pt.y,	
				title: apiNode.title,
				width:  ((LQS.winWidth() /2))/LQS.layoutScale,
				height: ((LQS.winHeight()/2))/LQS.layoutScale,
				type: "graph-node",
				link: true,
				nodeID: apiNode.id,
				endpoint: this.data.endpoint,
				meta: {}
			});
		}
		if( forwards ) {
			var link_id = "graph/link/"+relation+"/"+id+"/"+this.data.id;
			if( !this.lqs.links[link_id] ){ 
				addLink({
					subject: {node: id},
					object: {node: this.data.id},
					label: relation,
					id: link_id
				});
			}
		} else {
			var link_id = "graph/link/"+relation+"/"+this.data.id+"/"+id;
			if( !this.lqs.links[link_id] ){ 
				addLink({
					subject: {node: this.data.id},
					object: {node: id},
					label: relation,
					id: link_id
				});
			}
		}
	}

	manifestGraphType(type) {
		var id = "graph/"+this.data.endpoint+"/type/"+type;
		if( this.lqs.nodes[id] ) {
			this.lqs.nodes[id].reveal();
		} else {
			var pt = lqs.toVirtual(LQS.screenMiddle());
			addNode({
				id: id,
				x: pt.x,
 				y: pt.y,	
				title: "Graph API: "+type+" nodes",
				width:  ((LQS.winWidth() /2))/this.lqs.layoutScale,
				height: ((LQS.winHeight()/2))/this.lqs.layoutScale,
				type: "graph-type",
				nodeType: type,
				endpoint: this.data.endpoint,
				gizmo: true,
				graphIdent: this.data.graphIdent,
				meta: {}
			});
		}
		var link_id = "graph/link/"+id+"/"+this.data.id;
		if( !this.lqs.links[link_id] ) {
			addLink({
				object: {node: id},
				subject: {node: this.data.id},
				label: "belongs to",
				id: link_id
			});
		}
	}

	showGraphNodeLinks() {
		this.reset();
		this.dom.content.html("Loading...");
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids: this.data.nodeID, followLinks: '*' },
			url: node.data.endpoint
		}).done(function(data){
			this.dom.content.html("");
			//this.dom.content.append( LQS.dataToHTML( data ));
			this.dom.content.append( $('<div>This endpoint has the following links:</div>'));
			for( var i=0;i<data.links.length; ++i ) {
				apiLink = data.links[i];
				if( apiLink.subject == this.data.nodeID && data.nodes[apiLink.object] ) {
					var apiNode = data.nodes[apiLink.object];
					var row = $('<div class="lqs_seed" > '+apiLink.type+' link to  '+apiNode.title+' ('+apiNode.type+') </div>');
					this.dom.content.append(row);
					row.click( function() { this.node.manifestGraphNode(this.apiNode,this.apiLink.type,true); }.bind({node:this,apiNode:apiNode,apiLink:apiLink}) );
				}
				if( apiLink.object == this.data.nodeID && data.nodes[apiLink.subject] ) {
					var apiNode = data.nodes[apiLink.subject];
					var row = $('<div class="lqs_seed" > '+apiLink.type+' link from  '+apiNode.title+' ('+apiNode.type+') </div>');
					this.dom.content.append(row);
					row.click( function() { this.node.manifestGraphNode(this.apiNode,this.apiLink.type,false); }.bind({node:this,apiNode:apiNode,apiLink:apiLink}) );
				}
			}
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.html( "API Call failed" );
			this.fitSize();
		}.bind(this))
	}

	showLink() {
		this.reset();
		this.data.view = "link";
		if( this.data.type == 'graph-node' ) {
			this.showGraphNodeLinks();
			return;
		}
		this.dom.content.html("This node does not have a link editing interface");
	}

	showGraphSelect() {	
		this.reset();
		this.setTitleText(this.data.title);
		var input = $("<input class='normal-paste' value='https://www.southampton.ac.uk/~totl/wordpress-graph-demo/' />");
		var button = $("<button>CONNECT</button>");
		button.click( function() {
			manifestGraphBase( input.val() );
			this.remove();
		}.bind(this));
		this.dom.content.html("");
		this.dom.content.append( input );
		this.dom.content.append( button );
		this.fitSize();
	}

	showDot() {
		this.dom.outer.hide();
		this.dom.dot.show();
		this.dom.dotText.show();
		this.data.view = "dot";
		this.updatePosition();
		this.updateLinksPosition();
	}
	hideDot() {
		this.dom.outer.show();
		this.dom.dot.hide();
		this.dom.dotText.hide();
		this.showFullContent();
		this.updatePosition();
		this.updateLinksPosition();
	}
	showIcon() {
		this.dom.outer.hide();
		this.dom.icon.show();
		this.dom.dotText.show();
		this.data.view = "icon";
		this.updatePosition();
		this.updateLinksPosition();
	}
	hideIcon() {
		this.dom.outer.show();
		this.dom.icon.hide();
		this.dom.dotText.hide();
		this.showFullContent();
		this.updatePosition();
		this.updateLinksPosition();
	}


	showFullContent() {
		this.reset();
		this.data.view = "full-content";
		// this should clearly be plugin based eventually
		if( this.data.type == 'graph-select' ) {
			this.showGraphSelect();
			return;
		}
		if( this.data.type == 'graph-base' ) {
			this.showGraphBase();
			return;
		}
		if( this.data.type == 'graph-type' ) {
			this.showGraphType();
			return;
		}
		if( this.data.type == 'graph-node' ) {
			this.showGraphNode();
			return;
		}

		// html, text, or using metadata
		this.setTitleText( this.data.title );
		var hasContent = false;
		if( this.data.html ) {
			this.dom.content.html( LQS.sanitiseHtml(this.data.html) );
		} else if( this.data.text ) {
			this.dom.content.text( this.data.text );	
		} else {
			this.dom.content.text("");
			if( this.data.source ) {
				if( this.data.source.URL ) {
					this.dom.content.append( $('<div></div>').append( $('<a></a>').attr('href',this.data.source.URL).text(this.data.source.URL)));
					hasContent = true;
				}
				if( this.data.source.image && this.data.source.image.URL ) {
					this.dom.content.append( $('<img style="float:right; padding: 0 0 5px 5px;width:50%" />').attr('src',this.data.source.image.URL));;
					hasContent = true;
				}
			}
			if( this.data.description ) {
				this.dom.content.append( $('<div></div>').text( this.data.description ));
				hasContent = true;
			}
			if( !hasContent ) {	
	 			this.dom.content.text( "<no content>" );
			}
		}
		if( this.data.meta && this.data.meta.source && this.data.meta.source.URL ) {
			var span = $('<div style="text-align:right">- </div>');
			this.dom.content.append( span );
			span.append( $('<a>Source</a>').attr( 'href',this.data.meta.source.URL));
		}
		this.dom.content.find( 'a' ).attr("target","_blank");
		this.dom.content.find( 'img,iframe' ).css("max-width","100%");
		//this.dom.content.find( 'img,iframe' ).css("max-height","100%");
	}

	showMeta() {
		this.reset();
		this.dom.content.html( LQS.dataToHTML( this.data ) );
		this.data.view = "meta";
	}

	reset() {
		this.dom.outer.removeClass('lqs_node_notitle');
		this.dom.content.html( '' );
	}

	showEdit() {
		this.reset();
		this.dom.outer.addClass('lqs_node_notitle');
		this.dom.edit = {};
		this.dom.edit.div = $('<div class="lqs_node_edit"></div>');
		this.dom.content.append( this.dom.edit.div );
		this.dom.edit.textarea = $('<textarea class="normal-paste" style="width:99%; height: 80%;"></textarea>');
		var buttons = $('<div style="margin-top:3%;text-align:right"></div>');
		this.dom.edit.save = $('<button style="max-height:10%">OK</button>');	
		this.dom.edit.cancel = $('<button style="float:right; max-height:10%">Cancel</button>');	
		this.dom.edit.div.append( this.dom.edit.textarea  );	
		this.dom.edit.div.append( buttons );
		buttons.append( this.dom.edit.save  );	
		buttons.append( this.dom.edit.cancel  );	
		this.dom.edit.textarea.focus();
		this.dom.edit.textarea.keyup(function(event){
			if( event.which==13 && !event.shiftKey) {
				this.dom.edit.save.click();
			}	
			if( event.which==27 ) {
				this.dom.edit.cancel.click();
			}	
		}.bind(this));
		if( this.data.html ) {
				this.dom.edit.textarea.text( this.data.html );
			this.dom.edit.save.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.data.html = v;
				this.showFullContent();
			}.bind(this));
			this.dom.edit.cancel.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.showFullContent();
			}.bind(this));
		} else {
			this.dom.edit.textarea.text( this.data.text );
			this.dom.edit.save.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.data.text = v;
				this.showFullContent();
				this.fitSize();
			}.bind(this));
			this.dom.edit.cancel.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.showFullContent();
			}.bind(this));
		} 
		this.fitSize();
	}

	reveal() {
		this.lqs.focusPage( new LQSPoint( this.data.x, this.data.y ) );
	}

	resized(event, ui) { 

		var wDelta  = ui.size.width  - ui.originalSize.width;
		var adjustedWidth  = ui.originalSize.width  + 2*wDelta;
		this.data.width  = Math.max(50,adjustedWidth/this.lqs.layoutScale);

		var hDelta  = ui.size.height - ui.originalSize.height;
		var adjustedHeight =  ui.originalSize.height + 2*hDelta;
		this.data.height = Math.max(50,adjustedHeight/this.lqs.layoutScale);

		this.updatePosition();
		this.updateLinksPosition();
	}

	dragged(event, ui) { 
		ui.position.left = Math.max(10, ui.position.left );
		ui.position.top = Math.max( 10, ui.position.top );
		this.data.x = (ui.position.left+this.realWidth()/2 -this.lqs.offsetX) /this.lqs.layoutScale;
		this.data.y = (ui.position.top +this.realHeight()/2-this.lqs.offsetY) /this.lqs.layoutScale;
		this.updatePosition();
		this.updateLinksPosition();
	}

	updatePosition() {
		var baseFontSize = 10;
		if( this.data.view == 'icon' || this.data.view == 'dot' ) {
			this.dom.dotText.attr('x',this.realX() );
			this.dom.dotText.attr('y', this.realY()+this.realHeight()/2+baseFontSize*this.lqs.layoutScale);
			this.dom.dotText.css('font-size',(baseFontSize*this.lqs.layoutScale)+"px"); 
		}
		if( this.data.view == 'icon' ) {
			this.dom.icon.css('left',this.realX()-this.realWidth()/2);
			this.dom.icon.css('top', this.realY()-this.realHeight()/2);
			return;
		}
		if( this.data.view == 'dot' ) {
			this.dom.dot.attr('cx',this.realX()-this.realWidth()/2);
			this.dom.dot.attr('cy', this.realY()-this.realHeight()/2);
			this.dom.dot.attr('r', this.dotSize*this.lqs.layoutScale);
			return;
		}
		this.dom.outer.css('left',this.realX()-this.realWidth()/2);
		this.dom.outer.css('top', this.realY()-this.realHeight()/2);
		this.dom.outer.css('width', this.data.width *this.lqs.layoutScale);
		this.dom.outer.css('height',this.data.height*this.lqs.layoutScale);
		var titleHeight = (18*this.lqs.layoutScale);
		var fontHeight = (16*this.lqs.layoutScale);
		this.dom.content.css('height',this.data.height*this.lqs.layoutScale-titleHeight ); // height of box minus borders and title
		this.dom.title.css('font-size',fontHeight+"px");
		this.dom.title.css('height',   titleHeight+"px" );
	}

	updateLinksPosition() {
		var  linkIds = Object.keys(this.lqs.links);
		for( var i=0; i<linkIds.length; ++i ) {
			this.lqs.links[linkIds[i]].updatePosition();
		}
	}

	fitSize() {
		this.dom.outer.css('width','auto');
		this.dom.outer.css('height','auto');
		this.dom.content.css('height','auto');
		this.dom.outer.css('max-width',(LQS.winWidth()/2)+"px");
		this.dom.outer.css('max-height',(LQS.winHeight()*3/4)+"px");
		this.dom.outer.find( '.lqs_tool' ).addClass('noTools');
		this.data.width =  (this.dom.outer.width() )/this.lqs.layoutScale+10;
		this.data.height = (this.dom.outer.height())/this.lqs.layoutScale+10;
		this.dom.outer.find( '.lqs_tool' ).removeClass('noTools');
		this.dom.outer.css('max-width','none');
		this.dom.outer.css('max-height','none');
		this.updatePosition();
		this.updateLinksPosition();
	}

	centrePoint() {
		return new LQSPoint( this.realX(), this.realY() );
	}

	// real means actual pixels not the place on the conceptual layout
	realX() {
		return this.data.x*this.lqs.layoutScale+this.lqs.offsetX;
	}
	realY() {
		return this.data.y*this.lqs.layoutScale+this.lqs.offsetY;
	}
	// the width of the node in pixels in the current scale
	realWidth() {
		if( this.data.view == 'icon' ) {
			return this.data.iconWidth;
		}
		if( this.data.view == 'dot' ) {
			return this.dotSize*this.lqs.layoutScale;
		}
		return this.data.width*this.lqs.layoutScale;
	}
	// the height of the node in pixels in the current scale
	realHeight() {
		if( this.data.view == 'icon' ) {
			return this.data.iconHeight;
		}
		if( this.data.view == 'dot' ) {
			return this.dotSize*this.lqs.layoutScale;
		}
		return this.data.height*this.lqs.layoutScale;
	}
	realWidthFull() {
		return this.realWidth()+this.borderSize*2;
	}
	realHeightFull() {
		return this.realHeight()+this.borderSize*2;
	}

	// find the point in a block nearest to the given point
	nearestPointTo( pt ) {
		// find the intersection with each edge
		var tl = new LQSPoint( this.realX()-this.realWidthFull()/2+1, this.realY()-this.realHeightFull()/2+1 );
		var tr = new LQSPoint( this.realX()+this.realWidthFull()/2  , this.realY()-this.realHeightFull()/2+1 );
		var bl = new LQSPoint( this.realX()-this.realWidthFull()/2+1, this.realY()+this.realHeightFull()/2   );
		var br = new LQSPoint( this.realX()+this.realWidthFull()/2  , this.realY()+this.realHeightFull()/2   );
		var lines = [
			new LQSLine( tl, tr ),
			new LQSLine( tr, br ),
			new LQSLine( bl, br ),
			new LQSLine( tl, bl )
		];
		var pokeyLine = new LQSLine( pt, this.centrePoint() );
		var rPt = null;
		var distance = 99999999;
		var line = null;
		for(var i=0;i<4;++i) {
			var iPt = pokeyLine.intersect( lines[i] );
			if( iPt ) {
				var iDist = pt.distance( iPt );
				if( iDist<distance ) {
					rPt = iPt;
					distance = iDist;
					rPt.edge =i;
				}		
			}
		}
		return rPt;
	}

	registerLink( link ) {
		this.links[link.data.id] = link;
	}

	deRegisterLink( link ) {
		delete this.links[link.data.id];
	}

	remove() {
		var link_ids = Object.keys(this.links);
		for( var i=0;i<link_ids.length;++i ) {
			this.links[link_ids[i]].remove();
		}
		delete this.lqs.nodes[this.data.id];
		this.dom.outer.remove();
		this.dom.icon.remove();
		this.dom.dot.remove();
		this.dom.dotText.remove();
	}
} // End Node


