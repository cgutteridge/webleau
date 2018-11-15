
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

		var arrowsG = document.getElementById('svg_arrows');
		var labelsG = document.getElementById('svg_labels');

		this.dom = {};

		this.dom.id = "link_"+LQS.uuid();
 		var line = document.createElementNS("http://www.w3.org/2000/svg","line");
		line.id = this.dom.id;
		line.setAttribute( "class", "lqs_link" );
		line.setAttribute( "marker-end", "url(#arrow)" );
		arrowsG.appendChild( line );

		this.dom.label_id = "link_from_"+LQS.uuid();
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
	}


	updatePosition() {
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		var objectNode = this.lqs.nodes[this.data.object.node];
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
			$("#"+this.dom.label_id).css('font-size',(10*this.lqs.layoutScale)+"px"); 
/*
			$("#"+this.dom.to_id).attr('x',pt2.x);
			$("#"+this.dom.to_id).attr('y',pt2.y);
*/
		}
	}

	remove() {
		var subjectNode = this.lqs.nodes[this.data.subject.node];
		var objectNode = this.lqs.nodes[this.data.object.node];
		subjectNode.deRegisterLink(this);
		objectNode.deRegisterLink(this);
		delete this.lqs.links[this.data.id];
		$("#"+this.dom.id).remove();
		$("#"+this.dom.label_id).remove();
		$("#"+this.dom.to_id).remove();
	}
}
// End LQSLink
