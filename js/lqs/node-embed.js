

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
		var empty = true;
		var content = $('<div></div>');
		if( this.data.source.embed ) {
			content.html( this.data.source.embed );
			empty = false;
		} else {
			if( this.data.source.image && this.data.source.image.url ) {
				content.append( $('<img style="float:right; padding: 0 0 5px 5px;width:50%" />').attr('src',this.data.source.image.url));;
				empty = false;
			
			}
			if( this.data.source.description ) {
				content.append( $('<div></div>').text( this.data.source.description ));
				empty = false;
			}
		}
		if( empty ) { content.text( "Loading..." ); }
/*
		if( this.data.source && this.data.source.url ) {
			var span = $('<div style="text-align:right">- </div>');
			content.append( span );
			span.append( $('<a>Source</a>').attr( 'href',this.data.source.url));
		}
*/
		content.find( 'a' ).attr("target","_blank");
		content.find( 'img,iframe' ).css("max-width","100%");
		//content.find( 'img,iframe' ).css("max-height","100%");
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
				this.data.size = {};
				this.data.size.width = this.data.source.size.width+4;
				this.data.size.height = this.data.source.size.height+4;
			}
			if( this.data.source.image && this.data.source.image.url) {
				this.data.icon.url = this.data.source.image.url;
			}
		
			this.data.source.url = url;
			this.updatePosition();
			this.refresh();
		}).fail(()=>{
			this.error = "Metadata query failed";
			this.refresh();
		})
	}
}
