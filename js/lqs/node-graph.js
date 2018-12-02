


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
				node.viewSpec().setTitle(node, node.data.graph.ident.title );
			}
			this.dom.content.text( "Connected" );
			if( node.data.graph.ident.start ) {
				var seed = $('<div class="lqs_seed">Start</div>');
				this.dom.content.append(seed);
				this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
					endpoint: node.data.graph.endpoint,
					ident: node.data.graph.ident,
					nodeID: node.data.graph.ident.start,
					sourceCard: node,
					linkType: 'fool',
					from: node
				}));
			}
		}.bind(this));
	}
}

LQS_NodeTypes['graph-node'] = class LQS_Node_Graph_Node extends LQS_Node {
	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.showAction("reload");
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
			render: (node) => { return node.dom.content.html("Loading..."); },
			update: (node) => { node.updateLinksView(); }
		});
	
	}
	static makeSeed(opts) {
		var seed = super.makeSeed(opts);
		// check opts: ident,nodeID,endpoint,from?,to?
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
		// check opts: ident,nodeID,endpoint,from?,to?,linkType?
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
		return $("<div class='lqs_cached'></div>").append(this.renderGraphNodeContent());
	}	
	update() {
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids:this.data.graph.nodeID, data:1 },
			url: node.data.graph.endpoint
		}).done(function(ajaxData){
			this.set('graph.node', ajaxData.nodes[this.data.graph.nodeID] );
			this.dom.content.empty();
			this.dom.content.append( this.renderGraphNodeContent() );
			this.fitSize();
			this.viewSpec().setTitle(node, this.data.graph.node.title );
			if( this.data.graph.node.data && this.data.graph.node.data.icon )  {
				this.set('icon.url', this.data.graph.node.data.icon );
			}
			if( this.data.graph.node.title )  {
				this.set('title',this.data.graph.node.title);
			}
		}.bind(this)).fail(function(){
			var r = $("<div>Failed to get data (TODO: add a 'retry' icon). Using cached version.</div>" );
			r.append( $("<div class='lqs_cached'></div>").append(this.renderGraphNodeContent()));
			this.dom.content.empty();
			this.dom.content.append( r );
			this.fitSize();
		}.bind(this))
	}
	// this uses the cached data to generate a the actual HTML for either the cached or live view
	renderGraphNodeContent() {	
		var content = $('<div></div>');
		if( !this.data.graph.node || !this.data.graph.node.data ) {
			content.text( "cache not available" );
		} else if( this.data.graph.node.data.html ) {
			content.html( this.data.graph.node.data.html );
			// duplicate code, candidate for a function?
			content.find( 'a' ).attr("target","_blank");
			content.find( 'img,iframe' ).css("max-width","100%").css('height','auto');
		} else if( this.data.graph.node.data.icon ) {
			content.html( $("<img style='width:100%;min-width:50px;max-width:100%' />").attr('src',this.data.graph.node.data.icon));
		} else {
			content.text( "<null>" );
		}	
		return content;
	}

	updateLinksView() {
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', ids: this.data.graph.nodeID, follow: '*' },
			url: node.data.graph.endpoint
		}).done(function(ajaxData){
			this.dom.content.empty();
			//this.dom.content.append( LQS.dataToHTML( ajaxData ));
			for( var i=0;i<ajaxData.links.length; ++i ) {
				var apiLink = ajaxData.links[i];
				if( apiLink.subject == this.data.graph.nodeID && ajaxData.nodes[apiLink.object] ) {
					let row = $('<div></div>').text(apiLink.type+" ");
					let gnode = ajaxData.nodes[apiLink.object];
					let seed = $('<div class="lqs_seed"></div>').text( " "+gnode.title);
					row.append(seed);
					this.dom.content.append(row);
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
					let row = $('<div></div>').text(" "+apiLink.type);
					let gnode = ajaxData.nodes[apiLink.subject];
					let seed = $('<div class="lqs_seed"></div>').text( " "+gnode.title);
					row.prepend(seed);
					this.dom.content.append(row);
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
			this.dom.content.html( "API Call failed" );
			this.fitSize();
		}.bind(this))
	}




}
