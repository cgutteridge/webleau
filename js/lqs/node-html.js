

LQS_NodeTypes['html'] = class LQS_Node_Text extends LQS_Node {

	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.registerView({
			id: "edit", 
			enter: (node) => { // enter
				node.data.size.width = ((LQS.winWidth() /2))/node.lqs.layoutScale;
				node.data.size.height= ((LQS.winHeight()/2))/node.lqs.layoutScale;
				node.dom.outer.addClass('lqs_node_notitle');
			},
			leave: (node) => {
				node.dom.outer.removeClass('lqs_node_notitle');
				node.showAction( 'edit' );
			},
			render: (node) => {
				node.dom.edit = {};
				node.dom.edit.div = $('<div class="lqs_node_edit"></div>');
				node.dom.content.append( node.dom.edit.div );
				node.dom.edit.textarea = $(`<textarea class="normal-paste" style="width:${node.data.size.width-30}px; height: ${node.data.size.height-80}px;"></textarea>`);
				var buttons = $('<div style="margin-top:3%;text-align:right"></div>');
				node.dom.edit.save = $('<button style="max-height:10%">OK</button>');	
				node.dom.edit.cancel = $('<button style="float:right; max-height:10%">Cancel</button>');	
				node.dom.edit.div.append( node.dom.edit.textarea  );	
				node.dom.edit.div.append( buttons );
				buttons.append( node.dom.edit.save  );	
				buttons.append( node.dom.edit.cancel  );	
				node.dom.edit.textarea.focus();
				node.dom.edit.textarea.keyup(function(event){
					if( event.which==13 && !event.shiftKey) {
						node.dom.edit.save.click();
					}	
					if( event.which==27 ) {
						node.dom.edit.cancel.click();
					}	
				});
		
				node.dom.edit.textarea.html( node.data.html );
				node.dom.edit.save.click( function() {
					var v = node.dom.edit.textarea.val().trim();
					if( v == "" ) { node.remove(); return; }
					node.data.html = v;
					// force a resize
					delete node.data.mainsize;
					delete node.data.size;
					node.setView("main");
				});
				node.dom.edit.cancel.click( function() {
					var v = node.dom.edit.textarea.val().trim();
					if( v == "" ) { node.remove(); return; }
					node.setView("main");
				});
			}
		});
	
		this.registerAction(
			"edit",
			"EDIT",
			()=>{ this.setView( "edit" ); } );
	}

	render() {
		return $('<div></div>').html( this.data.html );
	}	

}
