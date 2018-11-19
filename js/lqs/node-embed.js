

LQS_NodeTypes['embed'] = class LQS_Node_Embed extends LQS_Node {

	constructor( nodeData, lqs ) {
		super(nodeData,lqs);

		if( this.data.source.url ) {
			this.registerAction(
				"visit-source",
				"VISIT SOURCE",
				()=>{ window.open( this.data.source.url, "_blank" ); }
			);
		}
	}

	render() {
		var content = $('<div>Loading...</div>');
		return content;
	}	

	init() {
		super.init();
		$.ajax({
			method: "GET",
			data: { url: this.data.source.url },
			url: this.lqs.inspectorProxy
		}).done((ajaxData)=>{
			let url = this.data.source.url;
			this.data.source = ajaxData;
			if( this.data.source.size ) {
				this.data.size = this.data.source.size;
			}
			this.data.source.url = url;
			this.refresh();
		}).fail(()=>{
			this.error = text+"\n(metadata query failed)";
			this.refresh();
		})
	}
}
/*}

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


