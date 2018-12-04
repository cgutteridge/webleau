

LQS_NodeTypes['embed'] = class LQS_Node_Embed extends LQS_Node {

	constructor( nodeData, lqs ) {
		super(nodeData,lqs);

		if( this.data.source.url ) {
			this.registerAction(
				"visit-source",
				"VISIT SOURCE",
				()=>{ window.open( this.data.source.url, "_blank" ); }
			);
			this.registerAction(
				"refersh-embed-info",
				"REFRESH EMBED",
				()=>{ 
					this.dom.content.text( "Refreshing..." ); 
					this.refreshFromSource();
				}
			);
		}
	}

	static makeSeed(opts) {
		// check opts: from,url
		var id = opts.url
		var seed = super.makeSeed(opts);
		seed.id = id;
		seed.type = "embed";
		seed.links = [];
		seed.source =  {url:opts.url};
		if( opts.from ) {
			var link_id = "embed|link|"+opts.from.data.id+"|"+seed.id;
			seed.links.push({
				subject: {node: opts.from.data.id},
				object: {node: seed.id},
				label: '',
				id: link_id
			});
		};
		return seed;
	}

	render() {
		var empty = true;
		var content = $('<div></div>');
		if( this.data.source.error ) {
			content.text( "ERROR: "+this.data.source.error );
			empty = false;
		} else if ( this.data.source.embed ) {
			content.html( this.data.source.embed );
			empty = false;
		} else if ( this.data.source.loaded ) {
			let img = null;
			if( this.data.source.image && this.data.source.image.url ) {
				img = $('<img />')
					.attr('src',this.data.source.image.url)
					.click(()=>{this.doAction('visit-source')})
					.attr('title','Click to visit source')
					.css('cursor','pointer');
			}
			if( this.data.source.description ) {
				if( this.data.source.image && this.data.source.image.url ) {
					img.css( 'float','right').css('padding','0 0 5px 5px').css('width','50%');
					content.append( img ); 
				}
				content.append( $('<div></div>').text( this.data.source.description ));
				empty = false;
			}
			else if( this.data.source.image && this.data.source.image.url ) {
				// image, no description
				content.append( img ); 
				empty = false;
			} 
		} else {
			content.text( "Loading..." ); 
		}

		this.fixup( content );

		if( this.data.source && this.data.source.url ) {
			var span = $('<div style="text-align:right">- </div>');
			content.append( span );
			span.append( $('<a>Source</a>').attr( 'href', this.data.source.url).attr('target','_blank'));
		}

		return content;
	}	
/*
 	ONly works if the server allows iframe reading
	renderFocus() {
		var iframe = $("<iframe width='100%' height='100%' />").attr("src", this.data.source.url );
		iframe.load( (e)=>{ console.log(e); } );
		return iframe;
	}
*/

	init() {
		super.init();
		this.refreshFromSource();
	}

	refreshFromSource() {
		$.ajax({
			method: "GET",
			data: { url: this.data.source.url },
			url: this.lqs.inspectorProxy
		}).done((ajaxData)=>{
			let url = this.data.source.url;
			this.set( 'source', ajaxData );
			this.set( 'source.url', url );
			this.set( 'source.loaded',  true);

			if( this.data.source.size && this.data.source.size.width && this.data.source.size.height) {
				this.set( 'size', { width: this.data.source.size.width+4, height: this.data.source.size.height+4 } );
			}
			if( this.data.source.image && this.data.source.image.url) {
				this.set( 'icon.url', this.data.source.image.url );
			}
			else if( this.data.source.image && this.data.source.image.url) {
				this.set( 'icon.url', this.data.source.image.url );
			}
			if( this.data.source.title ) {
				this.set( 'title', this.data.source.title );
			} else {
				this.set( 'title', this.data.source.url );
			}
		
			this.rerender();
			this.updatePosition();
			this.fitSize();
			//this.setView('icon');
		}).fail(()=>{
			this.data.source.error = "Metadata query failed";
			this.rerender();
		})
	}

}
