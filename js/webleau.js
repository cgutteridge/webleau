function liquidSpaceInit( layout ) {

	var nodesLayer;
	var arrowsLayer;
	var labelsLayer;
	var nodes = {};
	var links = {};
	var layoutScale = 1;
	var mouse = screenMiddle();
	var offsetX = 5000;
	var offsetY = 5000;
	var curYPos = 0;
	var curXPos = 0;
	var curDown = false;
	var layoutScaleSlider;
	var defaultInspectorProxy = 'https://www.southampton.ac.uk/~totl/lqs-inspector-v1/';
	var inspectorProxy = defaultInspectorProxy;

	function noDragClick( element, fn ){
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


	function screenMiddle() {
		return new Point( winLeft()+winWidth()/2, winTop()+winHeight()/2 );
	}

	function toVirtual(realpt) {
		return new Point( 
			(realpt.x-offsetX)/layoutScale,
			(realpt.y-offsetY)/layoutScale
		);
	}

	function toReal(virtpt) {
		return new Point( 
			virtpt.x*layoutScale+offsetX,
			virtpt.y*layoutScale+offsetY
		);
	}

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

	
	function manifestGraphBase(endpoint) {
		var id = "graph/"+endpoint;
		var node;
		if( nodes[id] ) {
			node = nodes[id];
			node.reveal();
		} else {
			var pt = toVirtual(screenMiddle());
			node = addNode({
				id: id,
				x: pt.x,
 				y: pt.y,	
				title: "Data connection",
				width:  ((winWidth() /2))/layoutScale,
				height: ((winHeight()/2))/layoutScale,
				type: "graph-base",
				endpoint: endpoint,
				gizmo: true,
				meta: {}
			});
		}
		return node;
	}

	function manifestGraphSelect() {
		var pt = toVirtual(screenMiddle());
		var node = addNode({
			id: uuid(),
			x: pt.x,
 			y: pt.y,	
			title: "Data connector",
			width:  ((winWidth() /2))/layoutScale,
			height: ((winHeight()/2))/layoutScale,
			type: "graph-select",
			gizmo: true,
			meta: {}
		});
		return node;
	}

//todo, decouple manifest functions from the bit that creates links?

	function Node( nodeData ) {

		// functions we need to define early
		this.setTitleText = function( text ) {
			this.dom.dotText.text( text );
			this.dom.titleText.text( text );
			if( text == "" ) {
				this.dom.title.addClass("lqs_node_empty_title");
			} else {
				this.dom.title.removeClass("lqs_node_empty_title");
			}
		}

		this.showGraphBase = function() {
			this.reset();
			this.setTitleText( this.data.title );
			this.dom.content.html("Loading...");
			var node = this;
			if( !this.data.graphIdent ) {
				$.ajax({
					method: "GET",
					data: {},
					url: node.data.endpoint
				}).done(function(data){
					node.data.graphIdent = data;
					if( node.data.graphIdent && node.data.graphIdent.title ) {
						node.setTitleText( node.data.graphIdent.title );
					}
				});
			}
			$.ajax({
				method: "GET",
				data: { action: 'nodeTypes' },
				url: node.data.endpoint
			}).done(function(data){
				this.dom.content.html("");
				//this.dom.content.append( $('<div>This endpoint has the following types of node:</div>'));
				var keys = Object.keys( data.nodeTypes );
				for( var i=0;i<keys.length;++i) {
					var type = keys[i];
					var seed = $('<div class="lqs_seed">'+type+' </div>');
					if( data.nodeTypes[type]["count"] ) {
						seed.append( $('<span>('+data.nodeTypes[type]["count"]+')</span>' ) );
					}
					this.dom.content.append(seed);
					seed.click( function() { 
						this.node.manifestGraphType(this.type); 
						this.node.showIcon();
					}.bind({node:this,type:type}) );
				}
				this.fitSize();
			}.bind(this)).fail(function(){
				this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
				this.fitSize();
			}.bind(this))
		}
		
			
		this.showGraphType = function() {
			this.reset();
			this.setTitleText( this.data.title );
			if( this.data.graphIdent && this.data.graphIdent.title ) {
				this.setTitleText( this.data.graphIdent.title+" #"+this.data.nodeType );
			}
			this.dom.content.html("Loading...");
			var node = this;
			$.ajax({
				method: "GET",
				data: { action: 'nodes', types:this.data.nodeType },
				url: node.data.endpoint
			}).done(function(data){
				this.dom.content.html("");
				//this.dom.content.html( dataToHTML( data ) );
				var keys = Object.keys( data.nodes );
				for( var i=0;i<keys.length;++i) {
					var apiNode = data.nodes[keys[i]];
					var seed = $('<div class="lqs_seed"></div>').text( " "+apiNode.title);
					this.dom.content.append(seed);
					seed.click( function() { 
						this.node.manifestGraphNode(this.apiNode,'belongs to',true); 
						this.node.showIcon();
					}.bind({node:this,apiNode:apiNode}) );
				}
				this.fitSize();
			}.bind(this)).fail(function(){
				this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
				this.fitSize();
			}.bind(this))
		}

		this.showGraphNode = function() {
			this.reset();
			this.setTitleText( this.data.title );
			this.dom.content.html("Loading...");
			var node = this;
			$.ajax({
				method: "GET",
				data: { action: 'nodes', ids:this.data.nodeID, data:1 },
				url: node.data.endpoint
			}).done(function(data){
				this.data.graph = data.nodes[this.data.nodeID];
				this.dom.content.text('');
				this.dom.content.append( this.renderGraphNodeContent() );
				this.fitSize();
			}.bind(this)).fail(function(){
				this.dom.content.text( "Failed to get data (TODO: add a 'retry' icon). Using cached version." );
				this.dom.content.append( 
					$("<div class='lqs_cached'></div>").append(this.renderGraphNodeContent()));
				this.fitSize();
			}.bind(this))
		}

		this.renderGraphNodeContent = function() {	
			var content = $('<div></div>');
			if( !this.data.graph || !this.data.graph.data ) {
				content.text( "cache not available" );
			} else if( this.data.graph.data.html ) {
				content.html( this.data.graph.data.html );
				// duplicate code, candidate for a function?
				content.find( 'a' ).attr("target","_blank");
				content.find( 'img,iframe' ).css("max-width","100%");
			} else if( this.data.graph.data.icon ) {
				content.html( $("<img style='width:100%;min-width:50px;max-width:100%' />").attr('src',this.data.graph.data.icon));
			} else {
				content.text( "<null>" );
			}	
			return content;
		}

		this.manifestGraphNode = function(apiNode,relation,forwards) {
			var id = "graph/"+this.data.endpoint+"/node/"+apiNode.id;
			if( nodes[id] ) {
				nodes[id].reveal();
			} else {
				var pt = toVirtual(screenMiddle());
				addNode({
					id: id,
					x: pt.x,
 					y: pt.y,	
					title: apiNode.title,
					width:  ((winWidth() /2))/layoutScale,
					height: ((winHeight()/2))/layoutScale,
					type: "graph-node",
					link: true,
					nodeID: apiNode.id,
					endpoint: this.data.endpoint,
					meta: {}
				});
			}
			if( forwards ) {
				var link_id = "graph/link/"+relation+"/"+id+"/"+this.data.id;
				if( !links[link_id] ){ 
					addLink({
						subject: {node: id},
						object: {node: this.data.id},
						label: relation,
						id: link_id
					});
				}
			} else {
				var link_id = "graph/link/"+relation+"/"+this.data.id+"/"+id;
				if( !links[link_id] ){ 
					addLink({
						subject: {node: this.data.id},
						object: {node: id},
						label: relation,
						id: link_id
					});
				}
			}
		}
	
		this.manifestGraphType = function(type) {
			var id = "graph/"+this.data.endpoint+"/type/"+type;
			if( nodes[id] ) {
				nodes[id].reveal();
			} else {
				var pt = toVirtual(screenMiddle());
				addNode({
					id: id,
					x: pt.x,
 					y: pt.y,	
					title: "Graph API: "+type+" nodes",
					width:  ((winWidth() /2))/layoutScale,
					height: ((winHeight()/2))/layoutScale,
					type: "graph-type",
					nodeType: type,
					endpoint: this.data.endpoint,
					gizmo: true,
					graphIdent: this.data.graphIdent,
					meta: {}
				});
			}
			var link_id = "graph/link/"+id+"/"+this.data.id;
			if( !links[link_id] ) {
				addLink({
					object: {node: id},
					subject: {node: this.data.id},
					label: "belongs to",
					id: link_id
				});
			}
		}

		this.showGraphNodeLinks = function() {
			this.reset();
			this.dom.content.html("Loading...");
			var node = this;
			$.ajax({
				method: "GET",
				data: { action: 'nodes', ids: this.data.nodeID, followLinks: '*' },
				url: node.data.endpoint
			}).done(function(data){
				this.dom.content.html("");
				//this.dom.content.append( dataToHTML( data ));
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

		this.showLink = function() {
			this.reset();
			this.data.view = "link";
			if( this.data.type == 'graph-node' ) {
				this.showGraphNodeLinks();
				return;
			}
			this.dom.content.html("This node does not have a link editing interface");
		}

		this.showGraphSelect = function() {	
			this.reset();
			this.setTitleText(this.data.title);
			var input = $("<input class='normal-paste' value='https://www.southampton.ac.uk/~totl/wordpress-graph-demo/' />");
			var button = $("<button>CONNECT</button>");
			button.click( function() {
				manifestGraphBase( input.val() );
				this.remove();
			}.bind(this));
			this.dom.content.html("");
			this.dom.content.append( input );
			this.dom.content.append( button );
			this.fitSize();
		}

		this.showDot = function() {
			this.dom.outer.hide();
			this.dom.dot.show();
			this.dom.dotText.show();
			this.data.view = "dot";
			this.updatePosition();
			this.updateLinksPosition();
		}
		this.hideDot = function() {
			this.dom.outer.show();
			this.dom.dot.hide();
			this.dom.dotText.hide();
			this.showFullContent();
			this.updatePosition();
			this.updateLinksPosition();
		}
		this.showIcon = function() {
			this.dom.outer.hide();
			this.dom.icon.show();
			this.dom.dotText.show();
			this.data.view = "icon";
			this.updatePosition();
			this.updateLinksPosition();
		}
		this.hideIcon = function() {
			this.dom.outer.show();
			this.dom.icon.hide();
			this.dom.dotText.hide();
			this.showFullContent();
			this.updatePosition();
			this.updateLinksPosition();
		}


		this.showFullContent = function() {
			this.reset();
			this.data.view = "full-content";
			// this should clearly be plugin based eventually
			if( this.data.type == 'graph-select' ) {
				this.showGraphSelect();
				return;
			}
			if( this.data.type == 'graph-base' ) {
				this.showGraphBase();
				return;
			}
			if( this.data.type == 'graph-type' ) {
				this.showGraphType();
				return;
			}
			if( this.data.type == 'graph-node' ) {
				this.showGraphNode();
				return;
			}

			// html, text, or using metadata
			this.setTitleText( this.data.title );
			var hasContent = false;
			if( this.data.html ) {
				this.dom.content.html( sanitiseHtml(this.data.html) );
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
			if( this.data.meta && this.data.meta.source && this.data.meta.source.URL ) {
				var span = $('<div style="text-align:right">- </div>');
				this.dom.content.append( span );
				span.append( $('<a>Source</a>').attr( 'href',this.data.meta.source.URL));
			}
			this.dom.content.find( 'a' ).attr("target","_blank");
			this.dom.content.find( 'img,iframe' ).css("max-width","100%");
			//this.dom.content.find( 'img,iframe' ).css("max-height","100%");
		}

		this.showMeta = function() {
			this.reset();
			this.dom.content.html( dataToHTML( this.data ) );
			this.data.view = "meta";
		}

		this.reset = function() {
			this.dom.outer.removeClass('lqs_node_notitle');
			this.dom.content.html( '' );
		}

		this.showEdit = function() {
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
					this.showFullContent();
				}.bind(this));
				this.dom.edit.cancel.click( function() {
					var v = this.dom.edit.textarea.val().trim();
					if( v == "" ) { this.remove(); return; }
					this.showFullContent();
				}.bind(this));
			} else {
				this.dom.edit.textarea.text( this.data.text );
				this.dom.edit.save.click( function() {
					var v = this.dom.edit.textarea.val().trim();
					if( v == "" ) { this.remove(); return; }
					this.data.text = v;
					this.showFullContent();
					this.fitSize();
				}.bind(this));
				this.dom.edit.cancel.click( function() {
					var v = this.dom.edit.textarea.val().trim();
					if( v == "" ) { this.remove(); return; }
					this.showFullContent();
				}.bind(this));
			} 
			this.fitSize();
		}



		// methods
		this.reveal = function() {
			focusPage( new Point( this.data.x, this.data.y ) );
		}

		this.resized = function(event, ui) { 

			var wDelta  = ui.size.width  - ui.originalSize.width;
			var adjustedWidth  = ui.originalSize.width  + 2*wDelta;
			this.data.width  = Math.max(50,adjustedWidth/layoutScale);

			var hDelta  = ui.size.height - ui.originalSize.height;
			var adjustedHeight =  ui.originalSize.height + 2*hDelta;
			this.data.height = Math.max(50,adjustedHeight/layoutScale);

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
			var baseFontSize = 10;
			if( this.data.view == 'icon' || this.data.view == 'dot' ) {
				this.dom.dotText.attr('x',this.realX() );
				this.dom.dotText.attr('y', this.realY()+this.realHeight()/2+baseFontSize*layoutScale);
				this.dom.dotText.css('font-size',(baseFontSize*layoutScale)+"px"); 
			}
			if( this.data.view == 'icon' ) {
				this.dom.icon.css('left',this.realX()-this.realWidth()/2);
				this.dom.icon.css('top', this.realY()-this.realHeight()/2);
				return;
			}
			if( this.data.view == 'dot' ) {
				this.dom.dot.attr('cx',this.realX()-this.realWidth()/2);
				this.dom.dot.attr('cy', this.realY()-this.realHeight()/2);
				this.dom.dot.attr('r', this.dotSize*layoutScale);
				return;
			}
			this.dom.outer.css('left',this.realX()-this.realWidth()/2);
			this.dom.outer.css('top', this.realY()-this.realHeight()/2);
			this.dom.outer.css('width', this.data.width *layoutScale);
			this.dom.outer.css('height',this.data.height*layoutScale);
			var titleHeight = (18*layoutScale);
			var fontHeight = (16*layoutScale);
			this.dom.content.css('height',this.data.height*layoutScale-titleHeight ); // height of box minus borders and title
			this.dom.title.css('font-size',fontHeight+"px");
			this.dom.title.css('height',   titleHeight+"px" );
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
			this.dom.outer.find( '.lqs_tool' ).addClass('noTools');
			this.data.width =  (this.dom.outer.width() )/layoutScale+10;
			this.data.height = (this.dom.outer.height())/layoutScale+10;
			this.dom.outer.find( '.lqs_tool' ).removeClass('noTools');
			this.dom.outer.css('max-width','none');
			this.dom.outer.css('max-height','none');
			this.updatePosition();
			this.updateLinksPosition();
		}

		this.centrePoint = function() {
			return new Point( this.realX(), this.realY() );
		}

		this.borderSize = 4;
		// real means actual pixels not the place on the conceptual layout
		this.realX = function() {
			return this.data.x*layoutScale+offsetX;
		}
		this.realY = function() {
			return this.data.y*layoutScale+offsetY;
		}
		// the width of the node in pixels in the current scale
		this.realWidth = function() {
			if( this.data.view == 'icon' ) {
				return this.data.iconWidth;
			}
			if( this.data.view == 'dot' ) {
				return this.dotSize*layoutScale;
			}
			return this.data.width*layoutScale;
		}
		// the height of the node in pixels in the current scale
		this.realHeight = function() {
			if( this.data.view == 'icon' ) {
				return this.data.iconHeight;
			}
			if( this.data.view == 'dot' ) {
				return this.dotSize*layoutScale;
			}
			return this.data.height*layoutScale;
		}
		this.realWidthFull = function() {
			return this.realWidth()+this.borderSize*2;
		}
		this.realHeightFull = function() {
			return this.realHeight()+this.borderSize*2;
		}

		// find the point in a block nearest to the given point
		this.nearestPointTo = function( pt ) {
			// find the intersection with each edge
			var tl = new Point( this.realX()-this.realWidthFull()/2+1, this.realY()-this.realHeightFull()/2+1 );
			var tr = new Point( this.realX()+this.realWidthFull()/2  , this.realY()-this.realHeightFull()/2+1 );
			var bl = new Point( this.realX()-this.realWidthFull()/2+1, this.realY()+this.realHeightFull()/2   );
			var br = new Point( this.realX()+this.realWidthFull()/2  , this.realY()+this.realHeightFull()/2   );
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
			this.dom.icon.remove();
			this.dom.dot.remove();
			this.dom.dotText.remove();
		}

		// data
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
		nodesLayer.append( this.dom.icon );

		this.dotSize = 5;
		this.dom.dot_id = "dot_"+uuid();
 		var dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
		dot.id = this.dom.dot_id;
		dot.setAttribute( "class", "lqs_dot" );
		dot.setAttribute( "r", this.dotSize );
		var arrowsG = document.getElementById('svg_arrows');
		arrowsG.appendChild( dot );
		this.dom.dot = $(dot);

		this.dom.dot_label_id = "link_from_"+uuid();
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
					this.showFullContent();
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
		noDragClick( this.dom.icon, function() {
			this.hideIcon();
		}.bind(this) );


		this.dom.tooldot = $('<div class="lqs_tool">o</div>');
		this.dom.titleLeft.append( this.dom.tooldot );
		this.dom.tooldot.click( function() {
			this.showDot();
		}.bind(this));
		/*
		noDragClick( this.dom.dot, function() {
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
				this.showFullContent();
			}
		}.bind(this));

		this.dom.toolRemove = $('<div class="lqs_tool">X</div>');
		this.dom.toolRemove.click( function() {
			if( confirm( "Really delete?" ) ) {
				this.remove();
				updateAllPositions();
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
		nodesLayer.append( this.dom.outer );
		this.dom.outer.dblclick(function() {
			var pt = toVirtual( mouse );
			var width = ((winWidth() /4))/layoutScale;
			var height= ((winHeight()/4))/layoutScale;
			var nodeData = {
				id: uuid(),
				x: this.data.x+(this.data.width/2)+width/2,
 				y: pt.y,	
				title: "",
				width: width,
				height: height,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = addNode(nodeData);
			comment.reveal();
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
		var view = this.data.view;
		this.showFullContent();
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
		if( !subjectNode ) {
			alert( "Failed to link subjectNode "+JSON.stringify( this.data.subject ));
			return;
		}
		var objectNode = nodes[this.data.object.node];
		if( !objectNode ) {
			alert( "Failed to link objectNode "+JSON.stringify( this.data.object ));
			return;
		}

		// TODO check if these exist and handle exceptions	
		subjectNode.registerLink(this);
		objectNode.registerLink(this);

		var arrowsG = document.getElementById('svg_arrows');
		var labelsG = document.getElementById('svg_labels');

		this.dom = {};

		this.dom.id = "link_"+uuid();
 		var line = document.createElementNS("http://www.w3.org/2000/svg","line");
		line.id = this.dom.id;
		line.setAttribute( "class", "lqs_link" );
		line.setAttribute( "marker-end", "url(#arrow)" );
		arrowsG.appendChild( line );

		this.dom.label_id = "link_from_"+uuid();
 		var fromText = document.createElementNS("http://www.w3.org/2000/svg","text");
		fromText.setAttribute( "class", "lqs_link_from_text" );
		fromText.id = this.dom.label_id;
		fromText.appendChild( document.createTextNode( linkData.label ));
		labelsG.appendChild( fromText );

/*
		this.dom.to_id = "link_to_"+linkData.id;
 		var toText = document.createElementNS("http://www.w3.org/2000/svg","text");
		toText.setAttribute( "class", "lqs_link_to_text" );
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
				$("#"+this.dom.label_id).attr('x',(pt1.x+(pt2.x-pt1.x)/4));
				$("#"+this.dom.label_id).attr('y',(pt1.y+(pt2.y-pt1.y)/4));
				$("#"+this.dom.label_id).css('font-size',(10*layoutScale)+"px"); 
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
			$("#"+this.dom.label_id).remove();
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

		layout.inspectorProxy = inspectorProxy;
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

		inspectorProxy = defaultInspectorProxy;
		if( layout.inspectorProxy ) {
			inspectorProxy = layout.inspectorProxy;
		}
	}

	function centrePage() {
		focusPage( new Point(0,0) );
	}

	// focus the real scroll window onto a point on the virtual layout
	function focusPage( vpt ) {
		var rpt = toReal(vpt);
		$('html,body').animate({
			'scrollLeft': rpt.x-winWidth()/2,
			'scrollTop': rpt.y-winHeight()/2
		},1000);
	}
		
	function initPage() {
		var bgsvg = $('<svg class="lqs_bgsvg"><g id="axis"><line id="vaxis" /><line id="haxis" /></g></svg>');
		$('body').append(bgsvg);
		bgsvg.html( bgsvg.html() ); // reset SVG layer 
		$('#vaxis').attr('x1',offsetX).attr('y1',0).attr('x2',offsetX).attr('y2',offsetY*2);
		$('#haxis').attr('x1',0).attr('y1',offsetY).attr('x2',offsetX*2).attr('y2',offsetY);

		nodesLayer = $('<div class="lqs_nodes"></div>');
		$('body').append(nodesLayer);

		var svg = $('<svg class="lqs_svg"><defs><marker id="arrow" markerWidth="11" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#666" /></marker></defs><g id="svg_arrows"></g><g id="svg_labels"></g></svg>');
		$('body').append(svg);
		svg.html( svg.html() ); // reset SVG layer 
	
		var rpt = toReal(new Point(0,0));
		window.scrollTo( rpt.x-winWidth()/2, rpt.y-winHeight()/2 );

		nodesLayer.dblclick(function() {
			var pt = toVirtual( mouse );
			var nodeData = {
				id: uuid(),
				x: pt.x,
 				y: pt.y,	
				title: "",
				width:  winWidth() /2/layoutScale,
				height: winHeight()/2/layoutScale,
				text: "",
				edit: true,
				meta: {}
			};
			var comment = addNode(nodeData);
			comment.showEdit();
		});

		$('body').append( $('<div class="ident">liquid space</div>'));

		/* CONTROLS */

		var controlsWrapper = $('<div class="controls_wrapper"><div class="controls_icon">TOOLS</div></div>');
		var controls = $('<div class="controls"></div>');
		$(controlsWrapper).append(controls);
		$('body').append(controlsWrapper);

		/* CONTROLS: sliders */

		layoutScaleSlider = $('<input type="range" value="1" min="0.05" max="2" step="0.001" />');
		var layoutScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Layout scale: </div>' ).append(layoutScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(layoutScaleSlider) );
		controls.append( layoutScaleSlider );
		//controls.append( contentToggle );
		layoutScaleSlider.on('propertychange input', function(event) {
			// find coords of screen centre
			var screenMiddleVirt = toVirtual(screenMiddle());
			layoutScale = layoutScaleSlider.val();
			var perc = Math.round( layoutScale*100000 ) / 1000;
			layoutScaleDisplay.text( ""+perc+"%" );
			nodesLayer.css( 'font-size',perc+"%" );
			var screenMiddleReal = toReal(screenMiddleVirt);
			window.scrollTo( screenMiddleReal.x-winWidth()/2, screenMiddleReal.y-winHeight()/2 );
			updateAllPositions();
		});


		/* CONTROLS: tools */
		var controlTools = $('<div class="lqs_controls_tools"></div>');
		controls.append( $("<div style='margin-top:1em'>Tools</div>"));
		controls.append(controlTools);

/*	 I've gone off this idea
		// rightsize
		var rightsizeTool = $('<div title="rightsize" class="lqs_tool">+</div>');
		controlTools.append( rightsizeTool );
		rightsizeTool.click( function() {
			nodeKeys = Object.keys(nodes);
			for( var i=0; i<nodeKeys.length; ++i ) {
				nodes[nodeKeys[i]].fitSize();
			}
		});
*/

		// reset
		var resetTool = $('<div title="reset" class="lqs_tool">R</div>');
		controlTools.append( resetTool );
		resetTool.click( function() {
			layoutScaleSlider.val(1).trigger('input');
			centrePage();
			updateAllPositions();
		});

		// quine download
		var quineTool = $('<div title="quine" class="lqs_tool">Q</div>');
		controlTools.append( quineTool );
		quineTool.click( function() {
			var head = $('head').html();
			var jsonLayout = JSON.stringify( getLayout());
			jsonLayout = jsonLayout.replace( /<\/script>/ig, "<\/\"+\"script>" );
			var page = "<!DOCTYPE html>\n<html lang='en'><head>" +head+"</head><body></body><script>$(document).ready(function(){ liquidSpaceInit("+ jsonLayout+");});</"+"script></html>" ;
			var filename = "liquid-space."+Date.now()+".html";
			download( filename, page, "text/html" );
		});

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
		graphTool.click( function() {
			manifestGraphSelect();
		});

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

	function download(filename, data, mimetype) {
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

	function ascii2hex(str) {
		var arr1 = [];
		for (var n = 0, l = str.length; n < l; n ++) 
     		{
			var hex = Number(str.charCodeAt(n)).toString(16);
			arr1.push(hex);
		}
		return arr1.join('');
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

	// remove the obvious secruity issues from 3rd party html
	function sanitiseHtml( html ) {
		html = html.replace( /<script>.*?<\/script>/, '' );
		return html;
	}

	function pasteToBackground(event) {
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		var json = clipboardData.getData('application/json');
		var pt = toVirtual(mouse);
		var nodeData = {
			id: uuid(),
			x: pt.x,
 			y: pt.y,
			width:  winWidth() /2/layoutScale,
			height: winHeight()/2/layoutScale,
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
				url: inspectorProxy
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
	}	

	/* init */

	initPage();

	// location of mouse on tablau
	$( document).on( "mousemove", function( event ) {
		mouse = new Point( event.pageX, event.pageY );
	});


	/* fancy stuff with paste */
	nodesLayer.focus();
	$('body').on('paste', function(event) {
		// if we are focused on a normal-paste element just skip this handler
		if( $('.normal-paste:focus').length ) { return; }
		pasteToBackground(event);
	});

	/* zoom on mousewheel */
	$('html,body').bind('wheel mousewheel', function(e){
		var delta;

		if (e.originalEvent.wheelDelta !== undefined) {
			delta = e.originalEvent.wheelDelta;
		} else {
			delta = e.originalEvent.deltaY * -1;
		}
		layoutScaleSlider.val( parseFloat(layoutScaleSlider.val())+delta*0.001 );
		layoutScaleSlider.trigger('propertychange');
		return false;
	});

	/* drag background to scroll */

	$(document).on("mousemove", function (event) {
		if (curDown === true) {
			$(document).scrollTop(parseInt($(document).scrollTop() + (curYPos - event.pageY)));
			$(document).scrollLeft(parseInt($(document).scrollLeft() + (curXPos - event.pageX)));
		}
	});
	
	$(document).on("mousedown", function (e) { 
		if( $(e.target).hasClass( "lqs_nodes" ) ) {
			curDown = true; curYPos = e.pageY; curXPos = e.pageX; e.preventDefault(); 
		}
	});
	$(window).on("mouseup", function (e) { curDown = false; });
	$(window).on("mouseout", function (e) { curDown = false; });

	/* install the layout */

	setLayout( layout );	
}
