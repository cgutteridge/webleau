


LQS_NodeTypes['graph-connect'] = class LQS_Node_Graph_Connect extends LQS_Node {
	render() {	
		var input = $("<input class='normal-paste' value='https://www.southampton.ac.uk/~totl/wordpress-graph-demo/' style='width:100%'/>");
		var button = $("<button>CONNECT</button>");
		button.click( function() {
			var seed = LQS_NodeTypes['graph-connection'].makeSeed({endpoint:input.val()});
			// make the new connection appear in place of this node
			this.lqs.growSeed( seed, { x: this.data.x, y: this.data.y } );
			this.remove();
		}.bind(this));
		var r = $("<div>Enter the endpoint URL for a service which supports graph query API. If in doubt, just use our example.</div>");
		r.append( input );
		r.append( button );
		return r;
	}
	static makeSeed(opts) {
		return {
			title: "Data connector",
			type: "graph-connect"
		} 
	}
}

LQS_NodeTypes['graph-connection'] = class LQS_Node_Graph_Connection extends LQS_Node {
	static makeSeed(opts) {
		// opts: endpoint
		return {
			id: "graph|"+opts.endpoint+"|connection",
			title: "Data connection",
			type: "graph-connection",
			graph: { endpoint: opts.endpoint }
		};
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
		}.bind(this)).done(function(data){
			node.data.graph.ident = data;
			if( node.data.graph.ident && node.data.graph.ident.title ) {
				node.setTitleText( node.data.graph.ident.title );
			}
			$.ajax({
				method: "GET",
				data: { action: 'nodeTypes' },
				url: node.data.graph.endpoint
			}).done(function(data){
				this.dom.content.empty();
				//this.dom.content.append( $('<div>This endpoint has the following types of node:</div>'));
				var keys = Object.keys( data.nodeTypes );
				for( var i=0;i<keys.length;++i) {
					var type = keys[i];
					var seed = $('<div class="lqs_seed">'+type+' </div>');
					if( data.nodeTypes[type]["count"] ) {
						seed.append( $('<span>('+data.nodeTypes[type]["count"]+')</span>' ) );
					}
					this.dom.content.append(seed);
					this.lqs.attachSeed( seed, LQS_NodeTypes['graph-type'].makeSeed({
						endpoint: node.data.graph.endpoint,
						ident: node.data.graph.ident,
						nodeType: type,
						from: node
					}) ); 
				}
				this.fitSize();
			}.bind(this)).fail(function(){
				this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
				this.fitSize();
			}.bind(this))
		}.bind(this));
	}
}


LQS_NodeTypes['graph-type'] = class LQS_Node_Graph_Type extends LQS_Node {
	static makeSeed(opts) {
		// check opts: ident,nodeType,endpoint,from?
		var id = "graph|"+opts.endpoint+"|type|"+opts.nodeType;
		var seedData = {
			id: id,
			title: opts.ident.title+" #"+opts.nodeType,
			type: "graph-type",
			graph: {
				nodeType: opts.nodeType,
				ident: opts.ident,
				endpoint: opts.endpoint
			},
			links: []
		};
		if( opts.from ) {
			var link_id = "graph|link|"+opts.from.data.id+"|"+id;
			seedData.links.push({
					object: {node: id},
					subject: {node: opts.from.data.id},
					label: "belongs to",
					id: link_id
				});
		};
		return seedData;
	}
	render() {
		return $("<div>Loading...</div>");
	}
	update() {
		var node = this;
		$.ajax({
			method: "GET",
			data: { action: 'nodes', types:this.data.graph.nodeType },
			url: node.data.graph.endpoint
		}).done(function(data){
			this.dom.content.empty();
			//this.dom.content.html( LQS.dataToHTML( data ) );
			var keys = Object.keys( data.nodes );
			for( var i=0;i<keys.length;++i) {
				var gnode = data.nodes[keys[i]];
				var seed = $('<div class="lqs_seed"></div>').text( " "+gnode.title);
				this.dom.content.append(seed);
				this.lqs.attachSeed( seed, LQS_NodeTypes['graph-node'].makeSeed({
					endpoint: this.data.graph.endpoint,
					ident: this.data.graph.ident,
					nodeID: keys[i],
					from: this
				}) ); 
			}
			this.fitSize();
		}.bind(this)).fail(function(){
			this.dom.content.html( "Failed to get data (TODO: add a 'retry' icon)" );
			this.fitSize();
		}.bind(this))
	}
}

LQS_NodeTypes['graph-node'] = class LQS_Node_Graph_Node extends LQS_Node {
	static makeSeed(opts) {
		// check opts: ident,nodeID,endpoint,from?,to?
		var id = "graph|"+opts.endpoint+"|node|"+opts.nodeID;
		var seedData = {
			id: id,
			title: opts.ident.title+"# "+opts.nodeType,
			type: "graph-node",
			graph: {
				nodeID: opts.nodeID,
				ident: opts.ident,
				endpoint: opts.endpoint
			},
			links: []
		};
		if( opts.from ) {
			var link_id = "graph|link|"+opts.from.data.id+"|"+id;
			seedData.links.push({
					subject: {node: opts.from.data.id},
					object: {node: id},
					label: "belongs to",
					id: link_id
				});
		};
		if( opts.to ) {
			var link_id = "graph|link|"+opts.to.data.id+"|"+id;
			seedData.links.push({
					subject: {node: id},
					object: {node: opts.to.data.id},
					label: "belongs to",
					id: link_id
				});
		};
		return seedData;
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
		}).done(function(data){
			console.log(data);
			this.data.graph.node = data.nodes[this.data.graph.nodeID];
			this.dom.outer.empty();
			this.dom.outer.append( this.renderGraphNodeContent() );
		}.bind(this)).fail(function(){
			var r = $("<div>Failed to get data (TODO: add a 'retry' icon). Using cached version.</div>" );
			r.append( $("<div class='lqs_cached'></div>").append(this.renderGraphNodeContent()));
			this.dom.outer.empty();
			this.dom.outer.append( r );
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
				content.find( 'img,iframe' ).css("max-width","100%");
		} else if( this.data.graph.node.data.icon ) {
			content.html( $("<img style='width:100%;min-width:50px;max-width:100%' />").attr('src',this.data.graph.node.data.icon));
		} else {
			content.text( "<null>" );
		}	
		return content;
	}
}
