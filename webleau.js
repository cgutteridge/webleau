$(document).ready(function() {

	var layout = {
		nodes: [
			{
				id: 'f',
				x: 800,
				y: 500,
				width: 200,
				height: 200,
				title: 'Lonely',
				text: 'I\'m not connected to anything.',
				edit: true
			},
			{
				id: 'a',
				x: 300,
				y: 500,
				width: 200,
				height: 200,
				title: 'Box A',
				text: 'This is a comment',
				edit: true
			},
			{
				id: 'c',
				x: 300,
				y: 300,
				width: 100,
				height: 100,
				title: 'Box C',
				text: 'This is also a comment',
				edit: true
			},
			{
				id: 'd',
				x: 410,
				y: 410,
				width: 100,
				height: 100,
				title: 'Box D',
				text: 'This is also a comment'
			},
			{
				id: 'b',
				x: 500,
				y: 150,
				width: 200,
				height: 200,
				title: 'Box B',
				text: 'This is also a comment'
			}
		],
		links: [
			{
				id: 'l1',
				subject: { node: 'a' },
				object: { node: 'b' }
			},
			{
				id: 'l2',
				subject: { node: 'a' },
				object: { node: 'c' }
			},
			{
				id: 'l3',
				subject: { node: 'a' },
				object: { node: 'd' }
			},
			{
				id: 'l4',
				subject: { node: 'd' },
				object: { node: 'b' }
			},
			{
				id: 'l5',
				subject: { node: 'd' },
				object: { node: 'c' }
			}
		]
	};
	
	var nodesLayer;
	var linksLayer;
	var nodes = {};
	var links = {};
	var winScale = 1;
	var layoutScale = 1;
	var mouseX=winWidth()/2/layoutScale;
	var mouseY=winHeight()/2/layoutScale;
	$( document).on( "mousemove", function( event ) {
		mouseX = event.pageX / layoutScale;
		mouseY = event.pageY / layoutScale;
	});

	function winHeight() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerHeight || e.clientHeight || g.clientHeight;
	}
	function winWidth() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerWidth || e.clientWidth || g.clientWidth;
	}
	function winLeft() {
		var d = document.documentElement;
		return (window.pageXOffset || d.scrollLeft) - (d.clientLeft || 0);
	}
	function winTop() {
		var d = document.documentElement;
		return (window.pageYOffset || d.scrollTop)  - (d.clientTop || 0);
	}

	initPage( layout );

	function Point( x,y ) {
		this.x = x;
		this.y = y;
		this.distance = function( pt ) {
			var ld = (pt.x-this.x)*(pt.x-this.x)+(pt.y-this.y)*(pt.y-this.y);
			return Math.sqrt( ld );
		}
	}

	function between(val, limit1,limit2 ) {
		return( val>=Math.min(limit1,limit2)-1 && val<=Math.max(limit1,limit2)+1 );
	}
	function Line( from, to ) {
		this.from = from;
		this.to = to;
		this.intersect = function( that ) {
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
			if( !between(x, this.from.x,this.to.x)
			 || !between(y, this.from.y,this.to.y)
			 || !between(x, that.from.x,that.to.x) 
			 || !between(y, that.from.y,that.to.y) ) {
				return null;
			}
			return new Point( x, y );
		};
	}

	function Node( nodeData ) {

		// functions we need to define early
		this.showFullContent = function() {
			if( this.data.html ) {
				this.dom.content.html( this.data.html );
			} else if( this.data.text ) {
				this.dom.content.text( this.data.text );
			} else {
				this.dom.content.text( "<no content>" );
			}
			this.showing = "full-content";
		}

		this.showMeta = function() {
			this.dom.content.html( dataToHTML( this.data ) );
			this.showing = "meta";
		}

		//init
		
		// data
		this.data = nodeData;

		// links
		// TODO should this distinguish incoming and outgoing?
		this.links = {};

		// dom
		this.dom = {};
		this.dom.outer = $('<div class="webleau_node"></div>');
		this.dom.title = $('<div class="webleau_node_title"></div>');
		this.dom.titleLeft = $('<div class="webleau_node_title_left"></div>');
		this.dom.titleRight = $('<div class="webleau_node_title_right"></div>');
		this.dom.titleText = $('<div class="webleau_node_title_text"></div>');
		this.dom.content = $('<div class="webleau_node_content"></div>');

		if( nodeData.edit ) {
			this.dom.toolEdit = $('<div class="webleau_tool"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div>');
			this.dom.titleLeft.append( this.dom.toolEdit );
		}

		this.dom.toolexpand = $('<div class="webleau_tool"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span></div>');
		this.dom.titleLeft.append( this.dom.toolexpand );
		this.dom.toolexpand.click( function() {
			this.expandHeight();
		}.bind(this));

		this.dom.toolinfo = $('<div class="webleau_tool"><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span></div>');
		this.dom.titleLeft.append( this.dom.toolinfo );
		this.dom.toolinfo.click( function() {
			if( this.showing == 'meta' ) {
				this.showFullContent();
			} else {
				this.showMeta();
			}
		}.bind(this));

		this.dom.toolRemove = $('<div class="webleau_tool"><span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span></div>');
		this.dom.toolRemove.click( function() {
			if( confirm( "Really?" ) ) {
				this.remove();
				updateAllPositions();
			}
		}.bind(this)); 
		
		this.dom.titleRight.append( this.dom.toolRemove );
		//this.dom.toolResize = $('<div class="webleau_node_resize webleau_tool"><span class="glyphicon glyphicon-resize-small" aria-hidden="true"></span></div>');
		//this.dom.outer.append( this.dom.toolResize );
			
		this.dom.outer.append( this.dom.title );
		this.dom.title.append( this.dom.titleLeft );
		this.dom.title.append( this.dom.titleRight );
		this.dom.title.append( this.dom.titleText );
		this.dom.outer.append( this.dom.content );
		nodesLayer.append( this.dom.outer );
		this.dom.titleText.text( nodeData.title );
		this.links = {};

		// state
		this.showFullContent();

		// methods

		this.resized = function(event, ui) { 
			var wDelta  = ui.size.width  - ui.originalSize.width;
			var hDelta  = ui.size.height - ui.originalSize.height;
			ui.size.width  = Math.max(50, ui.originalSize.width  + 2*wDelta);
			ui.size.height = Math.max(50, ui.originalSize.height + 2*hDelta);
			wDelta  = ui.size.width  - ui.originalSize.width;
			hDelta  = ui.size.height - ui.originalSize.height;
			ui.position.top  = ui.originalPosition.top - hDelta/2;
			ui.position.left = ui.originalPosition.left - wDelta/2;
			this.data.width  = ui.size.width/winScale;
			this.data.height = ui.size.height/winScale;
			this.updatePosition();
			var  linkIds = Object.keys(links);
			for( var i=0; i<linkIds.length; ++i ) {
				links[linkIds[i]].updatePosition();
			}
		}

		this.dragged = function(event, ui) { 
			ui.position.left = Math.max(10, ui.position.left );
			ui.position.top = Math.max( 10, ui.position.top );
			this.data.x = Math.max(10,ui.position.left/layoutScale)+this.realWidth() /layoutScale/2;
			this.data.y = Math.max(10,ui.position.top /layoutScale)+this.realHeight()/layoutScale/2;
			this.updatePosition();
			var  linkIds = Object.keys(links);
			for( var i=0; i<linkIds.length; ++i ) {
				links[linkIds[i]].updatePosition();
			}
		}
	
		this.updatePosition = function() {
			this.dom.outer.css('top',this.realY()-this.realHeight()/2);
			this.dom.outer.css('left',this.realX()-this.realWidth()/2);
			this.dom.outer.css('width', this.data.width*winScale);
			this.dom.outer.css('height',this.data.height*winScale);
			this.dom.content.css('height',this.data.height*winScale-20 ); // height of box minus borders and title
		}

		this.expandHeight = function() {
			//this.dom.outer.css('width','auto');
			this.dom.outer.css('height','auto');
			this.dom.outer.css('width',this.dom.outer.width()-20); // compensate for scrollbar TODO (needs work)
			this.dom.content.css('height','auto');
			this.dom.outer.find( '.webleau_tool' ).addClass('noTools');
			this.data.width = this.dom.outer.width()/winScale;
			this.data.height = this.dom.outer.height()/winScale;
			this.updatePosition();
			this.dom.outer.find( '.webleau_tool' ).removeClass('noTools');
		}

		this.centrePoint = function() {
			return new Point( this.realX(), this.realY() );
		}

		this.borderSize = 2;
		// real means actual pixels not the place on the conceptual layout
		this.realX = function() {
			return this.data.x*layoutScale;
		}
		this.realY = function() {
			return this.data.y*layoutScale;
		}
		this.realWidth = function() {
			return this.data.width*winScale;
		}
		this.realHeight = function() {
			return this.data.height*winScale;
		}
		this.realWidthFull = function() {
			return this.data.width*winScale+this.borderSize*2;
		}
		this.realHeightFull = function() {
			return this.data.height*winScale+this.borderSize*2;
		}

		// find the point in a block nearest to the given point
		this.nearestPointTo = function( pt ) {
			// find the intersection with each edge
			var tl = new Point( this.realX()-this.realWidthFull()/2,   this.realY()-this.realHeightFull()/2 );
			var tr = new Point( this.realX()+this.realWidthFull()/2-1, this.realY()-this.realHeightFull()/2 );
			var bl = new Point( this.realX()-this.realWidthFull()/2,   this.realY()+this.realHeightFull()/2-1 );
			var br = new Point( this.realX()+this.realWidthFull()/2-1, this.realY()+this.realHeightFull()/2-1 );
			var lines = [
				new Line( tl, tr ),
				new Line( tr, br ),
				new Line( bl, br ),
				new Line( tl, bl )
			];
			var pokeyLine = new Line( pt, this.centrePoint() );
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

		this.registerLink = function( link ) {
			this.links[link.data.id] = link;
		}

		this.deRegisterLink = function( link ) {
			delete this.links[link.data.id];
		}

		this.remove = function() {
			var link_ids = Object.keys(this.links);
			for( var i=0;i<link_ids.length;++i ) {
				this.links[link_ids[i]].remove();
			}
			delete nodes[this.data.id];
			this.dom.outer.remove();
		}

		// register UI hooks
		this.dom.outer.resizable({
			resize: this.resized.bind(this),
			//stop: this.resizeStopped.bind(this),
			minHeight: 50,
			minWidth: 50
		});
		this.dom.outer.draggable( { 
			containment: $('.webleau_nodes'),
			handle: ".webleau_node_title",
			opacity: 0.8,
			scroll: true,
			scrollSensitivity: 100,
			drag: this.dragged.bind(this)
		});
	}

	function Link( linkData ) {

 		this.data = linkData;
		if( !this.data.id  ) { this.data.id=uuid(); }
		var subjectNode = nodes[this.data.subject.node];
		var objectNode = nodes[this.data.object.node];
		// TODO check if these exist and handle exceptions	
		subjectNode.registerLink(this);
		objectNode.registerLink(this);

		this.dom = {};
		this.dom.id = "link_"+linkData.id;
 		var line = $('<line id="'+this.dom.id+'" class="webleau_link" marker-end="url(#arrow)" />');
		linksLayer.append( line );

		// methods 

		this.updatePosition = function() {
			var subjectNode = nodes[this.data.subject.node];
			var objectNode = nodes[this.data.object.node];
			var pt1 = subjectNode.nearestPointTo( objectNode.centrePoint() );
			var pt2 = objectNode.nearestPointTo( subjectNode.centrePoint() );
			if( pt1 && pt2 ) {
				$("#"+this.dom.id).attr('x1',pt1.x);	
				$("#"+this.dom.id).attr('y1',pt1.y);	
				$("#"+this.dom.id).attr('x2',pt2.x);	
				$("#"+this.dom.id).attr('y2',pt2.y);	
			}
		}

		this.remove = function() {
			var subjectNode = nodes[this.data.subject.node];
			var objectNode = nodes[this.data.object.node];
			subjectNode.deRegisterLink(this);
			objectNode.deRegisterLink(this);
			delete links[this.data.id];
			$("#"+this.dom.id).remove();
		}
	}

	function initPage( layout) {
		nodesLayer = $('<div class="webleau_nodes"></div>');
		$('body').append(nodesLayer);
		linksLayer = $('<svg class="webleau_svg"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#666" /></marker></defs></svg>');
		$('body').append(linksLayer);

		for( var i=0; i<layout.nodes.length; ++i ) {
			addNode( layout.nodes[i] );
		}
		for( var i=0; i<layout.links.length; ++i ) {
			addLink( layout.links[i] );
		}

		// reset SVG layer 
		linksLayer.html( linksLayer.html() );

		var controls = $('<div class="controls"></div>');
		var winScaleSlider = $('<input type="range" value="1" min="0.001" max="8" step="0.001" />');
		var layoutScaleSlider = $('<input type="range" value="1" min="0.001" max="8" step="0.001" />');
;
		//var contentToggle = $('<label>Show node contents: </label>');
		//var input = $('<input type="checkbox" value="1" checked></input>');
		//contentToggle.append(input);
		var nodeScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Node scale: </div>' ).append(nodeScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(winScaleSlider) );
		var layoutScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Layout scale: </div>' ).append(layoutScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(layoutScaleSlider) );
		controls.append( layoutScaleSlider );
		//controls.append( contentToggle );
		$('body').append(controls);
		winScaleSlider.on('propertychange input', function( event ) {
			winScale = winScaleSlider.val();
			nodeScaleDisplay.text( ""+(Math.round( winScale*100000 ) / 1000)+"%" );
			updateAllPositions();
		});
		layoutScaleSlider.on('propertychange input', function(event) {
			// find coords of screen centre
			var layoutx = (winLeft()+winWidth()/2)/layoutScale;
			var layouty = (winTop()+winHeight()/2)/layoutScale;
			layoutScale = layoutScaleSlider.val();
			layoutScaleDisplay.text( ""+(Math.round( layoutScale*100000 ) / 1000)+"%" );
			var realx = layoutx*layoutScale;
			var realy = layouty*layoutScale;
			window.scrollTo( realx-winWidth()/2, realy-winHeight()/2 );
			updateAllPositions();
		});
	}


	function updateAllPositions() {
		nodeKeys = Object.keys(nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			nodes[nodeKeys[i]].updatePosition();
		}
		linkKeys = Object.keys(links);
		for( var i=0; i<linkKeys.length; ++i ) {
			links[linkKeys[i]].updatePosition();
		}
	}


	function addLink( linkData ) {
		// validate link TODO
		
		// create link
		links[linkData.id] = new Link( linkData );
		links[linkData.id].updatePosition();
		return links[linkData.id];
	}

	function addNode( nodeData ) {
		// validate node TODO

		// create node
		nodes[nodeData.id] = new Node( nodeData );
		nodes[nodeData.id].updatePosition();
		return nodes[nodeData.id];
	}

	// from http://forums.devshed.com/javascript-development-115/regexp-match-url-pattern-493764.html	
	function validURL(str) {
		var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[-;&a-z\d%_.~+=]*)?(\#[-a-z\d_]*)?$/i;
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	}
	function uuid() {
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


	$(document).on('paste', function(event) {
		// nb need to stop this applying to textarea and input
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var json = clipboardData.getData('application/json');
		var nodeData = {
			id: uuid(),
			x: mouseX,
 			y: mouseY,
			width:  winWidth() /2/winScale,
			height: winHeight()/2/winScale,
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
				var newNode = addNode(nodeData);
				newNode.expandHeight();
				return;
			}
		}

		var text = clipboardData.getData( 'text/plain' );
		if( validURL(text) ) {
			nodeData.title = "Pasted URL";
			nodeData.text = text+"\n(will lookup metadata in a mo...)";
			nodeData.edit = false;
			var newNode = addNode(nodeData);
			newNode.expandHeight();
			return;
		}

		var html = clipboardData.getData( 'text/html' );
		if( html ) {
			nodeData.title = "Pasted HTML";
			nodeData.html = text;
			nodeData.edit = true;
			var newNode = addNode(nodeData);
			newNode.expandHeight();
			return;
		}

		nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.edit = true;
		var newNode = addNode(nodeData);
		newNode.expandHeight();
	});	

	function dataToHTML(value) {
		if( value && typeof value === 'object' && value.constructor === Array ) {
			// array
			var table = $('<table class="meta_array"></table');
			for( var i=0; i<value.length; ++i ) {
				var tr = $('<tr></tr>');
				tr.append( $('<th></th>').text(i) );
				tr.append( $('<td></td>').append( dataToHTML( value[i] ) ) );
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
				tr.append( $('<td></td>').append( dataToHTML( value[keys[i]] ) ) );
				table.append(tr);
			}
			return table;
		} else {
			return $('<span class="meta_value"></span>').text(value);
		}
	}
});
