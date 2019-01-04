
class LQS_Link {

	constructor( linkData, lqs ) {
		this.lqs = lqs;

 		this.data = linkData;
		if( !this.data.id  ) { this.data.id=LQS.uuid(); }
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		if( !subjectNode ) {
			alert( "Failed to link subjectNode "+JSON.stringify( this.data.subject ));
			return;
		}
		var objectNode = this.lqs.nodes[this.data.object.node];
		if( !objectNode ) {
			alert( "Failed to link objectNode "+JSON.stringify( this.data.object ));
			return;
		}

		// TODO check if these exist and handle exceptions	
		subjectNode.registerLink(this);
		objectNode.registerLink(this);

		this.dom = {};
		this.addDom();
	}

	addDom() {
 		this.dom.path = $(document.createElementNS("http://www.w3.org/2000/svg","path"));
		this.lqs.arrowsLayer.append( this.dom.path );
		if( this.lqs.linkStyle == 'string' ) {
			this.dom.path.attr( "stroke", "#f00" );
			this.dom.path.attr( "fill", "transparent" );
			this.dom.path.attr( "stroke-linecap", "round" );
		} else {
			this.dom.path.attr( "class", "lqs_link" );
			this.dom.path.attr( "marker-end", "url(#arrow)" );
		}

 		this.dom.fromText = $(document.createElementNS("http://www.w3.org/2000/svg","text"));
		this.dom.fromText.attr( "class", "lqs_link_from_text" );
		this.dom.fromText.id = this.dom.label_id;
		this.dom.fromText.text( this.data.label );
		this.lqs.labelsLayer.append( this.dom.fromText );
	}


	removeDom() {
		this.dom.path.remove();
		this.dom.fromText.remove();
	}

	updatePosition() {
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		var objectNode = this.lqs.nodes[this.data.object.node];
		var c1 = objectNode.realPos();
		var c2 = subjectNode.realPos();
		var pt1 = subjectNode.nearestPointTo( c1 );
		var pt2 = objectNode.nearestPointTo( c2 );
		if( pt1 && pt2 ) {
			if( this.lqs.linkStyle == 'string' ) {
				let dipsize = 50 * this.lqs.layoutScale;
				this.dom.path.attr('d',`M ${pt1.x} ${pt1.y} C ${pt1.x} ${pt1.y+dipsize}, ${pt2.x} ${pt2.y+dipsize}, ${pt2.x} ${pt2.y}` );
				this.dom.path.attr( "stroke-width", 4*this.lqs.layoutScale );
			} else { 
				this.dom.path.attr('d',`M ${pt1.x} ${pt1.y} L ${pt2.x} ${pt2.y}` );
			}
			this.dom.fromText.attr('x',(pt1.x+(pt2.x-pt1.x)/4));
			this.dom.fromText.attr('y',(pt1.y+(pt2.y-pt1.y)/4));
			this.dom.fromText.css('font-size',(10*this.lqs.layoutScale)+"px"); 
		}
	}

	remove() {
		this.lqs.change( { action: 'link-remove', 'link':this.data.id } );
	}

}
// End LQSLink
