


class LQS_Node {

	constructor( nodeData, lqs ) {

		this.lqs = lqs;
		this.data = nodeData;
		this.links = {};
		this.dom = {};
		this.actions = [];
		this.actionsByID = {};
		this.views = {};
		this.dragStart;
		if( !this.data.size ) { this.data.size = {}; }
		if( !this.data.pos ) { this.data.pos = {}; }

		// dom
		this.borderSize = 4;
		this.dom.outer = $('<div class="lqs_node"></div>').attr("data-node",this.data.id);
		this.dom.title = $('<div class="lqs_node_title"></div>');
		this.dom.titleLeft = $('<div class="lqs_node_title_left"></div>');
		this.dom.titleRight = $('<div class="lqs_node_title_right"></div>');
		this.dom.titleText = $('<div class="lqs_node_title_text"></div>');
		this.dom.content = $('<div class="lqs_node_content"></div>');

		this.registerView( 
			"main",
			() => { // enter
				// revert size
				if( this.data.mainsize && this.data.mainsize.width !== undefined ) {
					this.data.size = { width: this.data.mainsize.width, height: this.data.mainsize.height }
				}
				this.setTitleText( this.data.title );
				this.dom.content.empty();
				this.dom.content.append(this.render());
				this.update();  // anything async for this card?
				if( !this.data.size ||  this.data.size.width === undefined ) {
					this.data.size = {};
					this.fitSize();
				}
				this.hideAction( 'main' );
			},
			() => { // leave
				// cache the main width & height for when we come back
				this.data.mainsize = {
					width: this.data.size.width,
					height: this.data.size.height }
				this.showAction( 'main' );
			}
		);

		this.registerAction(
			"autosize",
			"AUTOSIZE",
			()=>{ this.fitSize(); } );
		this.registerAction(
			"main",
			"CONTENT",
			()=>{ this.setView( "main" ); } );
		this.registerAction(
			"reload",
			"RELOAD",
			()=>{ this.update(); } );
		this.hideAction("reload");
		this.registerAction(
			"remove",
			"REMOVE",
			()=>{ 
				if( confirm( "Really delete?" ) ) {
					this.remove();
					this.lqs.updateAllPositions();
				}
			} );

		this.dom.menuTool = $('<div class="lqs_tool">☰</div>');
		this.dom.titleLeft.append( this.dom.menuTool );
		this.dom.menuTool.mouseover( function() { this.showMenu(); }.bind(this));
		this.dom.menu = $('<div class="lqs_card_menu"></div>').hide();
		this.lqs.nodesLayer.append( this.dom.menu );

		this.dom.outer.append( this.dom.title );
		this.dom.title.append( this.dom.titleLeft );
		this.dom.title.append( this.dom.titleRight );
		this.dom.title.append( this.dom.titleText );
		this.dom.outer.append( this.dom.content );
		this.lqs.nodesLayer.append( this.dom.outer );

		// double click on node to add a comment
		this.dom.outer.dblclick(function() {
			var pt = this.lqs.toVirtual( this.lqs.mouse );
			var nodeData = {
				id: LQS.uuid(),
				pos: {
					x: this.data.pos.x + this.data.size.width/2,
 					y: pt.y
				},
				title: "",
				text: "",
				type: 'text',
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
			comment.setView('edit');
			return false; // don't also run on background
		}.bind(this));

		// register UI hooks
		this.dom.outer.resizable({
			resize: this.resized.bind(this),
			handles: "w,sw,s,se,e"
		});
		this.dom.outer.draggable( { 
			containment: $('.lqs_nodes'),
			handle: ".lqs_node_title",
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStart = new LQSPoint( this.data.pos.x, this.data.pos.y );
			}.bind(this)
		});

		this.dom.outer.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});

		// don't do the zoom inside one of these
		/*
		this.dom.outer.bind('wheel mousewheel', function(e){
			e.stopPropagation();
		});
*/
		this.addDotFeature();
		this.addIconFeature();
		this.addMetadataFeature();
	} // end Node constructor

	// this runs after the constructor, once all the views are loaded
	init() {
		// ensure we're in a view
		this.views["main"]["enter"]();
		if( !this.data.view ) { this.data.view = 'main'; }
		this.setView( this.data.view );
	}

	addMetadataFeature() {

		this.registerView(
			"meta", 
			() => { // enter
				this.dom.content.html( LQS.dataToHTML( this.data ) );
				this.fitSize();
				this.hideAction( 'meta' );
			},
			() => {
				this.showAction( 'meta' );
			}
		);

		this.registerAction(
			"meta",
			"METADATA",
			()=>{ this.setView( "meta" ); } );

	}

	addIconFeature() {
		this.data.icon = {};

		this.data.icon.size = { width: 32, height: 32 };

		this.dom.icon = $("<div class='lqs_node_icon'></div>").attr("data-node",this.data.id);
		this.dom.icon.width( this.data.icon.size.width );
		this.dom.icon.height( this.data.icon.size.height );
		this.dom.icon.hide();
		this.lqs.nodesLayer.append( this.dom.icon );

		this.registerView( 
			"icon",
			() => { // enter
				this.dom.outer.hide();
				this.dom.icon.show();
				this.dom.dotText.show();
				if( this.data.icon.url ) {
					this.dom.icon.css('background-image', `url(${this.data.icon.url})` );
				}
			},
			() => { // leave
				this.dom.outer.show();
				this.dom.icon.hide();
				this.dom.dotText.hide();
			}
		);

		this.registerAction(
			"icon",
			"ICONIFY",
			()=>{ this.setView( "icon" ); } );

		LQS.noDragClick( this.dom.icon, function() {
			this.setView('main');
		}.bind(this) );

		this.dom.icon.draggable( { 
			containment: $('.lqs_nodes'),
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStart = new LQSPoint( this.data.pos.x, this.data.pos.y );
			}.bind(this)
		});

		this.dom.icon.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});
	}

	addDotFeature() {
		this.data.dot = {};
		this.data.dot.radius = 5;

		this.dom.dot_id = "dot_"+LQS.uuid();
 		this.dom.dot = $(document.createElementNS("http://www.w3.org/2000/svg","circle"));
		this.dom.dot.attr("id",this.dom.dot_id);
		this.dom.dot.attr( "r", this.data.dot.radius );
		this.dom.dotsvg = $(document.createElementNS("http://www.w3.org/2000/svg","svg")).addClass('lqs_dot').attr("data-node",this.data.id);
		this.dom.dotsvg.append( this.dom.dot );
		this.lqs.nodesLayer.append( this.dom.dotsvg );

		this.dom.dot_label_id = "link_from_"+LQS.uuid();
 		var dotText = document.createElementNS("http://www.w3.org/2000/svg","text");
		dotText.setAttribute( "class", "lqs_dot_text" );
		dotText.id = this.dom.dot_label_id;
		dotText.appendChild( document.createTextNode( "XXX" ));
		var labelsG = document.getElementById('svg_labels');
		labelsG.appendChild( dotText );
		this.dom.dotText = $(dotText);

		this.registerView( 
			"dot",
			() => { // enter
				this.dom.outer.hide();
				this.dom.dotsvg.show();
				this.dom.dotText.show();
			},
			() => { // leave
				this.dom.outer.show();
				this.dom.dotsvg.hide();
				this.dom.dotText.hide();
			}
		);

		this.registerAction(
			"dot",
			"MINIFY",
			()=>{ this.setView( "dot" ); } );

		this.dom.dotsvg.draggable( { 
			containment: $('.lqs_nodes'),
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStart = new LQSPoint( this.data.pos.x, this.data.pos.y );
			}.bind(this)
		});

		LQS.noDragClick( this.dom.dotsvg, function() {
			this.setView('main');
		}.bind(this) );

		this.dom.dotsvg.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});
	}

	// handle another node being dropped onto this node.
	linkDrop(event,ui) {
		var subjectNode = this.lqs.nodes[ui.draggable.attr('data-node')];
		var linkData = {
			subject: { node: ui.draggable.attr('data-node') },
			object: { node: this.data.id },
			label: "",
			id: LQS.uuid() 
		};
		var newLink = this.lqs.addLink( linkData );
		subjectNode.data.pos.x = subjectNode.dragStart.x;
		subjectNode.data.pos.y = subjectNode.dragStart.y;
		subjectNode.updatePosition();
		subjectNode.updateLinksPosition();
	}

	setTitleText( text ) {
		if( text === null || text === undefined ) { text = ''; }
		this.dom.dotText.text( text );
		this.dom.titleText.text( text );
		if( text == "" ) {
			this.dom.title.addClass("lqs_node_empty_title");
		} else {
			this.dom.title.removeClass("lqs_node_empty_title");
		}
	}

	registerView( id, enter, leave ) {
		this.views[id] = { enter: enter, leave: leave };
	}

	setView( view ) {
		if( !this.views[view] ) {
			console.log( "UNKNOWN CARD VIEW: "+view );
			return;
		}
		this.reset();
		this.views[this.data.view].leave();
		this.data.view = view;
		this.views[view].enter();
		this.updatePosition();
		this.updateLinksPosition();
	}

	showMenu() {
		this.dom.menu.show();
		var p = this.dom.outer.position();
		this.dom.menu.css( 'left', p.left-10 );
		this.dom.menu.css( 'top', p.top-10 );
		this.dom.menu.empty();

		for( var i=0; i<this.actions.length; ++i ) {
			let action= this.actions[i];
			if( action.visible ) {
				let item = $('<div></div>').text(action.label).addClass( "lqs_card_menu_item" );
				if( action.active ) {
					item.click( (e) => {
						action.fn(); 
						this.dom.menu.hide();
					} );
				} else {
					item.addClass( "lqs_card_menu_item_disabled" );
				}
				this.dom.menu.append( item );
			}
		}
		this.dom.menu.mouseleave( (e)=>{ this.dom.menu.hide(); } );
	}

	render() {
		return $("<div>This node has no type. Can't render content.</div>");
	}

	/* method to subclass. this is called to trigger ajax or other updates and unlike
	 * render can alter the contents of the DOM directly.
	 */
	update() {
	}


	reset() {
		this.dom.outer.removeClass('lqs_node_notitle');
		this.dom.content.html( '' );
	}

	resized(event, ui) { 

		var wDelta  = ui.size.width  - ui.originalSize.width;
		var adjustedWidth  = ui.originalSize.width  + 2*wDelta;
		this.data.size.width  = Math.max(50,adjustedWidth/this.lqs.layoutScale);

		var hDelta  = ui.size.height - ui.originalSize.height;
		var adjustedHeight =  ui.originalSize.height + 2*hDelta;
		this.data.size.height = Math.max(50,adjustedHeight/this.lqs.layoutScale);

		this.updatePosition();
		this.updateLinksPosition();
	}

	dragged(event, ui) { 
		ui.position.left = Math.max( 10, ui.position.left );
		ui.position.top =  Math.max( 10, ui.position.top );

		var realSize = this.realSize();
		var realTopLeft = new LQSPoint( 
			(ui.position.left + realSize.width/2 ),
			(ui.position.top  + realSize.height/2 ) );
		this.data.pos = this.lqs.toVirtual( realTopLeft );

		this.updatePosition();
		this.updateLinksPosition();
	}

	updatePosition() {
		var baseFontSize = 10;
		var realPos = this.realPos();
		var realSize = this.realSize();
		if( this.data.view == 'icon' || this.data.view == 'dot' ) {
			this.dom.dotText.attr('x', realPos.x );
			this.dom.dotText.attr('y', realPos.y + realSize.height/2+baseFontSize*this.lqs.layoutScale);
			this.dom.dotText.css('font-size',(baseFontSize*this.lqs.layoutScale)+"px"); 
		}
		if( this.data.view == 'icon' ) {
			this.dom.icon.css('left',realPos.x-realSize.width/2 );
			this.dom.icon.css('top', realPos.y-realSize.height/2 );
			return;
		}
		if( this.data.view == 'dot' ) {
			let realRadius = this.data.dot.radius*this.lqs.layoutScale
			this.dom.dotsvg.css('left', realPos.x-realRadius );
			this.dom.dotsvg.css('top',  realPos.y-realRadius );
			this.dom.dot.attr('r',  realRadius );
			this.dom.dot.attr('cx', realRadius );
			this.dom.dot.attr('cy', realRadius );
			this.dom.dotsvg.attr('width',  realRadius*2 );
			this.dom.dotsvg.attr('height', realRadius*2 );
			return;
		}
		this.dom.outer.css('left',realPos.x-realSize.width/2 );
		this.dom.outer.css('top', realPos.y-realSize.height/2 );
		this.dom.outer.css('width', realSize.width );
		this.dom.outer.css('height',realSize.height );
		var titleHeight = (18*this.lqs.layoutScale);
		var fontHeight  = (16*this.lqs.layoutScale);
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
		this.dom.outer.css('max-width', (LQS.winWidth()/2)+"px");
		this.dom.outer.css('max-height',(LQS.winHeight()*3/4)+"px");
		this.dom.outer.find( '.lqs_tool' ).addClass('noTools');
		this.data.size.width =  (this.dom.outer.width() )/this.lqs.layoutScale+10;
		this.data.size.height = (this.dom.outer.height())/this.lqs.layoutScale+10;
		this.dom.outer.find( '.lqs_tool' ).removeClass('noTools');
		this.dom.outer.css('max-width','none');
		this.dom.outer.css('max-height','none');
		this.updatePosition();
		this.updateLinksPosition();
	}

	// real means actual pixels not the place on the conceptual layout
	realPos() {
		return new LQSPoint(
			this.data.pos.x*this.lqs.layoutScale+this.lqs.offset.x,
			this.data.pos.y*this.lqs.layoutScale+this.lqs.offset.y );
	}

	// the size of the node in pixels in the current scale
	realSize() {
		if( this.data.view == 'icon' ) {
			return { width: this.data.icon.size.width, height: this.data.icon.size.height };
		}
		if( this.data.view == 'dot' ) {
			return {
				width:  this.data.dot.radius*2*this.lqs.layoutScale,
				height: this.data.dot.radius*2*this.lqs.layoutScale };
		}
		return {
			width:  this.data.size.width *this.lqs.layoutScale,
			height: this.data.size.height*this.lqs.layoutScale };
	}

	realFullSize() {
		var realSize = this.realSize();
		realSize.width  += this.borderSize*2;
		realSize.height += this.borderSize*2;
		return realSize;
	}

	// find the point in a block nearest to the given point
	nearestPointTo( pt ) {
		// find the intersection with each edge
		var realPos = this.realPos();
		var realFullSize = this.realFullSize();

		var tl = new LQSPoint( realPos.x - realFullSize.width/2, realPos.y - realFullSize.height/2 )
		var tr = new LQSPoint( realPos.x + realFullSize.width/2, realPos.y - realFullSize.height/2 )
		var bl = new LQSPoint( realPos.x - realFullSize.width/2, realPos.y + realFullSize.height/2 )
		var br = new LQSPoint( realPos.x + realFullSize.width/2, realPos.y + realFullSize.height/2 )

		var lines = [
			new LQS_Line( tl, tr ),
			new LQS_Line( tr, br ),
			new LQS_Line( bl, br ),
			new LQS_Line( tl, bl )
		];
		var pokeyLine = new LQS_Line( pt, this.realPos() );
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

	registerAction( id, label, fn ) {
		var action = { id: id, label: label, fn: fn, active: true, visible: true };
		this.actions.push( action );
		this.actionsByID[id] = action;
	}
	showAction( id ) {
		if( this.actionsByID[id] ) {
			this.actionsByID[id].visible = true;
		} else {
			console.log( "attempted to show undefined action "+id );
		}
	}
	hideAction( id ) {
		if( this.actionsByID[id] ) {
			this.actionsByID[id].visible = false;
		} else {
			console.log( "attempted to hide undefined action "+id );
		}
	}
	enableAction( id ) {
		if( this.actionsByID[id] ) {
			this.actionsByID[id].active = true;
		} else {
			console.log( "attempted to enable undefined action "+id );
		}
	}
	disableAction( id ) {
		if( this.actionsByID[id] ) {
			this.actionsByID[id].active = false;
		} else {
			console.log( "attempted to disable undefined action "+id );
		}
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
		this.dom.dotsvg.remove();
		this.dom.dotText.remove();
		this.dom.menu.remove();
	}

	static makeSeed(opts) {
		var seed = {};
		seed.sourceCard = opts.sourceCard;
		seed.sourceCardAction = opts.sourceCardAction;
		return seed;
	}

	reveal() {
		this.lqs.focusPage( this.data.pos );
	}

} // End Node

/*








		if( this.data.html ) {
			this.dom.content.empty();
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
		}
		if( this.data.meta && this.data.meta.source && this.data.meta.source.URL ) {
			var span = $('<div style="text-align:right">- </div>');
			this.dom.content.append( span );
			span.append( $('<a>Source</a>').attr( 'href',this.data.meta.source.URL));
		}
		this.dom.content.find( 'a' ).attr("target","_blank");
		this.dom.content.find( 'img,iframe' ).css("max-width","100%");
		//this.dom.content.find( 'img,iframe' ).css("max-height","100%");
*/

