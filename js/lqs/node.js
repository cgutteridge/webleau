


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
					this.showMain();
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
				this.showMain();
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
			comment.showEdit();
			return false; // don't also run on background
		}.bind(this));

		// state
		var view = this.data.view;
		this.showMain();
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
		// don't do the zoom inside one of these
		/*
		this.dom.outer.bind('wheel mousewheel', function(e){
			e.stopPropagation();
		});
*/
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

	showLink() {
		this.reset();
		this.data.view = "link";
		if( this.data.type == 'graph-node' ) {
			this.showGraphNodeLinks();
			return;
		}
		this.dom.content.html("This node does not have a link editing interface");
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
		this.showMain();
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
		this.showMain();
		this.updatePosition();
		this.updateLinksPosition();
	}


	showMain() {
		this.reset();
		this.data.view = "main";
		this.setTitleText( this.data.title );
		this.dom.content.empty();
		this.dom.content.append(this.render());
		this.update();  // anything async for this card?
	}

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

	render() {
		return $("<div>This node has no type. Can't render content.</div>");
	}

	/* method to subclass. this is called to trigger ajax or other updates and unlike
	 * render can alter the contents of the DOM directly.
	 */
	update() {
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
				this.showMain();
			}.bind(this));
			this.dom.edit.cancel.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.showMain();
			}.bind(this));
		} else {
			this.dom.edit.textarea.text( this.data.text );
			this.dom.edit.save.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.data.text = v;
				this.showMain();
				this.fitSize();
			}.bind(this));
			this.dom.edit.cancel.click( function() {
				var v = this.dom.edit.textarea.val().trim();
				if( v == "" ) { this.remove(); return; }
				this.showMain();
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

	static makeSeed(opts) {
		alert( "makeSeed function should be subclassed" );		
	}
} // End Node
