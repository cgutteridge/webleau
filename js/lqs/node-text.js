

LQS_NodeTypes['text'] = class LQS_Node_Text extends LQS_Node {

	constructor( nodeData, lqs ) {
		super(nodeData,lqs);
		this.registerView(
			"edit", 
			() => { // enter
				this.showEditView();
				this.hideAction( 'edit' );
			},
			() => {
				this.showAction( 'edit' );
			}
		);
	
		this.registerAction(
			"edit",
			"EDIT",
			()=>{ this.setView( "edit" ); } );
	}

	render() {
		return $('<div></div>').text( this.data.text );
	}	


	showEditView() {
		this.data.size.width = ((LQS.winWidth() /2))/this.lqs.layoutScale;
		this.data.size.height= ((LQS.winHeight()/2))/this.lqs.layoutScale;
		this.dom.outer.addClass('lqs_node_notitle');
		this.dom.edit = {};
		this.dom.edit.div = $('<div class="lqs_node_edit"></div>');
		this.dom.content.append( this.dom.edit.div );
		this.dom.edit.textarea = $(`<textarea class="normal-paste" style="width:${this.data.size.width-30}px; height: ${this.data.size.height-80}px;"></textarea>`);
		var buttons = $('<div style="margin-top:3%;text-align:right"></div>');
		this.dom.edit.save = $('<button style="max-height:10%">OK</button>');	
		this.dom.edit.cancel = $('<button style="float:right; max-height:10%">Cancel</button>');	
		this.dom.edit.div.append( this.dom.edit.textarea  );	
		this.dom.edit.div.append( buttons );
		buttons.append( this.dom.edit.save  );	
		buttons.append( this.dom.edit.cancel  );	
		this.dom.edit.textarea.focus();
		this.dom.edit.textarea.keyup(function(event){
			if( event.which==13 && !event.shiftKey) {
				this.dom.edit.save.click();
			}	
			if( event.which==27 ) {
				this.dom.edit.cancel.click();
			}	
		}.bind(this));

		this.dom.edit.textarea.text( this.data.text );
		this.dom.edit.save.click( function() {
			var v = this.dom.edit.textarea.val().trim();
			if( v == "" ) { this.remove(); return; }
			this.data.text = v;
			delete this.data.mainsize;
			delete this.data.size;
			this.setView("main");
		}.bind(this));
		this.dom.edit.cancel.click( function() {
			var v = this.dom.edit.textarea.val().trim();
			if( v == "" ) { this.remove(); return; }
			this.setView("main");
		}.bind(this));
	}


}
