
// effectively this is a static property
var LQS_NodeTypes = {};

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
		this.mouseOverBackground = true;

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
				type: 'text',
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
		this.attachSeed( graphTool, LQS_NodeTypes['graph-connect'].makeSeed({}) ); 


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
		/* each time the mouse enters something, if it's over the background set a flag */
		this.nodesLayer.on( "mouseover", (event)=>{
			this.mouseOverBackground = (event.target===this.nodesLayer[0]);
		});
	
	
		/* fancy stuff with paste */
		this.nodesLayer.focus();
		$('body').on('paste', function(event) {
			// if we are focused on a normal-paste element just skip this handler
			if( $('.normal-paste:focus').length ) { return; }
			this.pasteToBackground(event);
		}.bind(this));
	
		/* zoom on mousewheel, only when mouse over background */
		/* otherwise do nothing, TODO allow scroll in things with a scrollbar other than the background */
		this.nodesLayer.bind('wheel mousewheel', function(e){
			if( !this.mouseOverBackground ) { return; }
			var delta;
	
			if (e.originalEvent.wheelDelta !== undefined) {
				delta = e.originalEvent.wheelDelta;
			} else {
				delta = e.originalEvent.deltaY * -1;
			}
			this.layoutScaleSlider.val( parseFloat(this.layoutScaleSlider.val())+delta*0.001 );
			this.layoutScaleSlider.trigger('propertychange');
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

	attachSeed( el, seed ) {
		el.click( function() {
			this.lqs.growSeed(this.seed,{});
		}.bind({lqs:this,seed:seed}));
	}

	// geometry is things that are decided when the seed is grown like x,y 
	growSeed( seed, geometry ) {
		var nodeData = $.extend(true, {}, seed);
		nodeData = Object.assign( nodeData, geometry );
		if( nodeData.id && this.nodes[nodeData.id] ) {
			// already exists, lets just bring it into view
			this.nodes[nodeData.id].reveal();
			return;
		}

		var pt = this.toVirtual( LQS.screenMiddle() );
		// nb. testing if property exists as "0" is a valid option
		if( !nodeData.hasOwnProperty("x") ) {	
			nodeData.x=pt.x;
		}
		if( !nodeData.hasOwnProperty("y") ) {	
			nodeData.y=pt.y;
		}
		if( !nodeData.hasOwnProperty("id") ) {	
			nodeData.id = LQS.uuid();
		}
		var node = this.addNode( nodeData );	
		if( !nodeData.hasOwnProperty("width") ) {	
			node.fitSize();
		}

		if( seed.links ) {
			for( var i=0; i<seed.links.length; ++i ) {
				this.addLink( seed.links[i] );
			}
		}

		if( seed.fromAfterOpen && seed.from ) {
			if( seed.fromAfterOpen == 'dot' ) {
				seed.from.showDot();
			}
			if( seed.fromAfterOpen == 'icon' ) {
				seed.from.showIcon();
			}
			if( seed.fromAfterOpen == 'close' ) {
				seed.from.remove();
			}
		}

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
		if( this.links[linkData.id] ) { return null; }
		if( !this.nodes[linkData.subject.node] ) { return null; }
		if( !this.nodes[linkData.object.node] ) { return null; }
		
		// create link
		this.links[linkData.id] = new LQS_Link( linkData, this );
		this.links[linkData.id].updatePosition();
		return this.links[linkData.id];
	}

	addNode( nodeData ) {
		// validate node TODO

		var nodeClass;
		if( !nodeData.type ) {
			nodeClass = LQS_NodeTypes['html'];
		} else if( LQS_NodeTypes[nodeData.type] ) {
			nodeClass = LQS_NodeTypes[nodeData.type];
		} else {
			nodeClass = LQS_NodeTypes["error"];
		}
			
		// create node
		const NC = nodeClass;
		this.nodes[nodeData.id] = new NC( nodeData, this );
		this.nodes[nodeData.id].updatePosition();
		return this.nodes[nodeData.id];
	}

	pasteToBackground(event) {
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var pt = this.toVirtual(this.mouse);
		var nodeData = {
			id: LQS.uuid(),
			x: pt.x,
 			y: pt.y,
			width:  LQS.winWidth() /2/this.layoutScale,
			height: LQS.winHeight()/2/this.layoutScale,
			meta: {}
		};
		

		// detect citation html

		if( false&&json ) {
			//nb this can throw a syntax error, it really should be handled
			var jsonData = JSON.parse( json );
			// assume object
			// detect JRNL0.1
			if( jsonData.jrnlCitation ) {
				nodeData.title = jsonData.citation.title;
				nodeData.html = jsonData.citation.html; // or text
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
			nodeData.type = "url";
			nodeData.title = "Pasted URL";
			nodeData.text = text+"\n(will lookup metadata in a mo...)";
			nodeData.edit = false;
			var newNode = this.addNode(nodeData);
			newNode.fitSize();
			$.ajax({
				method: "GET",
				data: { url: text },
				url: this.inspectorProxy
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
				newNode.showMain();
				newNode.fitSize();
			}).fail(function(){
				nodeData.text = text+"\n(metadata query failed)";
				newNode.showMain();
				newNode.fitSize();
			})
			return;
		}

		var html = clipboardData.getData( 'text/html' );
		if( html ) {
			nodeData.title = "Pasted HTML";
			nodeData.html = html;
			nodeData.type = "html";
			var newNode = this.addNode(nodeData);
			newNode.fitSize();
			return;
		}

		nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.type = "text";
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
		if( !html ) { return ""; }
		html = html.replace( /<script>.*?<\/script>/, '' );
		return html;
	}

}










