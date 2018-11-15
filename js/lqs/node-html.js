

LQS_NodeTypes['html'] = class LQS_Node_HTML extends LQS_Node {
	render() {
		return LQS.sanitiseHtml(this.data.html);
	}
}

