$(document).ready(function() {

	var layout = {
		nodes: [
			{
				id: 'a',
				x: 100,
				y: 200,
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
				x: 10,
				y: 10,
				width: 100,
				height: 100,
				title: 'Box D',
				content: 'This is also a comment'
			},
			{
				id: 'b',
				x: 500,
				y: 100,
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
		this.dom.toolinfo = $('<div class="webleau_tool"><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span></div>');
		this.dom.titleLeft.append( this.dom.toolinfo );
		this.dom.toolinfo.click( function() {
			console.log( this.data );
		}.bind(this));
		this.dom.toolRemove = $('<div class="webleau_tool"><span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span></div>');
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
			this.data.width = this.dom.outer.width();
			this.data.height = this.dom.outer.height();
			var  linkIds = Object.keys(links);
			for( var i=0; i<linkIds.length; ++i ) {
				links[linkIds[i]].updatePosition();
			}
		}

		this.dragged = function(event, ui) { 
			ui.position.left = Math.max( 10, ui.position.left );
			ui.position.top = Math.max( 10, ui.position.top );
			this.data.x = Math.max(10,this.dom.outer.position().left);
			this.data.y = Math.max(10,this.dom.outer.position().top);
			this.updatePosition();
			var  linkIds = Object.keys(links);
			for( var i=0; i<linkIds.length; ++i ) {
				links[linkIds[i]].updatePosition();
			}
		}
	
		this.updatePosition = function() {
			this.dom.outer.css('top',this.data.y);
			this.dom.outer.css('left',this.data.x);
			this.dom.outer.css('width',this.data.width);
			this.dom.outer.css('height',this.data.height);
		}

		this.centrePoint = function() {
			return new Point( 
				this.data.x + this.realWidth()/2,
				this.data.y + this.realHeight()/2
			);
		}

		this.borderSize = 2;
		this.realWidth = function() {
			return this.data.width+this.borderSize*2;
		}
		this.realHeight = function() {
			return this.data.height+this.borderSize*2;
		}

		// find the point in a block nearest to the given point
		this.nearestPointTo = function( pt ) {
			// find the intersection with each edge
			var tl = new Point( this.data.x,                    this.data.y );
			var tr = new Point( this.data.x+this.realWidth()-1, this.data.y );
			var bl = new Point( this.data.x,                    this.data.y+this.realHeight()-1 );
			var br = new Point( this.data.x+this.realWidth()-1, this.data.y+this.realHeight()-1 );
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
			stop: this.resized.bind(this),
			minHeight: 50,
			minWidth: 50
		});
		this.dom.outer.draggable( { 
			handle: ".webleau_node_title",
			opacity: 0.8,
			drag: this.dragged.bind(this),
			stop: this.dragged.bind(this),
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
		linksLayer = $('<svg class="webleau_svg"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#f00" /></marker></defs></svg>');
		$('body').append(linksLayer);

		for( var i=0; i<layout.nodes.length; ++i ) {
			addNode( layout.nodes[i] );
		}
		for( var i=0; i<layout.links.length; ++i ) {
			addLink( layout.links[i] );
		}

		// reset SVG layer 
		linksLayer.html( linksLayer.html() );
	}

	function addLink( linkData ) {
		// validate link TODO
		
		// create link
		links[linkData.id] = new Link( linkData );
		links[linkData.id].updatePosition();
	}

	function addNode( nodeData ) {
		// validate node TODO

		// create node
		nodes[nodeData.id] = new Node( nodeData );
		nodes[nodeData.id].updatePosition();
	}

	// from http://forums.devshed.com/javascript-development-115/regexp-match-url-pattern-493764.html	
	function ValidURL(str) {
		var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
			'((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
			'((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
			'(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
			'(\?[;&a-z\d%_.~+=-]*)?'+ // query string
			'(\#[-a-z\d_]*)?$','i'); // fragment locater
		if(!pattern.test(str)) {
			alert("Please enter a valid URL.");
			return false;
		} else {
			return true;
		}
	}

	$(document).on('paste', function(event) {
		// nb need to stop this applying to textarea and input
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var text = clipboardData.getData('text/plain' );
		alert(text);
	});	
});
