
class LQS_ViewSpec {
	
	constructor(params) {
		if( params.enter  ) { this.enter = params.enter; }	
		if( params.leave  ) { this.leave = params.leave; }	
		if( params.render ) { this.render = params.render; }	
		if( params.title  ) { this.title = params.title; }	
		if( params.update ) { this.update = params.update; }	
		if( params.init   ) { this.init = params.init; }	
		if( params.destroy) { this.destroy = params.destroy; }	
		if( params.setTitle) { this.setTitle = params.setTitle; }	
		if( params.setContent) { this.setContent = params.setContent; }	
		if( params.realSize) { this.realSize = params.realSize; }	
		if( params.updatePosition) { this.updatePosition = params.updatePosition; }	
		if( params.dblclick) { this.dblclick = params.dblclick; }	
		if( params.dblclickTitle) { this.dblclickTitle = params.dblclickTitle; }	
		this.id = params.id;
	}

	enter(node) {}

	leave(node) {}

	render(node) { return $(`<div>Viewspec ${this.id} has no render method defined!</div>`); }

	title(node) { return node.data.title }

	setTitle(node,title) {
		if( title == "" ) {
			node.dom.title.addClass("lqs_node_empty_title");
		} else {
			node.dom.title.removeClass("lqs_node_empty_title");
		}
		node.dom.titleText.text( title );
	}

	setContent(node,content) {
		node.dom.content.empty().append( content );
	}

	update(node) {}

	init(node) {}

	destroy(node) {}

	updatePosition(node) {
		var realPos = node.realPos();
		var realSize = node.realSize();
		node.dom.outer.css('left',realPos.x-realSize.width/2 );
		node.dom.outer.css('top', realPos.y-realSize.height/2 );
		node.dom.outer.css('width', realSize.width );
		node.dom.outer.css('height',realSize.height );
		var titleHeight = (18*node.lqs.layoutScale);
		var fontHeight  = (16*node.lqs.layoutScale);
		node.dom.content.css('height',node.data.height*node.lqs.layoutScale-titleHeight ); // height of box minus borders and title
		node.dom.title.css('font-size',fontHeight+"px");
		node.dom.title.css('height',   titleHeight+"px" );
	}

	realSize(node) {
		return {
			width:  node.data.size.width  * node.lqs.layoutScale,
			height: node.data.size.height * node.lqs.layoutScale };
	}

	dblclick(node) {	
		node.dblclick();
	}

	dblclickTitle(node) {	
		node.dblclickTitle();
	}
}
