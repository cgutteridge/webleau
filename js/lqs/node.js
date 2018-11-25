


class LQS_Node {

	constructor( nodeData, lqs ) {

		this.lqs = lqs;
		this.data = nodeData;
		if( ! this.data.id ) { this.data.id = LQS.uuid(); }
		this.links = {};
		this.dom = {};
		this.actions = [];
		this.actionsByID = {};
		this.views = {};
		this.dragStart;
		if( !this.data.size ) { this.data.size = {}; }
		if( !this.data.pos ) { this.data.pos = {}; }

		// dom
		this.borderSize = 2;

		this.registerView({
			id: "main",
			enter: (node) => { // enter
				// revert size
				if( node.data.mainsize && node.data.mainsize.width !== undefined ) {
					node.data.size = { width: node.data.mainsize.width, height: node.data.mainsize.height }
				}
				node.hideAction( 'main' );
			},
			leave: (node) => { // leave
				// cache the main width & height for when we come back
				node.data.mainsize = {
					width: node.data.size.width,
					height: node.data.size.height }
				node.showAction( 'main' );
			},
			render: (node) => { return node.render() },
			init: (node) => { node.addCardToDisplay() },
			destroy: (node) => { node.removeCardFromDisplay() },
			update: (node) => { node.update(); }
		});

		this.registerAction(
			"main",
			"DEFAULT VIEW",
			()=>{ this.setView( "main" ); } );
		this.registerAction(
			"autosize",
			"AUTOSIZE",
			()=>{ this.fitSize(); } );
		this.registerAction(
			"reload",
			"RELOAD",
			()=>{ this.viewSpec().update(this); } );
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
		this.addDotFeature();
		this.addIconFeature();
		this.addMetadataFeature();
	} // end Node constructor

