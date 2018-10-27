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
				content: 'I\'m not connected to anything.',
				edit: true
			},
			{
				id: 'a',
				x: 300,
				y: 500,
				width: 200,
				height: 200,
				title: 'Box A',
				content: 'This is a comment',
				edit: true
			},
			{
				id: 'c',
				x: 300,
				y: 300,
				width: 100,
				height: 100,
				title: 'Box C',
				content: 'This is also a comment',
				edit: true
			},
			{
				id: 'd',
				x: 410,
				y: 410,
				width: 100,
				height: 100,
				title: 'Box D',
				content: 'This is also a comment'
			},
			{
				id: 'b',
				x: 500,
				y: 150,
				width: 200,
				height: 200,
				title: 'Box B',
				content: 'This is also a comment'
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
	var mouseX=0;
	var mouseY=0;
	$( document).on( "mousemove", function( event ) {
		mouseX = event.pageX / layoutScale;
		mouseY = event.pageY / layoutScale;
	});

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
			console.log( this.data );
		}.bind(this));

		this.dom.toolRemove = $('<div class="webleau_tool"><span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span></div>');
		this.dom.toolRemove.click( function() {
			if( confirm( "Really?" ) ) {
			}
		}); 
		
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
		this.dom.content.text( nodeData.content );
		this.links = {};

		// data
		this.data = nodeData;

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
		}

		this.expandHeight = function() {
			//this.dom.outer.css('width','auto');
			this.dom.outer.css('height','auto');
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
		// register UI hooks
		this.dom.outer.resizable({
			resize: this.resized.bind(this),
			//stop: this.resizeStopped.bind(this),
			minHeight: 50,
			minWidth: 50
		});
		this.dom.outer.draggable( { 
			handle: ".webleau_node_title",
			opacity: 0.8,
			drag: this.dragged.bind(this)
		});
	}

	function Link( linkData ) {
		// <polyline points="0,0 0,50 20,70 40,10 42,8 44,10, 46,14 50,50" />
		this.dom = {};
		this.dom.id = "link_"+linkData.id;
 		this.dom.outer = $('<line id="'+this.dom.id+'" class="webleau_link" marker-end="url(#arrow)" />');
 		this.data = linkData;
		linksLayer.append( this.dom.outer );

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
		var winScaleSlider = $('<div></div>').css( 'margin-bottom', '8px' );
		var layoutScaleSlider = $('<div></div>').css( 'margin-bottom', '8px' );
;
		//var contentToggle = $('<label>Show node contents: </label>');
		//var input = $('<input type="checkbox" value="1" checked></input>');
		//contentToggle.append(input);
		controls.append( $('<div>Node scale</div>' ));
		controls.append( winScaleSlider );
		controls.append( $('<div>Layout scale</div>' ));
		controls.append( layoutScaleSlider );
		//controls.append( contentToggle );
		$('body').append(controls);
		winScaleSlider.slider({
			value:winScale,
			min: 0,
			max: 4,	
			step: 0.00001,
			slide: function( event, ui ) {
				winScale = ui.value;
				updateAllPositions();
			}
		});
		layoutScaleSlider.slider({
			value:layoutScale,
			min: 0,
			max: 4,	
			step: 0.0001,
			slide: function( event, ui ) {
				//var oldEffectiveWidth  = $(window).width()/layoutScale;
				//var oldEffectiveHeight = $(window).height()/layoutScale;
				layoutScale = ui.value;
				//var newEffectiveWidth  = $(window).width()/layoutScale;
				//var newEffectiveHeight = $(window).height()/layoutScale;

				//$(window).scrollLeft($(window).scrollLeft()-(newEffectiveWidth -oldEffectiveWidth )/2);
				//$(window).scrollTop( $(window).scrollTop() -(newEffectiveHeight-oldEffectiveHeight)/2);

				updateAllPositions();
			}
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
		var text = clipboardData.getData('text/plain' );

		var newNode = addNode({
				id: uuid(),
				x: mouseX,
				y: mouseY,
				width:  $(window).width() /2/layoutScale,
				height: $(window).height()/2/layoutScale/4,
				title: 'Pasted text',
				content: text,
				edit: true
		})
		console.log( $(window).height(), $(window).width() );
		newNode.expandHeight();
	});	
});
