


LQS_NodeTypes['graph-connect'] = class LQS_Node_Graph_Connect extends LQS_Node {
	render() {	
		var input = $("<input class='normal-paste' style='width:100%'/>");
		var button = $("<button>CONNECT</button>");
		button.click( function() {
			var seed = LQS_NodeTypes['graph-connection'].makeSeed({endpoint:input.val()});
			// make the new connection appear in place of this node
			this.lqs.growSeed( seed, this.data.pos );
			this.remove();
		}.bind(this));
		var r = $("<div>Enter the endpoint URL for a service which supports graph query API. If in doubt, just use our example.</div>");
		r.append( input );
		r.append( button );
		return r;
	}
	static makeSeed(opts) {
		var seed = super.makeSeed(opts);
		seed.title = "Data Connector";
		seed.type = "graph-connect";
		return seed;
	}
}

LQS_NodeTypes['graph-connection'] = class LQS_Node_Graph_Connection extends LQS_Node {
	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.showAction("reload");
	}
	static makeSeed(opts) {
		// opts: endpoint
		var seed = super.makeSeed(opts);
		seed.id = "graph|"+opts.endpoint+"|connection",
		seed.title = "Data Connection";
		seed.type = "graph-connection";
		seed.graph = { endpoint: opts.endpoint };
		return seed;
	}
	render() {
		return $("<div>Loading...</div>");
	}
	update() {
		var node = this;
		$.ajax({
			method: "GET",
			data: {},
			url: node.data.graph.endpoint
		}).fail(function(){
			this.dom.content.html( "Failed to get ident data (TODO: add a 'retry' icon)" );
			this.fitSize();
		}.bind(this)).done(function(ajaxData){
			node.set( 'graph.ident', ajaxData );
			if( node.data.graph.ident && node.data.graph.ident.title ) {
				node.set( 'title',node.data.graph.ident.title );
				node.viewSpec().setTitle(node, node.data.graph.ident.title );
			}
			this.dom.content.empty();
			if( this.data.graph.ident.description ) {
				this.dom.content.append( $("<p></p>").text( this.data.graph.ident.description ));
			}
			
			if( node.data.graph.ident.start ) {
				let a = node.data.graph.ident.start;
				if( !Array.isArray( a ) ) { a = [a]; }
				let startDiv = $("<p>Suggested start point"+(a.length==1?"":"s")+", drag to open: </p>");
				this.dom.content.append( startDiv );
				for(let i=0;i<a.length;++i) {
					let id = a[i];
					let seedname = LQS.truncate(id, 32 );
					let seed = this.lqs.renderSeed( seedname );
					startDiv.append(seed);
					this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
						endpoint: node.data.graph.endpoint,
						ident: node.data.graph.ident,
						nodeID: id,
						sourceCard: node
					}));
				}
			}
			var input = $("<input class='normal-paste' style=''/>");
			var button = $("<button style='margin-left:1em'>Open node</button>");
			button.click( function() {
				var seed = LQS_NodeTypes['graph-node'].makeSeed({
					endpoint: node.data.graph.endpoint,
					ident: node.data.graph.ident,
					nodeID: input.val(),
					sourceCard: node
				});
				// make the new connection appear in place of this node
				this.lqs.growSeed( seed, this.data.pos );
			}.bind(this));
			var r = $("<div>Open a node by ID: </div>");
			r.append( input );
			r.append( button );
			this.dom.content.append(r);
			this.fitSize();
		}.bind(this));
	}
}