	addCardToDisplay() {
		this.dom.outer = $('<div class="lqs_node"></div>').attr("data-node",this.data.id);
		this.dom.title = $('<div class="lqs_node_title"></div>');
		this.dom.titleLeft = $('<div class="lqs_node_title_left"></div>');
		this.dom.titleRight = $('<div class="lqs_node_title_right"></div>');
		this.dom.titleText = $('<div class="lqs_node_title_text"></div>');
		this.dom.content = $('<div class="lqs_node_content"></div>');

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
		this.dom.outer.dblclick( ()=>{ this.addLinkedComment(); return false; } );
		this.dom.title.dblclick( ()=>{ this.setView("icon"); return false; } );

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
				this.dragStart = new LQS_Point( this.data.pos.x, this.data.pos.y );
			}.bind(this)
		});

		this.dom.outer.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});
	}

	removeCardFromDisplay() {
		this.dom.outer.remove();
		this.dom.menu.remove();
	}

	// this runs after the constructor, once all the views are loaded
	init() {
		if( !this.data.view ) { this.data.view = 'main'; }
		this.setView( this.data.view, false );
	}

	addMetadataFeature() {

		this.registerView({
			id: "meta", 
			init: (node) => {
				node.registerAction(
					"meta",
					"METADATA",
					()=>{ node.setView( "meta" ); } );
			},
			enter: (node) => { // enter
				delete node.data.size;
				node.hideAction( 'meta' );
			},
			leave: (node) => {
				node.showAction( 'meta' );
			},
			render: (node) => { return LQS.dataToHTML( node.data ); }
		});


	}

	addIconFeature() {
		this.registerView({
			id: "icon",
			init: (node) => {
				if( !node.data.icon ) { node.data.icon = {}; }
				node.data.icon.size = { width: 32, height: 32 };
		
				node.dom.icon = $("<div class='lqs_node_icon'></div>").attr("data-node",node.data.id);
				node.dom.icon.width( node.data.icon.size.width );
				node.dom.icon.height( node.data.icon.size.height );
				node.dom.icon.hide();
				node.lqs.nodesLayer.append( node.dom.icon );
		
				node.dom.icon_label_id = "icon_label_"+LQS.uuid();
 				node.dom.icon_text = $(document.createElementNS("http://www.w3.org/2000/svg","text"))
					.addClass( "lqs_icon_text" )
					.attr( "id", node.dom.icon_label_id )
				var labelsG = $(document.getElementById('svg_labels'));
				labelsG.append( node.dom.icon_text );

				LQS.noDragClick( node.dom.icon, function() {
					node.setView('main');
				}.bind(node) );
		
				node.dom.icon.draggable( { 
					containment: $('.lqs_nodes'),
					opacity: 0.8,
					scroll: true,
					drag: node.dragged.bind(node),
					start: function() {
						node.dragStart = new LQS_Point( node.data.pos.x, node.data.pos.y );
					}.bind(node)
				});
		
				node.dom.icon.droppable( {
					hoverClass: "drop-hover",
					tolerance: "pointer",
					drop: (event,ui)=>{ node.linkDrop(event,ui) }
				});
		
				node.registerAction(
					"icon",
					"ICON",
					()=>{ node.setView( "icon" ); } );
			},
			destroy: (node) => {
				node.dom.icon.remove();
				node.dom.icon_text.remove();
			},
			setTitle: (node,title ) => { node.dom.icon_text.text( title ); },
			enter: (node) => { 
				node.dom.outer.hide();
				node.dom.icon.show();
				node.dom.icon_text.show();
				if( node.data.icon.url ) {
					node.dom.icon.css('background-image', `url(${node.data.icon.url})` );
				} else {
					node.dom.icon.css('background-image', `linear-gradient(to top, rgba(255,255,255,0.7), rgba(127,127,127,0.7)), url(${LQS.logo()})` );
				} 
			},
			leave: (node) => { 
				node.dom.outer.show();
				node.dom.icon.hide();
				node.dom.icon_text.hide();
			},
			updatePosition: (node) => {
				var baseFontSize = 10;
				var realPos = node.realPos();
				var realSize = node.realSize();
				node.dom.icon_text.attr('x', realPos.x );
				node.dom.icon_text.attr('y', realPos.y + realSize.height/2+baseFontSize*node.lqs.layoutScale);
				node.dom.icon_text.css('font-size',(baseFontSize*node.lqs.layoutScale)+"px"); 
				node.dom.icon.css('left',realPos.x-realSize.width/2 );
				node.dom.icon.css('top', realPos.y-realSize.height/2 );
			},
			realSize: (node) => {
				return { width: node.data.icon.size.width, height: node.data.icon.size.height };
			}
		});

	}

	addDotFeature() {
		this.registerView( {
			id: "dot",
			init: (node) => {
				if( !node.data.dot ) { node.data.dot = {}; }
				node.data.dot.radius = 5;
		
				node.dom.dot_id = "dot_"+LQS.uuid();
 				node.dom.dot = $(document.createElementNS("http://www.w3.org/2000/svg","circle"));
				node.dom.dot.attr("id",node.dom.dot_id);
				node.dom.dot.attr( "r", node.data.dot.radius );
				node.dom.dot_svg = $(document.createElementNS("http://www.w3.org/2000/svg","svg")).addClass('lqs_dot').attr("data-node",node.data.id);
				node.dom.dot_svg.append( node.dom.dot );
				node.lqs.nodesLayer.append( node.dom.dot_svg );
		
				node.dom.dot_label_id = "dot_label_"+LQS.uuid();
 				node.dom.dot_text = $(document.createElementNS("http://www.w3.org/2000/svg","text"))
					.addClass( "lqs_dot_text" )
					.attr( "id", node.dom.dot_label_id )
				var labelsG = $(document.getElementById('svg_labels'));
				labelsG.append( node.dom.dot_text );

				node.dom.dot_svg.draggable( { 
					containment: $('.lqs_nodes'),
					opacity: 0.8,
					scroll: true,
					drag: node.dragged.bind(node),
					start: function() {
						node.dragStart = new LQS_Point( node.data.pos.x, node.data.pos.y );
					}.bind(node)
				});
		
				LQS.noDragClick( node.dom.dot_svg, function() {
					node.setView('main');
				}.bind(node) );
		
				node.dom.dot_svg.droppable( {
					hoverClass: "drop-hover",
					tolerance: "pointer",
					drop: (event,ui)=>{ node.linkDrop(event,ui) }
				});

				node.registerAction(
					"dot",
					"DOT",
					()=>{ node.setView( "dot" ); } );
			},
			destroy: (node) => {
				node.dom.dot_svg.remove();
				node.dom.dot_text.remove();
			},
			setTitle: (node,title ) => { node.dom.dot_text.text( title ); },
			enter: (node) => {
				node.dom.outer.hide();
				node.dom.dot_svg.show();
				node.dom.dot_text.show();
			},
			leave: (node) => {
				node.dom.outer.show();
				node.dom.dot_svg.hide();
				node.dom.dot_text.hide();
			},
			updatePosition: (node) => {
				var baseFontSize = 10;
				var realPos = this.realPos();
				var realSize = this.realSize();
				this.dom.dot_text.attr('x', realPos.x );
				this.dom.dot_text.attr('y', realPos.y + realSize.height/2+baseFontSize*this.lqs.layoutScale);
				this.dom.dot_text.css('font-size',(baseFontSize*this.lqs.layoutScale)+"px"); 
				let realRadius = this.data.dot.radius*this.lqs.layoutScale
				this.dom.dot_svg.css('left', realPos.x-realRadius );
				this.dom.dot_svg.css('top',  realPos.y-realRadius );
				this.dom.dot.attr('r',  realRadius );
				this.dom.dot.attr('cx', realRadius );
				this.dom.dot.attr('cy', realRadius );
				this.dom.dot_svg.attr('width',  realRadius*2 );
				this.dom.dot_svg.attr('height', realRadius*2 );
			},
			realSize: (node) => {
				return {
					width:  this.data.dot.radius*2*this.lqs.layoutScale,
					height: this.data.dot.radius*2*this.lqs.layoutScale };
			}
		});
	}

	// handle another node being dropped onto this node.
	linkDrop(event,ui) {
		var subjectNode = this.lqs.nodes[ui.draggable.attr('data-node')];
		if( ! subjectNode ) {
			console.log( "Link Drop action failed - unknown node dropped:", ui.draggable.attr('data-node'), ui.draggable );
			return;
		}
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

	registerView( params ) {
		this.views[params.id] = new LQS_ViewSpec( params );
		this.views[params.id].init(this); // add any furniture
	}

	viewSpec() {
		if( !this.views[this.data.view] ) {
			console.log( "UNKNOWN CARD VIEW: "+this.data.view );
			return;
		}
		return this.views[this.data.view];
	}

	setView( view, doLeave = true ) {
		
		if( doLeave ) {
			this.viewSpec().leave(this);
		}

		this.data.view = view;

		var viewSpec = this.viewSpec();
		viewSpec.enter(this);

		this.rerender();

		viewSpec.update(this); // run an async commands

		this.updatePosition();
		this.updateLinksPosition();
	}

	rerender() {
		var viewSpec = this.viewSpec();
		this.dom.content.empty();
		this.dom.content.append( viewSpec.render(this));

		var title = viewSpec.title(this);
		if( title === null || title === undefined ) { title = ''; }
		viewSpec.setTitle( this, title );

		if( !this.data.size ||  this.data.size.width === undefined ) {
			this.data.size = {};
			this.fitSize();
		}
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

	// render the main content of this card
	render() {
		return $("<div>This card has no type. Can't render content.</div>");
	}

	/* method to subclass. this is called to trigger ajax or other updates and unlike
	 * render can alter the contents of the DOM directly.
	 */
	update() {
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
		var realTopLeft = new LQS_Point( 
			(ui.position.left + realSize.width/2 ),
			(ui.position.top  + realSize.height/2 ) );
		this.data.pos = this.lqs.toVirtual( realTopLeft );

		this.updatePosition();
		this.updateLinksPosition();
	}

	updatePosition() {
		this.viewSpec().updatePosition(this);
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
		this.data.size.width =  Math.max( 64, (this.dom.outer.width() )/this.lqs.layoutScale+10);
		this.data.size.height = Math.max( 64, (this.dom.outer.height())/this.lqs.layoutScale+10);
		this.dom.outer.find( '.lqs_tool' ).removeClass('noTools');
		this.dom.outer.css('max-width','none');
		this.dom.outer.css('max-height','none');
		this.dom.content.css('height','inherit');
		this.updatePosition();
		this.updateLinksPosition();
	}

	// real means actual pixels not the place on the conceptual layout
	realPos() {
		return new LQS_Point(
			this.data.pos.x*this.lqs.layoutScale+this.lqs.offset.x,
			this.data.pos.y*this.lqs.layoutScale+this.lqs.offset.y );
	}

	// the size of the node in pixels in the current scale
	realSize() {
		return this.viewSpec().realSize(this);
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

		var tl = new LQS_Point( realPos.x - realFullSize.width/2+1, realPos.y - realFullSize.height/2 )
		var tr = new LQS_Point( realPos.x + realFullSize.width/2+1, realPos.y - realFullSize.height/2 )
		var bl = new LQS_Point( realPos.x - realFullSize.width/2+1, realPos.y + realFullSize.height/2 )
		var br = new LQS_Point( realPos.x + realFullSize.width/2+1, realPos.y + realFullSize.height/2 )

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
	doAction( id ) {
		if( this.actionsByID[id] ) {
			this.actionsByID[id].fn();
		} else {
			console.log( "attempted to do undefined action "+id );
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
		for( let i=0;i<link_ids.length;++i ) {
			this.links[link_ids[i]].remove();
		}
		var view_ids = Object.keys(this.views);
		for( let i=0;i<view_ids.length;++i ) {
			let viewSpec = this.views[view_ids[i]];
			viewSpec.destroy(this);
		}	
		delete this.lqs.nodes[this.data.id];
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

	addLinkedComment() {
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
	}


} // End Node

