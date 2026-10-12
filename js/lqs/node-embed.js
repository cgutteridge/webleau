

LQS_NodeTypes['embed'] = class LQS_Node_Embed extends LQS_Node {

	/** Card border allowance around a player, in virtual px. */
	static FRAME = 4;
	/** Must match the title bar height in LQS_ViewSpec.updatePosition. */
	static TITLE_HEIGHT = 18;

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
			content.html( this.data.source.embed ).addClass( 'lqs_embed_player' );
			content.find( 'iframe, video' ).removeAttr( 'width' ).removeAttr( 'height' );
			// player fills the card; "VISIT SOURCE" in the card menu replaces the footer link
			return content;
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

	/**
	 * Virtual card size that frames the provider's player exactly
	 * (player box plus the title bar), independent of the current zoom.
	 *
	 * @returns {{width:number,height:number}|null} null when the source has no sized player
	 */
	playerSize() {
		var source = this.data.source;
		if( !source.embed || !source.size || !source.size.width || !source.size.height ) {
			return null;
		}
		return {
			width: source.size.width + LQS_Node_Embed.FRAME,
			height: source.size.height + LQS_Node_Embed.TITLE_HEIGHT + LQS_Node_Embed.FRAME };
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

			let playerSize = this.playerSize();
			if( playerSize ) {
				this.set( 'size', playerSize );
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
			if( playerSize ) {
				this.updatePosition();
				this.updateLinksPosition();
			} else {
				this.fitSize();
			}
			//this.setView('icon');
		}).fail(()=>{
			this.data.source.error = "Metadata query failed";
			this.rerender();
		})
	}

}
