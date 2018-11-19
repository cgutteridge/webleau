

LQS_NodeTypes['cited'] = class LQS_Node_Cited extends LQS_Node {

	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.registerView(
			"no-source", 
			() => { // enter
				this.showNoSourceView();
				this.fitSize();
				this.hideAction( 'no-source' );
			},
			() => {
				this.showAction( 'no-source' );
			}
		);

		this.registerAction(
			"no-source",
			"HIDE SOURCE INFO",
			()=>{ this.setView( "no-source" ); } );
		if( this.data.source.url ) {
			this.registerAction(
				"visit-source",
				"VISIT SOURCE",
				()=>{ window.open( this.data.source.url, "_blank" ); }
			);
		}
	}

	render() {
		var content = $('<div></div>');
		content.append( LQS.sanitiseHtml(this.data.html) );
		var cite = $('<div style="float:right;font-size:70%">- </div>');
		if( this.data.source.creator && this.data.source.creator[0] && this.data.source.creator[0].name ) {
			var creator;
			if( this.data.source.creator[0].url ) {
				creator = $('<a></a>').attr('href',this.data.source.creator[0].url).text( this.data.source.creator[0].name );
			} else {
				creator = $('<span></span>').text( this.data.source.creator[0].name );
			}
			cite.append( creator );
			cite.append( '. ' );
		}
		if( this.data.source.title ) {
			cite.append( this.data.source.title + ". " );
		}

		var source = $('<a></a>').attr('href',this.data.source.url).text( 'Source' );
		cite.append( source );
		cite.append( '. ' );
		if( this.data.source.copyTime ) {
			var d = new Date( this.data.source.copyTime*1000 );
			cite.append( 'Copied '+d+".");
		}
		else if( this.data.source.pasteTime ) {
			var d = new Date( this.data.source.pasteTime*1000 );
			cite.append( 'Pasted '+d+".");
		} 
		content.append(cite);

		return content;
	}	


	showNoSourceView() {
		this.dom.content.empty();
		this.dom.content.append( LQS.sanitiseHtml(this.data.html) );
	}

}
