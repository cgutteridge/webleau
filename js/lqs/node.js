


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
			()=>{ this.fitSize(); },
			true );
		this.registerAction(
			"reload",
			"RELOAD",
			()=>{ this.viewSpec().update(this); } );
		this.hideAction("reload");
		this.registerAction(
			"remove",
			"REMOVE",
			()=>{ 
				if( confirm( "Really remove?" ) ) {
					this.remove();
					this.lqs.updateAllPositions();
				}
			} );
		this.addDotFeature();
		this.addIconFeature();
		this.addFocusFeature();
		this.addTalmudFeature();
		this.addSquishFeature();
		this.addMetadataFeature();
	} // end Node constructor

	// all data should be modified via this function so it can be intercepted
	set(field, data ) {
		var path = field.split( /\./ );
		this.lqs.change( { action: 'node-alter', node: this.data.id, field: path, data: data } );
	}

	addCardToDisplay() {
		this.dom.outer = $('<div class="lqs_node"></div>').attr("data-node",this.data.id).addClass('lqs_card_class_'+this.data.type);
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

		this.dom.outer.dblclick( (e)=> { this.viewSpec().dblclick(this); return false; } );
		this.dom.title.dblclick( (e)=> { this.viewSpec().dblclickTitle(this); return false; } );

		// register UI hooks
		this.dom.outer.resizable({
			resize: this.resized.bind(this),
			stop: (event,ui)=>{ this.set( 'size' ,this.data.size) },
			handles: "w,sw,s,se,e"
		});
		this.dom.outer.draggable( { 
			scope: 'cards',
			containment: $('.lqs_nodes'),
			handle: ".lqs_node_title",
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			stop: (event,ui)=>{ this.set( 'pos' ,this.data.pos) },
			start: function() {
				this.dragStart = new LQS_Point( this.data.pos.x, this.data.pos.y );
				LQS.clearTextSelection();
			}.bind(this)
		});

		this.dom.outer.droppable( {
			scope: 'cards',
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});

		// text-selecting multiple nodes at once is ugly. Clear the selected range if we leave a node
		// while holding down the mouse.
		/*
		this.dom.outer.mouseout((e)=>{
			if( this.lqs.screenPosOnMouseDown ) {
				var realPos = this.realPos();
				var realSize = this.realSize();
				if( e.pageX-1<=realPos.x-realSize.width/2
				 || e.pageX+1>=realPos.x+realSize.width/2 
				 || e.pageY-1<=realPos.y-realSize.height/2 
				 || e.pageY+1>=realPos.y+realSize.height/2 ) {
					LQS.clearTextSelection();
				}
			}
			return true;
		});
		*/
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

	addTalmudFeature() {
		this.registerView({
			id: "talmud", 
			init: (node) => {
				node.registerAction(
					"talmud",
					"TALMUD",
					()=>{ node.setView( "talmud" ); } );

			},
			enter: (node) => { // enter
				node.dom.talmud = $('<div class="lqs_talmud"></div>');
				var talmudClose = $('<div class="lqs_talmud_close">X</div>');
				var talmudInner = $('<div class="lqs_talmud_inner"></div>');
				var talmudLeft = $('<div class="lqs_talmud_left"></div>');
				var talmudRight = $('<div class="lqs_talmud_right"></div>');
				let focusCard = $('<div class="lqs_talmud_card"></div>');
				node.dom.talmudTitle = $('<div class="lqs_talmud_title"></div>');
				node.dom.talmudContent = $('<div class="lqs_talmud_content"></div>');
				node.dom.talmud.append( talmudClose );
				node.dom.talmud.append( talmudInner );
				node.dom.talmud.append( talmudLeft );
				node.dom.talmud.append( talmudRight );
				focusCard.append( node.dom.talmudTitle );
				focusCard.append( node.dom.talmudContent );
				talmudInner.append( focusCard );
				$('body').append( node.dom.talmud );
				talmudClose.click( ()=>node.setView('main') );
				talmudInner.dblclick(()=>{ node.setView('main'); return false; } );
				node.hideAction( 'talmud' );
				$(window).bind( 'keyup.talmud', (e)=>{ if( e.which==27 ) { node.setView('main') } } );
				let linkIds = Object.keys(this.links);
				for( let i=0; i<linkIds.length; ++i ) {
					let link = this.links[linkIds[i]];
					let card = $('<div class="lqs_talmud_card"></div>');
					let cardNode;
					if( link.data.subject.node == this.data.id ) {
						if( link.data.label ) {
							talmudRight.append( $('<div class="lqs_talmud_link_label"></div>').text(link.data.label ) );;
						}
						talmudRight.append( card );
						cardNode = this.lqs.nodes[link.data.object.node];
					}
					if( link.data.object.node == this.data.id ) {
						if( link.data.label ) {
							talmudLeft.append( $('<div class="lqs_talmud_link_label"></div>').text("is "+link.data.label+" of" ) );
						}
						talmudLeft.append( card );
						cardNode = this.lqs.nodes[link.data.subject.node];
					}
					card.append( $('<div class="lqs_talmud_card_title"></div>').text( cardNode.viewSpec().title(cardNode) ) );
					card.append( cardNode.render() );
					card.click( ()=>{ 		
						this.setView( "main" );
						cardNode.setView( "talmud" );
						return false; // don't honour any links in the card!
					} );
				}
			},
			setTitle(node,text) {
				node.dom.talmudTitle.text(text);
			},
			setContent(node,content) {
				node.dom.talmudContent.empty().append( content );
			},
			leave: (node) => {
				node.dom.talmud.remove();
				node.showAction( 'talmud' );
				$(window).unbind( 'keyup.talmud' );
			},
			render: (node) => { 
				if( node.renderTalmud ) {
					return node.renderTalmud(); 
				} else {
					return node.viewSpec('main').render(node); 
				} 
			}
		});
	}

	addFocusFeature() {
		this.registerView({
			id: "focus", 
			init: (node) => {
				node.registerAction(
					"focus",
					"FOCUS",
					()=>{ node.setView( "focus" ); } );

			},
			enter: (node) => { // enter
				node.dom.focus = $('<div class="lqs_focus"></div>');
				var focusClose = $('<div class="lqs_focus_close">X</div>');
				var focusInner = $('<div class="lqs_focus_inner"></div>');
				node.dom.focusTitle = $('<div class="lqs_focus_title"></div>');
				node.dom.focusContent = $('<div class="lqs_focus_content"></div>');
				node.dom.focus.append( focusClose );
				node.dom.focus.append( focusInner );
				focusInner.append( node.dom.focusTitle );
				focusInner.append( node.dom.focusContent );
				$('body').append( node.dom.focus );
				focusClose.click( ()=>node.setView('main') );
				focusInner.dblclick(()=>{ node.setView('main'); return false; } );
				node.hideAction( 'focus' );
				$(window).bind( 'keyup.focus', (e)=>{ if( e.which==27 ) { node.setView('main') } } );
			},
			setTitle(node,text) {
				node.dom.focusTitle.text(text);
			},
			setContent(node,content) {
				node.dom.focusContent.empty().append( content );
			},
			leave: (node) => {
				node.dom.focus.remove();
				node.showAction( 'focus' );
				$(window).unbind( 'keyup.focus' );
			},
			render: (node) => { 
				if( node.renderFocus ) {
					return node.renderFocus(); 
				} else {
					return node.viewSpec('main').render(node); 
				} 
			}
		});
	}

	addMetadataFeature() {
		this.registerView({
			id: "meta", 
			init: (node) => {
				node.registerAction(
					"meta",
					"METADATA",
					()=>{ node.setView( "meta" ); },
					true );
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
				node.data.icon.size = { width: 64, height: 64 };
		
				node.dom.icon = $("<img class='lqs_node_icon' />").attr("data-node",node.data.id);
				node.dom.icon.hide();
				node.lqs.nodesLayer.append( node.dom.icon );
		
				node.dom.icon_label_id = "icon_label_"+LQS.uuid();
 				node.dom.icon_text = $(document.createElementNS("http://www.w3.org/2000/svg","text"))
					.addClass( "lqs_icon_text" )
					.attr( "id", node.dom.icon_label_id )
				this.lqs.labelsLayer.append( node.dom.icon_text );

				LQS.noDragClick( node.dom.icon, function() {
					node.setView('main');
				}.bind(node) );
		
				node.dom.icon.draggable( { 
					scope: 'cards',
					containment: $('.lqs_nodes'),
					opacity: 0.8,
					scroll: true,
					drag: node.dragged.bind(node),
					start: function() {
						node.dragStart = new LQS_Point( node.data.pos.x, node.data.pos.y );
						LQS.clearTextSelection();
					}.bind(node)
				});
		
				node.dom.icon.droppable( {
					scope: 'cards',
					hoverClass: "drop-hover",
					tolerance: "pointer",
					drop: (event,ui)=>{ node.linkDrop(event,ui) }
				});
		
				node.registerAction(
					"icon",
					"ICON",
					()=>{ node.setView( "icon" ); },
					true );
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
					node.dom.icon.attr('src',node.data.icon.url );
					node.dom.icon.load( ()=>{ node.updatePosition(); } );
				} else {
					node.dom.icon.css('background-image', `linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(127,127,127,0.7)), url(${LQS.logo()})` );
				} 
			},
			leave: (node) => { 
				node.dom.outer.show();
				node.dom.icon.hide();
				node.dom.icon_text.hide();
			},
			updatePosition: (node) => {
				var baseFontSize = 16;
				var realPos = node.realPos();
				var realSize = node.realSize();
				node.dom.icon.css('max-width', realSize.width+"px" );
				node.dom.icon.css('max-height', realSize.height+"px" );
				var w = node.dom.icon.width();	
				var h = node.dom.icon.height();	
				node.dom.icon.css('left',realPos.x-w/2 );
				node.dom.icon.css('top', realPos.y-h/2 );
				node.dom.icon_text.attr('x', realPos.x );
				node.dom.icon_text.attr('y', realPos.y + node.dom.icon.height()/2 +baseFontSize*node.lqs.layoutScale);
				node.dom.icon_text.css('font-size',(baseFontSize*node.lqs.layoutScale)+"px"); 
			},
			realSize: (node) => {
				return { width: node.data.icon.size.width*node.lqs.layoutScale, height: node.data.icon.size.height*node.lqs.layoutScale };
			}
		});
	}

	addSquishFeature() {
		this.registerView({
			id: "squish",
			init: (node) => {
				if( !node.data.squish ) { node.data.squish = {}; }
		
				node.dom.squish = $("<div class='lqs_node_squish'></div>").attr("data-node",node.data.id);
				node.dom.squish.hide();
				node.lqs.nodesLayer.append( node.dom.squish );
		
				LQS.noDragClick( node.dom.squish, function() {
					node.setView('main');
				}.bind(node) );
		
				node.dom.squish.draggable( { 
					scope: 'cards',
					containment: $('.lqs_nodes'),
					opacity: 0.8,
					scroll: true,
					drag: node.dragged.bind(node),
					start: function() {
						node.dragStart = new LQS_Point( node.data.pos.x, node.data.pos.y );
						LQS.clearTextSelection();
					}.bind(node)
				});
		
				node.dom.squish.droppable( {
					scope: 'cards',
					hoverClass: "drop-hover",
					tolerance: "pointer",
					drop: (event,ui)=>{ node.linkDrop(event,ui) }
				});
		
				node.registerAction(
					"squish",
					"SQUISH",
					()=>{ node.setView( "squish" ); },
					true );
			},
			destroy: (node) => {
				node.dom.squish.remove();
			},
			setTitle: (node,title ) => { node.dom.squish.text( title ); },
			enter: (node) => { 
				node.dom.outer.hide();
				node.dom.squish.show();
			},
			leave: (node) => { 
				node.dom.outer.show();
				node.dom.squish.hide();
			},
			updatePosition: (node) => {
				var realPos = node.realPos();
				var realSize = node.realSize();
				node.dom.squish.css('left',realPos.x-realSize.width/2 );
				node.dom.squish.css('top', realPos.y-realSize.height/2 );
			},
			realSize: (node) => {
				return { width: node.dom.squish.outerWidth(), height: node.dom.squish.outerHeight() };
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
				this.lqs.labelsLayer.append( node.dom.dot_text );

				node.dom.dot_svg.draggable( { 
					scope: 'cards',
					containment: $('.lqs_nodes'),
					opacity: 0.8,
					scroll: true,
					drag: node.dragged.bind(node),
					start: function() {
						node.dragStart = new LQS_Point( node.data.pos.x, node.data.pos.y );
						LQS.clearTextSelection();
					}.bind(node)
				});
		
				LQS.noDragClick( node.dom.dot_svg, function() {
					node.setView('main');
				}.bind(node) );
		
				node.dom.dot_svg.droppable( {
					scope: 'cards',
					hoverClass: "drop-hover",
					tolerance: "pointer",
					drop: (event,ui)=>{ node.linkDrop(event,ui) }
				});

				node.registerAction(
					"dot",
					"DOT",
					()=>{ node.setView( "dot" ); },
					true );
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
		this.lqs.addLink( linkData );
		// reset location without causing event, an event will be sent by the end of dragging
		subjectNode.data.pos = { x: subjectNode.dragStart.x, y: subjectNode.dragStart.y };
		subjectNode.updatePosition();
		subjectNode.updateLinksPosition();
	}

	registerView( params ) {
		this.views[params.id] = new LQS_ViewSpec( params );
		this.views[params.id].init(this); // add any furniture
	}

	viewSpec( viewID = null) {
		if( viewID == null ) { viewID = this.data.view; }
		if( !this.views[viewID] ) {
			console.log( "UNKNOWN CARD VIEW: "+viewID );
			return;
		}
		return this.views[viewID];
	}

	setView( view, doLeave = true ) {
		
		if( doLeave ) {
			this.viewSpec().leave(this);
		}
		this.lqs.deregisterCardSeeds( this.data.id );

		this.set('view',view);

		var viewSpec = this.viewSpec();
		viewSpec.enter(this);

		this.rerender();

		viewSpec.update(this); // run an async commands

		this.updatePosition();
		this.updateLinksPosition();
	}

	rerender() {
		var viewSpec = this.viewSpec();
		viewSpec.setContent( this, viewSpec.render(this));

		var title = viewSpec.title(this);
		if( title === null || title === undefined ) { title = ''; }
		viewSpec.setTitle( this, title );

		if( !this.data.size ||  this.data.size.width === undefined ) {
			this.set( 'size',{} );
			this.fitSize();
		}
	}

	showMenu() {
		this.dom.menu.show();
		var p = this.dom.outer.position();
		this.dom.menu.css( 'left', p.left-10 );
		this.dom.menu.css( 'top', p.top-10 );
		this.dom.menu.empty();
		var normalActions = $('<div></div>');
		var devActions = $('<div></div>');
		this.dom.menu.append( normalActions );
		this.dom.menu.append( devActions );

		for( var i=0; i<this.actions.length; ++i ) {
			let action= this.actions[i];
			if( action.visible && (!action.dev || this.lqs.devMode )) {
				let item = $('<div></div>').text((action.dev?"☸ ":"")+action.label).addClass( "lqs_card_menu_item" );
				if( action.active ) {
					item.click( (e) => {
						action.fn(); 
						this.dom.menu.hide();
					} );
				} else {
					item.addClass( "lqs_card_menu_item_disabled" );
				}
				if( action.dev ) {
					devActions.append( item );
				} else {
					normalActions.append( item );
				}
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

		var hDelta  = ui.size.height - ui.originalSize.height;
		var adjustedHeight =  ui.originalSize.height + 2*hDelta;

		// nb. writing without event, must set an event at the end
		this.data.size = {
			width: Math.max(50,adjustedWidth/this.lqs.layoutScale),
			height: Math.max(50,adjustedHeight/this.lqs.layoutScale) 
		};

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

		// nb. writing without event, must set an event at the end
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
		this.set('size',{
			width: Math.max( 64, (this.dom.outer.width() )/this.lqs.layoutScale+10),
			height: Math.max( 64, (this.dom.outer.height())/this.lqs.layoutScale+10) });
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

	registerAction( id, label, fn, dev=false ) {
		var action = { id: id, label: label, fn: fn, active: true, visible: true, dev: dev };
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
		this.lqs.change( { action: 'node-remove', 'node':this.data.id } );
	}

	static makeSeed(opts) {
		var seed = {};
		seed.sourceCard = opts.sourceCard;
		seed.sourceCardAction = opts.sourceCardAction;
		return seed;
	}

	reveal() {
		this.lqs.change( { action: 'node-focus', 'node':this.data.id } );
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
		this.lqs.addNode(nodeData);
		var comment = this.lqs.nodes[nodeData.id];
		comment.reveal();
		var linkData = {
			subject: { node: comment.data.id },
			object: { node: this.data.id },
			label: "comments",
			id: LQS.uuid() 
		};
		this.lqs.addLink( linkData );
		//subjectNode.updateLinksPosition();
		comment.setView('edit');
	}

	// default double click behavior for all views of this card type
	dblclick() {
		this.setView( 'focus' );
	}
	dblclickTitle() {
		if( this.data.icon && this.data.icon.url ) {
			this.setView( 'icon' );
		} else {
			this.setView( 'squish' );
		}
	}

	fixup( element ) {
/*
		element.find( 'a' ).each( (i,e)=>{
			e = $(e);
			var href = e.attr( 'href' );
			e.attr("target","_blank");
			if( href && href != this.data.id ) {
				let seed = $('<div class="lqs_seed lqs_hidden_seed"></div>');
				seed.insertAfter( e );
				this.lqs.attachSeed( seed, LQS_NodeTypes['embed'].makeSeed({
					sourceCard:this,
					sourceCardAction:'main',
					from: this,
					url: href
				}));
			}
		});
*/
		element.find( 'script' ).remove();
		element.find( 'img' ).css("max-width","100%").css('max-height','100%').css('height','auto');
		//element.find( 'iframe' ).css("min-width","100%").css("min-height","100%");
		//element.find( 'img').bind('load', ()=>{ this.fitSize(); } );
		return element;
	}

} // End Node