LQS_NodeTypes['graph-node'] = class LQS_Node_Graph_Node extends LQS_Node {
	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.showAction("reload");
		this.registerView({
			id: "content-only", 
			enter: (node) => { // enter
				node.hideAction( 'content-only' );
			},
			leave: (node) => {
				node.showAction( 'content-only' );
			},
			init: (node) => {
				node.registerAction(
					"content-only",
					"HIDE LINKS",
					()=>{ node.setView( "content-only" ); } );
			},
			render: (node) => { return $('<div class="lqs_graph_content">Loading content...</div>'); },
			update: (node) => { node.updateLinks(); }
		});
		this.registerView({
			id: "graph-links", 
			enter: (node) => { // enter
				node.hideAction( 'graph-links' );
			},
			leave: (node) => {
				node.showAction( 'graph-links' );
			},
			init: (node) => {
				node.registerAction(
					"graph-links",
					"GRAPH LINKS",
					()=>{ node.setView( "graph-links" ); } );
			},
			render: (node) => { return $('<div class="lqs_graph_links">Loading links...</div>'); },
			update: (node) => { node.updateLinks(); }
		});
	
	}
	static makeSeed(opts) {
		// check opts: ident,nodeID,endpoint,from?,to?,linkType?
		var id = "graph|"+opts.endpoint+"|node|"+opts.nodeID;
		var seed = super.makeSeed(opts);
		seed.id = id;
		seed.title = opts.ident.title+"# "+opts.nodeType;
		seed.type = "graph-node";
		seed.graph = {
			nodeID: opts.nodeID,
			ident: opts.ident,
			endpoint: opts.endpoint
		};
		seed.links = [];
		if( opts.from ) {
			var link_id = "graph|link|"+opts.from.data.id+"|"+seed.id;
			seed.links.push({
				subject: {node: opts.from.data.id},
				object: {node: seed.id},
				label: opts.linkType,
				id: link_id
			});
		};
		if( opts.to ) {
			var link_id = "graph|link|"+opts.to.data.id+"|"+seed.id;
			seed.links.push({
				subject: {node: seed.id},
				object: {node: opts.to.data.id},
				label: opts.linkType,
				id: link_id
			});
		};
		return seed;
	}
	render() {
		var d = $("<div></div>" );
		var content = this.renderGraphNodeContent();
		var content2 = $("<div class='lqs_graph_content '></div>");
		d.append( content2 );
		d.append( $("<div class='lqs_graph_links lqs_graph_fold'>Loading links</div>") ); 
		if( content ) { 
			content2.append($("<div class='lqs_cached'></div>").append(content)); 
		} else { 
			content2.hide(); 
		}
		return d;
	}	
	update() {
		this.updateContent();
		this.updateLinks();
	}

	updateContent() {
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids:this.data.graph.nodeID, data:1 },
			url: node.data.graph.endpoint
		}).done(function(ajaxData){
			this.set('graph.node', ajaxData.nodes[this.data.graph.nodeID] );
			this.dom.content.find(".lqs_graph_content").empty().append( this.renderGraphNodeContent() );
			this.fitSize();
			this.viewSpec().setTitle(node, this.data.graph.node.title );
			if( this.data.graph.node.data && this.data.graph.node.data.icon )  {
				this.set('icon.url', this.data.graph.node.data.icon );
			}
			if( this.data.graph.node.title )  {
				this.set('title',this.data.graph.node.title);
			}
		}.bind(this)).fail(function(){
			var content = this.renderGraphNodeContent();
			this.dom.content.find( '.lqs_graph_content').empty();
			if( content ) {
				var r = $("<div>Failed to get data (TODO: add a 'retry' icon). Using cached version.</div>" );
				r.append( $("<div class='lqs_cached'></div>").append(content) );
				this.dom.content.find( '.lqs_graph_content').append( r );
				this.dom.content.find(".lqs_graph_links").addClass('lqs_graph_fold');
				this.dom.content.find( '.lqs_graph_content').show();
			} else {
				this.dom.content.find(".lqs_graph_links").removeClass('lqs_graph_fold');
				this.dom.content.find( '.lqs_graph_content').hide();
			}
			this.fitSize();
		}.bind(this))
	}
	// this uses the cached data to generate a the actual HTML for either the cached or live view
	renderGraphNodeContent() {	
		var content = $('<div></div>');
		this.dom.content.find(".lqs_graph_links").addClass('lqs_graph_fold');
		this.dom.content.find(".lqs_graph_content").show();
		if( !this.data.graph.node || !this.data.graph.node.data ) {
			//content.text( "cache not available" );
			this.dom.content.find(".lqs_graph_links").removeClass('lqs_graph_fold');
			this.dom.content.find(".lqs_graph_content").hide();
			return null;
		} else if( this.data.graph.node.data.html ) {
			content.html( this.data.graph.node.data.html );
			content.find( '[data-seed-id]' ).each( (i,e)=>{
				e=$(e);
				var seed = $('<div class="lqs_seed lqs_seed_inline" />').text( e.text() );	
				var seedID = e.attr("data-seed-id");
				e.replaceWith(seed);
				this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
					endpoint: this.data.graph.endpoint,
					ident: this.data.graph.ident,
					nodeID: seedID,
					linkType: "links to",
					sourceCard: this,
					from: this
				}));
			});
			this.fixup(content);
		} else if( this.data.graph.node.data.icon ) {
			content.html( $("<img style='width:100%;min-width:50px;max-width:100%' />").attr('src',this.data.graph.node.data.icon));
		} else {
			this.dom.content.find(".lqs_graph_links").removeClass('lqs_graph_fold');
			this.dom.content.find(".lqs_graph_content").hide();
			return null;
			//content.text( "<null>" );
		}	
		return content;
	}

	updateLinks() {
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids: this.data.graph.nodeID, follow: '*' },
			url: node.data.graph.endpoint
		}).done(function(ajaxData){
			this.dom.content.find(".lqs_graph_links").empty();
			//this.dom.links.append( LQS.dataToHTML( ajaxData ));
			for( var i=0;i<ajaxData.links.length; ++i ) {
				var apiLink = ajaxData.links[i];
				if( apiLink.subject == this.data.graph.nodeID && ajaxData.nodes[apiLink.object] ) {
					let gnode = ajaxData.nodes[apiLink.object];
					let seed = this.lqs.renderSeed( "has "+apiLink.type+" \""+gnode.title+"\"");
					this.dom.content.find(".lqs_graph_links").append(seed);
					this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
						endpoint: this.data.graph.endpoint,
						ident: this.data.graph.ident,
						nodeID: apiLink.object,
						linkType: apiLink.type,
						//sourceCardAction: 'main',
						sourceCard: node,
						from: node
					}));
				}
				if( apiLink.object == this.data.graph.nodeID && ajaxData.nodes[apiLink.subject] ) {
					let gnode = ajaxData.nodes[apiLink.subject];
					let seed = this.lqs.renderSeed("is "+apiLink.type+" of \""+gnode.title+"\"");
					this.dom.content.find(".lqs_graph_links").append(seed);
					this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
						endpoint: this.data.graph.endpoint,
						ident: this.data.graph.ident,
						nodeID: apiLink.subject,
						linkType: apiLink.type,
						//sourceCardAction: 'main',
						sourceCard: node,
						to: node
					}));
				}
			}
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.find(".lqs_graph_links").html( "API Call failed" );
			this.fitSize();
		}.bind(this))
	}




}
