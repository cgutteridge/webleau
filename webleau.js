$(document).ready(function() {

	var layout = {
		nodes: [
			{
				id: 'welcome',
				x: 0,
				y: 0,
				width: 200,
				height: 200,
				title: 'Welcome',
				html: '<p>Welcome to Webleau.</p><p><a href="https://jrnl.global/2018/10/30/webleau-progress/">Introduction blog post</a></p>',
				edit: true
			},
			{
				id: 'a',
				x: 300,
				y: 200,
				width: 200,
				height: 200,
				title: '',
				text: 'Try pasting URLs from media sites. Try double clicking on the background. Use the spanner to save state (to a text string for now). Drag nodes to touch to make a link.',
				edit: true
			}
		],
		links: [
			{
				label: "comments",
				id: 'welcomelink',
				subject: { node: 'a' },
				object: { node: 'welcome' }
			}
		]
	};
	
	var nodesLayer;
	var arrowsLayer;
	var labelsLayer;
	var nodes = {};
	var links = {};
	var winScale = 1;
	var layoutScale = 1;
	var mouseX=0;
	var mouseY=0;
	var offsetX = 5000;
	var offsetY = 5000;

	// location of mouse on tablau
	$( document).on( "mousemove", function( event ) {
		mouseX = (event.pageX-offsetX) / layoutScale;
		mouseY = (event.pageY-offsetY) / layoutScale;
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

	initPage();
	setLayout( layout );

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
			this.showing = "full-content";
			this.dom.titleText.text( this.data.title );
			var hasContent = false;
			if( this.data.html ) {
				this.dom.content.html( this.data.html );
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
			this.dom.content.find( 'a' ).attr("target","_blank");
			this.dom.content.find( 'img,iframe' ).css("max-width","100%");
			this.dom.content.find( 'img,iframe' ).css("max-height","100%");
		}

		this.showMeta = function() {
			this.dom.content.html( dataToHTML( this.data ) );
			this.showing = "meta";
		}

		this.showEdit = function() {
			this.dom.content.html( '' );
			this.dom.edit = {};
			this.dom.edit.div = $('<div class="webleau_node_edit"></div>');
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
			}.bind(this));
			if( this.data.html ) {
				this.dom.edit.textarea.text( this.data.html );
				this.dom.edit.save.click( function() {
					this.data.html = this.dom.edit.textarea.val().trim();
					this.showFullContent();
				}.bind(this));
			} else {
				this.dom.edit.textarea.text( this.data.text );
				this.dom.edit.save.click( function() {
					this.data.text = this.dom.edit.textarea.val().trim();
					this.showFullContent();
					this.fitSize();
				}.bind(this));
			} 
			this.dom.edit.cancel.click( function() {
				this.showFullContent();
			}.bind(this));
			this.fitSize();
		}

		//init
		
		// data
		this.data = nodeData;

		// links
		// TODO should this distinguish incoming and outgoing?
		this.links = {};

		// dom
		this.dom = {};
		this.dom.outer = $('<div class="webleau_node"></div>').attr("data-node",this.data.id);
		this.dom.title = $('<div class="webleau_node_title"></div>');
		this.dom.titleLeft = $('<div class="webleau_node_title_left"></div>');
		this.dom.titleRight = $('<div class="webleau_node_title_right"></div>');
		this.dom.titleText = $('<div class="webleau_node_title_text"></div>');
		this.dom.content = $('<div class="webleau_node_content"></div>');

		if( nodeData.edit ) {
			this.dom.toolEdit = $('<div class="webleau_tool"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div>');
			this.dom.titleLeft.append( this.dom.toolEdit );
			this.dom.toolEdit.click( function() {
				this.showEdit();
			}.bind(this));
		}

		this.dom.toolfit = $('<div class="webleau_tool"><span class="glyphicon glyphicon-leaf" aria-hidden="true"></span></div>');
		this.dom.titleLeft.append( this.dom.toolfit );
		this.dom.toolfit.click( function() {
			this.fitSize();
		}.bind(this));

		this.dom.toolinfo = $('<div class="webleau_tool"><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span></div>');
		this.dom.titleLeft.append( this.dom.toolinfo );
		this.dom.toolinfo.click( function() {
			if( this.showing != 'meta' ) {
				this.showMeta();
			} else {
				this.showFullContent();
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
		this.dom.outer.dblclick(function() {
			var nodeData = {
				id: uuid(),
				x: mouseX,
 				y: mouseY,	
				title: "",
				width:  ((winWidth() /2/winScale))/layoutScale,
				height: ((winHeight()/2/winScale))/layoutScale,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = addNode(nodeData);
			var linkData = {
				subject: { node: comment.data.id },
				object: { node: this.data.id },
				label: "comments",
				id: uuid() 
			};
			var newLink = addLink( linkData );
			//subjectNode.updateLinksPosition();
			comment.showEdit();
			return false; // don't also run on background
		}.bind(this));
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
			this.data.width  = (ui.size.width/winScale)/layoutScale;
			this.data.height = (ui.size.height/winScale)/layoutScale;
			this.updatePosition();
			this.updateLinksPosition();
		}

		this.dragged = function(event, ui) { 
			ui.position.left = Math.max(10, ui.position.left );
			ui.position.top = Math.max( 10, ui.position.top );
			this.data.x = (ui.position.left+this.realWidth()/2 -offsetX) /layoutScale;
			this.data.y = (ui.position.top +this.realHeight()/2-offsetY) /layoutScale;
			this.updatePosition();
			this.updateLinksPosition();
		}
	
		this.updatePosition = function() {
			this.dom.outer.css('top',this.realY()-this.realHeight()/2);
			this.dom.outer.css('left',this.realX()-this.realWidth()/2);
			this.dom.outer.css('width', this.data.width*winScale*layoutScale);
			this.dom.outer.css('height',this.data.height*winScale*layoutScale);
			this.dom.content.css('height',this.data.height*winScale*layoutScale-20 ); // height of box minus borders and title
		}
		this.updateLinksPosition = function() {
			var  linkIds = Object.keys(links);
			for( var i=0; i<linkIds.length; ++i ) {
				links[linkIds[i]].updatePosition();
			}
		}

		this.fitSize = function() {
			this.dom.outer.css('width','auto');
			this.dom.outer.css('height','auto');
			this.dom.content.css('height','auto');
			this.dom.outer.css('max-width',(winWidth()/2)+"px");
			this.dom.outer.css('max-height',(winHeight()*3/4)+"px");
			this.dom.outer.find( '.webleau_tool' ).addClass('noTools');
			this.data.width =  (this.dom.outer.width() /winScale)/layoutScale+10;
			this.data.height = (this.dom.outer.height()/winScale)/layoutScale+10;
			this.dom.outer.find( '.webleau_tool' ).removeClass('noTools');
			this.dom.outer.css('max-width','none');
			this.dom.outer.css('max-height','none');
			this.updatePosition();
			this.updateLinksPosition();
		}

		this.centrePoint = function() {
			return new Point( this.realX(), this.realY() );
		}

		this.borderSize = 2;
		// real means actual pixels not the place on the conceptual layout
		this.realX = function() {
			return this.data.x*layoutScale+offsetX;
		}
		this.realY = function() {
			return this.data.y*layoutScale+offsetY;
		}
		// the width of the node in pixels in the current scale
		this.realWidth = function() {
			return this.data.width*winScale*layoutScale;
		}
		// the hight of the node in pixels in the current scale
		this.realHeight = function() {
			return this.data.height*winScale*layoutScale;
		}
		this.realWidthFull = function() {
			return this.data.width*winScale*layoutScale+this.borderSize*2;
		}
		this.realHeightFull = function() {
			return this.data.height*winScale*layoutScale+this.borderSize*2;
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
				var subjectNode = nodes[ui.draggable.attr('data-node')];
				var linkData = {
					subject: { node: ui.draggable.attr('data-node') },
					object: { node: this.data.id },
					label: "",
					id: uuid() 
				};
				var newLink = addLink( linkData );
				subjectNode.data.x = subjectNode.dragStartX;
				subjectNode.data.y = subjectNode.dragStartY;
				subjectNode.updatePosition();
				subjectNode.updateLinksPosition();
			}.bind(this)
		});
	}
	// End Node

	function Link( linkData ) {

 		this.data = linkData;
		if( !this.data.id  ) { this.data.id=uuid(); }
		var subjectNode = nodes[this.data.subject.node];
		var objectNode = nodes[this.data.object.node];
		// TODO check if these exist and handle exceptions	
		subjectNode.registerLink(this);
		objectNode.registerLink(this);

		var arrowsG = document.getElementById('svg_arrows');
		var labelsG = document.getElementById('svg_labels');

		this.dom = {};

		this.dom.id = "link_"+linkData.id;
 		var line = document.createElementNS("http://www.w3.org/2000/svg","line");
		line.id = this.dom.id;
		line.setAttribute( "class", "webleau_link" );
		line.setAttribute( "marker-end", "url(#arrow)" );
		arrowsG.appendChild( line );
		this.dom.from_id = "link_from_"+linkData.id;

		this.dom.from_id = "link_from_"+linkData.id;
 		var fromText = document.createElementNS("http://www.w3.org/2000/svg","text");
		fromText.setAttribute( "class", "webleau_link_from_text" );
		fromText.id = this.dom.from_id;
		fromText.appendChild( document.createTextNode( linkData.label ));
		labelsG.appendChild( fromText );
/*
		this.dom.to_id = "link_to_"+linkData.id;
 		var toText = document.createElementNS("http://www.w3.org/2000/svg","text");
		toText.setAttribute( "class", "webleau_link_to_text" );
		toText.id = this.dom.to_id;
		toText.appendChild( document.createTextNode( "is "+linkData.label+" of" ));
		labelsG.appendChild( toText );
*/

		// methods 

		this.updatePosition = function() {
			var subjectNode = nodes[this.data.subject.node];
			var objectNode = nodes[this.data.object.node];
			var c1 = objectNode.centrePoint();
			var c2 = subjectNode.centrePoint();
			var pt1 = subjectNode.nearestPointTo( c1 );
			var pt2 = objectNode.nearestPointTo( c2 );
			if( pt1 && pt2 ) {
				$("#"+this.dom.id).attr('x1',pt1.x);	
				$("#"+this.dom.id).attr('y1',pt1.y);	
				$("#"+this.dom.id).attr('x2',pt2.x);	
				$("#"+this.dom.id).attr('y2',pt2.y);	
				$("#"+this.dom.from_id).attr('x',(pt1.x+(pt2.x-pt1.x)/4));
				$("#"+this.dom.from_id).attr('y',(pt1.y+(pt2.y-pt1.y)/4));
/*
				$("#"+this.dom.to_id).attr('x',pt2.x);
				$("#"+this.dom.to_id).attr('y',pt2.y);
*/
			}
		}

		this.remove = function() {
			var subjectNode = nodes[this.data.subject.node];
			var objectNode = nodes[this.data.object.node];
			subjectNode.deRegisterLink(this);
			objectNode.deRegisterLink(this);
			delete links[this.data.id];
			$("#"+this.dom.id).remove();
			$("#"+this.dom.from_id).remove();
			$("#"+this.dom.to_id).remove();
		}
	}
	// End Link

	function getLayout() {
		var layout = { nodes: [], links: [] };
		var linkKeys = Object.keys( links );
		for( var i=0;i<linkKeys.length;++i ) {
			layout.links.push( links[linkKeys[i]].data );
		}

		var nodeKeys = Object.keys( nodes );
		for( var i=0;i<nodeKeys.length;++i ) {
			layout.nodes.push( nodes[nodeKeys[i]].data );
		}

		return layout;
	}

	function setLayout(layout) {
		// erase all stuff
		linkKeys = Object.keys(links);
		for( var i=0; i<linkKeys.length; ++i ) {
			links[linkKeys[i]].remove();
		}
		nodeKeys = Object.keys(nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			nodes[nodeKeys[i]].remove();
		}

		for( var i=0; i<layout.nodes.length; ++i ) {
			addNode( layout.nodes[i] );
		}
		for( var i=0; i<layout.links.length; ++i ) {
			addLink( layout.links[i] );
		}
	}

	function centrePage() {
		window.scrollTo( offsetX-winWidth()/2, offsetY-winHeight()/2 );
	}
		
	function initPage() {
		nodesLayer = $('<div class="webleau_nodes"></div>');
		$('body').append(nodesLayer);
		var svg = $('<svg class="webleau_svg"><defs><marker id="arrow" markerWidth="11" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#666" /></marker></defs><g id="svg_arrows"></g><g id="svg_labels"></g><g class="crosshair"><line x1="0" y1="-20" x2="0" y2="20" /><line x1="-20" y1="0" x2="20" y2="0" /></g></svg>');
		$('body').append(svg);
		$('.crosshair').attr("transform","translate("+offsetX+","+offsetY+")");
		// reset SVG layer 
		svg.html( svg.html() );
	
		centrePage();

		nodesLayer.dblclick(function() {
			var nodeData = {
				id: uuid(),
				x: mouseX,
 				y: mouseY,	
				title: "",
				width:  winWidth() /2/winScale/layoutScale,
				height: winHeight()/2/winScale/layoutScale,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = addNode(nodeData);
			comment.showEdit();
		});

		//$('body').append( $('<div class="ident">Webleau</div>'));
		/* CONTROLS */

		var controlsWrapper = $('<div class="controls_wrapper"><div class="controls_icon"><span class="glyphicon glyphicon-wrench" aria-hidden="true"></span></div></div>');
		var controls = $('<div class="controls"></div>');
		$(controlsWrapper).append(controls);
		$('body').append(controlsWrapper);

		/* CONTROLS: sliders */

		var winScaleSlider = $('<input type="range" value="1" min="0.001" max="8" step="0.001" />');
		var layoutScaleSlider = $('<input type="range" value="1" min="0.001" max="8" step="0.001" />');
		var nodeScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Node scale: </div>' ).append(nodeScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(winScaleSlider) );
		var layoutScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Layout scale: </div>' ).append(layoutScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(layoutScaleSlider) );
		controls.append( layoutScaleSlider );
		//controls.append( contentToggle );
		winScaleSlider.on('propertychange input', function( event ) {
			winScale = winScaleSlider.val();
			var perc = Math.round( winScale*100000 ) / 1000;
			nodeScaleDisplay.text( ""+perc+"%" );
			updateAllPositions();
		});
		layoutScaleSlider.on('propertychange input', function(event) {
			// find coords of screen centre
			var layoutx = (winLeft()+winWidth()/2-offsetX)/layoutScale;
			var layouty = (winTop()+winHeight()/2-offsetY)/layoutScale;
			layoutScale = layoutScaleSlider.val();
			var perc = Math.round( layoutScale*100000 ) / 1000;
			layoutScaleDisplay.text( ""+perc+"%" );
			nodesLayer.css( 'font-size',perc+"%" );
			var realx = layoutx*layoutScale+offsetX;
			var realy = layouty*layoutScale+offsetY;
			window.scrollTo( realx-winWidth()/2, realy-winHeight()/2 );
			updateAllPositions();
		});


		/* CONTROLS: tools */
		var controlTools = $('<div class="webleau_controls_tools"></div>');
		controls.append( $("<div style='margin-top:1em'>Tools</div>"));
		controls.append(controlTools);
	
		// rightsize
		var rightsizeTool = $('<div title="rightsize" class="webleau_tool"><span class="glyphicon glyphicon-leaf" aria-hidden="true"></span></div>');
		controlTools.append( rightsizeTool );
		rightsizeTool.click( function() {
			nodeKeys = Object.keys(nodes);
			for( var i=0; i<nodeKeys.length; ++i ) {
				nodes[nodeKeys[i]].fitSize();
			}
		});

		// reset
		var resetTool = $('<div title="reset" class="webleau_tool"><span class="glyphicon glyphicon-move" aria-hidden="true"></span></div>');
		controlTools.append( resetTool );
		resetTool.click( function() {
			winScaleSlider.val(1).trigger('input');
			layoutScaleSlider.val(1).trigger('input');
			centrePage();
		});

		/* CONTROLS: load/save */
		var controlIO = $('<div class="webleau_controls_tools"></div>');
		var ioTextarea = $('<textarea class="normal-paste" placeholder="save/load: hit save and copy this, or paste in here and hit load" style="width: 100%; height: 10%;" id="webleau_io"></textarea>');
		controls.append( $("<div style='margin-top:1em'>Upload/Download</div>"));
		controls.append( ioTextarea );
		var downloadTool = $('<div title="download" class="webleau_tool"><span class="glyphicon glyphicon-download" aria-hidden="true"></span></div>');
		controlIO.append( downloadTool );
		var uploadTool = $('<div title="upload" class="webleau_tool"><span class="glyphicon glyphicon-upload" aria-hidden="true"></span></div>');
		controlIO.append( uploadTool );
		controls.append(controlIO);
		downloadTool.click( function() {
			var layout = getLayout();
			ioTextarea.val( JSON.stringify( layout ) );
			ioTextarea.select();
		});
		uploadTool.click( function() {
			var layout = JSON.parse( ioTextarea.val() );
			if( !layout ) {
				alert( "LOADING ERROR. Rewind tape and try again.");
				return;
			}
	
			setLayout(layout);
		});
		

		/* end controls */
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
		//var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[-;&a-z\d%_.~+=]*)?(\#[-a-z\d_]*)?$/i;
		var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?[^ ]*/;
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

	nodesLayer.focus();
	nodesLayer.on('paste', function(event) {
		// if we are focused on a normal-paste element just skip this handler
		if( $('.normal-paste:focus').length ) { return; }
		// nb need to stop this applying to textarea and input
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var json = clipboardData.getData('application/json');
		var nodeData = {
			id: uuid(),
			x: mouseX,
 			y: mouseY,
			width:  winWidth() /2/winScale/layoutScale,
			height: winHeight()/2/winScale/layoutScale,
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
				newNode.fitSize();
				return;
			}
		}

		var text = clipboardData.getData( 'text/plain' );
		if( validURL(text) ) {
			nodeData.title = "Pasted URL";
			nodeData.text = text+"\n(will lookup metadata in a mo...)";
			nodeData.edit = false;
			var newNode = addNode(nodeData);
			newNode.fitSize();
			$.ajax({
				method: "GET",
				data: { url: text },
				url: "oembed.php"
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
			var newNode = addNode(nodeData);
			newNode.fitSize();
			return;
		}

		nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.edit = true;
		var newNode = addNode(nodeData);
		newNode.fitSize();
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
