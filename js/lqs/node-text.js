

LQS_NodeTypes['text'] = class LQS_Node_Text extends LQS_Node {

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
				var div = $('<div class="lqs_node_edit"></div>');
				node.dom.edit = {};
				node.dom.edit.textarea = $(`<textarea class="normal-paste" style="width:${node.data.size.width-30}px; height: ${node.data.size.height-80}px;"></textarea>`);
				var buttons = $('<div style="margin-top:3%;text-align:right"></div>');
				var save = $('<button style="max-height:10%">OK</button>');	
				var cancel = $('<button style="float:right; max-height:10%">Cancel</button>');	
				div.append( node.dom.edit.textarea  );	
				div.append( buttons );
				buttons.append( save  );	
				buttons.append( cancel  );	
				node.dom.edit.textarea.focus();
				node.dom.edit.textarea.keyup((event)=>{
					if( event.which==13 && !event.shiftKey) { save.click(); }	
					if( event.which==27 ) { cancel.click(); }	
				});
		
				node.dom.edit.textarea.text( node.data.text );
				save.click( ()=>{
					var v = node.dom.edit.textarea.val().trim();
					if( v == "" ) { node.remove(); return; }
					node.data.text = v;
					// force a resize
					delete node.data.mainsize;
					delete node.data.size;
					node.setView("main");
				});
				cancel.click( ()=>{
					var v = node.dom.edit.textarea.val().trim();
					if( v == "" ) { node.remove(); return; }
					node.setView("main");
				});
				return div;
			},
			update: (node)=>{ 
				node.dom.edit.textarea.focus(); 
				node.dom.edit.textarea.text( node.dom.edit.textarea.text() );
			},
			dblclick: (node)=> { ; }
		});
	
		this.registerAction(
			"edit",
			"EDIT",
			()=>{ this.setView( "edit" ); } );
	}

	render() {
		return $('<div></div>').text( this.data.text );
	}	

	dblclick() {
		this.setView( 'edit' );
	}

}
