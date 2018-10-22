$(document).ready(function() {

	var layout = {
		nodes: [
			{
				id: 'a',
				top: 100,
				left: 100,
				width: 200,
				height: 200,
				title: 'Box A',
				content: 'This is a comment'
			},
			{
				id: 'b',
				top: 100,
				left: 500,
				width: 200,
				height: 200,
				title: 'Box B',
				content: 'This is also a comment'
			}
		],
		links: [
			{
				subject: { node: 'a' },
				object { node: 'b' }
			}
		]
	};
	
	var nodes;
	console.log( layout );	

	initPage( layout );

	function initPage( layout) {
		nodes = $('<div></div>');
		$('body').append(nodes);
		for( var i=0; i<layout.nodes.length; ++i ) {
			addNode( layout.nodes[i] );
		}
		nodes = $('<svg></svg>');
		$('body').append(nodes);
	}

	function addNode( node ) {
		// validate node TODO

		// create node
		var nodeDiv = $('<div class="webleau_node"></div>');
		var nodeTitle = $('<div class="webleau_node_title"></div>');
		var nodeContent = $('<div class="webleau_node_content"></div>');
		nodeDiv.append( nodeTitle );
		nodeDiv.append( nodeContent );
		nodes.append( nodeDiv );
		nodeDiv.draggable( { handle: ".webleau_node_title" });

		// apply all the settings
		nodeDiv.css('top',node.top);
		nodeDiv.css('left',node.left);
		nodeDiv.css('width',node.widt);
		nodeDiv.css('height',node.height);
		nodeTitle.text( node.title );
		nodeContent.text( node.content );
		nodeDiv.attr('id',node.id);
	}


});
