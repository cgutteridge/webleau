


class LQS_Node {

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

		this.dom.icon = $("<div class='lqs_node_icon'></div>").attr("data-node",this.data.id);
		this.data.iconWidth = 32;
		this.data.iconHeight = 32;
		this.dom.icon.width( this.data.iconWidth );
		this.dom.icon.height( this.data.iconHeight );
		this.dom.icon.hide();
		this.lqs.nodesLayer.append( this.dom.icon );

		this.dotRadius = 5;
		this.dom.dot_id = "dot_"+LQS.uuid();
 		this.dom.dot = $(document.createElementNS("http://www.w3.org/2000/svg","circle"));
		this.dom.dot.attr("id",this.dom.dot_id);
		this.dom.dot.attr( "r", this.dotRadius );
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

		this.views = {};
		this.registerView( 
			"main",
			() => { // enter
				// revert size
				if( this.data.mainWidth ) {
					this.data.width =  this.data.mainWidth;
					this.data.height = this.data.mainHeight;
				}
				this.setTitleText( this.data.title );
				this.dom.content.empty();
				this.dom.content.append(this.render());
				this.update();  // anything async for this card?
				if( !this.data.width ) {
					this.fitSize();
				}
				this.hideAction( 'main' );
			},
			() => { // leave
				// cache the main width & height for when we come back
				this.data.mainWidth = this.data.width;
				this.data.mainHeight = this.data.height;
				this.showAction( 'main' );
			}
		);
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
		this.registerView( 
			"icon",
			() => { // enter
				this.dom.outer.hide();
				this.dom.icon.show();
				this.dom.dotText.show();
				if( this.data.icon ) {
					this.dom.icon.css('background-image', `url(${this.data.icon})` );
				}
			},
			() => { // leave
				this.dom.outer.show();
				this.dom.icon.hide();
				this.dom.dotText.hide();
			}
		);


		this.actions = [];
		this.actionsByID = {};

		this.registerAction(
			"autosize",
			"AUTOSIZE",
			()=>{ this.fitSize(); } );
		this.registerAction(
			"icon",
			"ICONIFY",
			()=>{ this.setView( "icon" ); } );
		this.registerAction(
			"dot",
			"MINIFY",
			()=>{ this.setView( "dot" ); } );
		this.registerAction(
			"meta",
			"METADATA",
			()=>{ this.setView( "meta" ); } );
		this.registerAction(
			"main",
			"CONTENT",
			()=>{ this.setView( "main" ); } );
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


		LQS.noDragClick( this.dom.icon, function() {
			this.setView('main');
		}.bind(this) );

		LQS.noDragClick( this.dom.dotsvg, function() {
			this.setView('main');
		}.bind(this) );


	
		this.dom.outer.append( this.dom.title );
		this.dom.title.append( this.dom.titleLeft );
		this.dom.title.append( this.dom.titleRight );
		this.dom.title.append( this.dom.titleText );
		this.dom.outer.append( this.dom.content );
		this.lqs.nodesLayer.append( this.dom.outer );
		this.dom.outer.dblclick(function() {
			var pt = this.lqs.toVirtual( this.lqs.mouse );
			var nodeData = {
				id: LQS.uuid(),
				x: this.data.x+(this.data.width/2)+width/2,
 				y: pt.y,	
				title: "",
				width: width,
				height: height,
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

		// ensure we're in a view
		this.views["main"]["enter"]();
		if( !this.data.view ) { this.data.view = 'main'; }
		this.setView( this.data.view );

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
				this.dragStartX = this.data.x;
				this.dragStartY = this.data.y;
			}.bind(this)
		});
		this.dom.icon.draggable( { 
			containment: $('.lqs_nodes'),
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStartX = this.data.x;
				this.dragStartY = this.data.y;
			}.bind(this)
		});
		this.dom.dotsvg.draggable( { 
			containment: $('.lqs_nodes'),
			opacity: 0.8,
			scroll: true,
			drag: this.dragged.bind(this),
			start: function() {
				this.dragStartX = this.data.x;
				this.dragStartY = this.data.y;
			}.bind(this)
		});

		this.dom.outer.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});
		this.dom.icon.droppable( {
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.linkDrop(event,ui) }
		});
		this.dom.dotsvg.droppable( {
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
	} // end Node constructor

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
		subjectNode.data.x = subjectNode.dragStartX;
		subjectNode.data.y = subjectNode.dragStartY;
		subjectNode.updatePosition();
		subjectNode.updateLinksPosition();
	}

	setTitleText( text ) {
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
			this.dom.dotsvg.css('left',this.realX()-(this.dotRadius*this.lqs.layoutScale));
			this.dom.dotsvg.css('top', this.realY()-(this.dotRadius*this.lqs.layoutScale));
			this.dom.dot.attr('r', this.dotRadius*this.lqs.layoutScale);
			this.dom.dot.attr('cx', this.dotRadius*this.lqs.layoutScale);
			this.dom.dot.attr('cy', this.dotRadius*this.lqs.layoutScale);
			this.dom.dotsvg.attr('width', this.dotRadius*this.lqs.layoutScale*2);
			this.dom.dotsvg.attr('height', this.dotRadius*this.lqs.layoutScale*2);
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
			return this.dotRadius*2*this.lqs.layoutScale;
		}
		return this.data.width*this.lqs.layoutScale;
	}
	// the height of the node in pixels in the current scale
	realHeight() {
		if( this.data.view == 'icon' ) {
			return this.data.iconHeight;
		}
		if( this.data.view == 'dot' ) {
			return this.dotRadius*2*this.lqs.layoutScale;
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
			new LQS_Line( tl, tr ),
			new LQS_Line( tr, br ),
			new LQS_Line( bl, br ),
			new LQS_Line( tl, bl )
		];
		var pokeyLine = new LQS_Line( pt, this.centrePoint() );
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
		alert( "makeSeed function should be subclassed" );		
	}

	reveal() {
		this.lqs.focusPage( new LQSPoint( this.data.x, this.data.y ) );
	}

} // End Node

/*

	showGraphNodeLinks() {
		this.reset();
		this.dom.content.html("Loading...");
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids: this.data.nodeID, followLinks: '*' },
			url: node.data.endpoint
		}).done(function(data){
			this.dom.content.empty();
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

