

LQS_NodeTypes['text'] = class LQS_Node_Text extends LQS_Node {
	render() {
		return $('<div></div>').text( this.data.text );
	}	
}
