
// effectively this is a static property
var LQS_NodeTypes = {};
var LQS_ClickStart = null;

class LQS {
	constructor() {
		this.nodesLayer = null;
		this.bgSvgLayer = null;
		this.fgSvgLayer = null;

		this.nodes = {};
		this.links = {};
		this.layoutScale = 1;
		this.offset = new LQS_Point(5000,5000);
		this.curDown = false;
		this.layoutScaleSlider = null;
		this.defaultInspectorProxy = 'https://www.southampton.ac.uk/~totl/lqs-inspector-v1/';
		this.mouse = new LQS_Point( this.offset.x, this.offset.y );
		this.mouseOverBackground = true;
		this.seedsBySource = {};
		this.seedsByTarget = {};
		this.seedsByID = {};

		// things to load/save
		this.inspectorProxy = this.defaultInspectorProxy;
		this.linkStyle = 'default';

		this.bgSvgLayer = $('<svg class="lqs_bgsvg"><g id="axis"><line id="vaxis" /><line id="haxis" /></g></svg>');
		$('body').append(this.bgSvgLayer);
		this.bgSvgLayer.html( this.bgSvgLayer.html() ); // reset SVG layer 
		$('#vaxis').attr('x1',this.offset.x).attr('y1',0).attr('x2',this.offset.x).attr('y2',this.offset.y*2);
		$('#haxis').attr('x1',0).attr('y1',this.offset.y).attr('x2',this.offset.x*2).attr('y2',this.offset.y);

		this.nodesLayer = $('<div class="lqs_nodes"></div>');
		$('body').append(this.nodesLayer);

		this.fgSvgLayer  = $(document.createElementNS("http://www.w3.org/2000/svg","svg"));
		var defs         = $(document.createElementNS("http://www.w3.org/2000/svg","defs"));
		var marker       = $(document.createElementNS("http://www.w3.org/2000/svg","marker"));
		var path         = $(document.createElementNS("http://www.w3.org/2000/svg","path"));
		this.arrowsLayer = $(document.createElementNS("http://www.w3.org/2000/svg","g"));
		this.labelsLayer = $(document.createElementNS("http://www.w3.org/2000/svg","g"));
		defs.append(marker);
		marker.append(path);
		this.fgSvgLayer.append( defs );
		this.fgSvgLayer.append( this.arrowsLayer );
		this.fgSvgLayer.append( this.labelsLayer );
		$('body').append(this.fgSvgLayer);

		// svg needs capitals in attrs the jquery chomps 
		this.fgSvgLayer.attr("class","lqs_svg");
		marker[0].setAttribute( "markerWidth",11 );
		marker[0].setAttribute( "markerHeight",10 );
		marker[0].setAttribute( "refX",8 );
		marker[0].setAttribute( "refY",3 );
		marker[0].setAttribute( "markerUnits","strokeWidth" );
		marker[0].setAttribute( "id","arrow" );
		marker[0].setAttribute( "orient","auto" );
		path.attr("d","M0,0 L0,6 L9,3 z").attr("fill","#666");
	
		var rpt = this.toReal(new LQS_Point(0,0));
		window.scrollTo( rpt.x-LQS.winWidth()/2, rpt.y-LQS.winHeight()/2 );

		//$('body').append( $('<div class="ident">liquid space</div>'));

		/* MAIN EVENTS */

		// location of mouse on tablau
		$(document).on( "mousemove", ( event )=> {
			this.mouse = new LQS_Point( event.pageX, event.pageY );
		});
		/* each time the mouse enters something, if it's over the background set a flag */
		this.nodesLayer.on( "mouseover", (event)=>{
			this.mouseOverBackground = (event.target===this.nodesLayer[0]);
		});
	
	
		/* fancy stuff with paste */
		$('body').on('paste', (event)=> {
			// if we are focused on a normal-paste element just skip this handler
			if( $('.normal-paste:focus').length ) { return; }
			this.pasteToBackground(event);
		});


		this.nodesLayer.droppable( {
			scope: 'seeds',
			hoverClass: "drop-hover",
			tolerance: "pointer",
			drop: (event,ui)=>{ this.seedDrop(event,ui); }
		});

	
		/* zoom on mousewheel, only when mouse over background */
		/* otherwise do nothing, TODO allow scroll in things with a scrollbar other than the background */
		this.nodesLayer.bind('wheel mousewheel', (e)=>{
			if( !this.mouseOverBackground ) { return; }
			var delta;
	
			if (e.originalEvent.wheelDelta !== undefined) {
				delta = e.originalEvent.wheelDelta;
			} else {
				delta = e.originalEvent.deltaY * -1;
			}
			this.layoutScaleSlider.val( parseFloat(this.layoutScaleSlider.val())+delta*0.001 );
			this.layoutScaleSlider.trigger('propertychange');
		});
	
		// prevent gestures going up to the ipad OS
		document.addEventListener('gesturestart', (e)=> { e.preventDefault(); return false; });

		// stop
		var hammertime = new Hammer.Manager( this.nodesLayer[0], {} );

		// add ipad pinch gesture
		hammertime.add(new Hammer.Pinch({}));
		hammertime.get('pinch').set({ enable: true });
		var scaleAtStartOfPinch;
		hammertime.on("pinchstart", (e)=> {
			scaleAtStartOfPinch = parseFloat(this.layoutScaleSlider.val());
		});
		hammertime.on("pinchmove", (e)=> {
			this.layoutScaleSlider.val( scaleAtStartOfPinch + Math.log(e.scale) ) ;
			this.layoutScaleSlider.trigger('propertychange');
		});

		/* drag background to scroll (ipad and desktop) */
		hammertime.add(new Hammer.Pan({threshold:0}));
		hammertime.get('pan').set({ enable: true });
		var posBeforePan;
		hammertime.on("panstart", (e)=> {
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				posBeforePan = new LQS_Point( parseInt($(document).scrollLeft()), parseInt($(document).scrollTop() ) );
			} else {
				posBeforePan = null;
			}
		});
		hammertime.on("panmove", (e)=> {
			if( $(e.target).hasClass( "lqs_nodes" ) && posBeforePan ) {
				$(document).scrollLeft( posBeforePan.x - e.deltaX );
				$(document).scrollTop(  posBeforePan.y - e.deltaY );
			}
		});

		/* double tap */
		hammertime.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );
		// Single tap recognizer
		hammertime.add( new Hammer.Tap({ event: 'singletap' }) );
		hammertime.get('doubletap').recognizeWith('singletap');
		// we only want to trigger a tap, when we don't have detected a doubletap
		hammertime.get('singletap').requireFailure('doubletap');
		hammertime.on("doubletap", (e)=> {
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				var nodeData = {
					id: LQS.uuid(),
					pos: this.toVirtual( { x: e.srcEvent.pageX, y: e.srcEvent.pageY } ),
					title: "",
					text: "",
					type: 'text',
					meta: {}
				};
				var comment = this.addNode(nodeData);
				comment.setView('edit');
				comment.reveal();
			}
		});
		// get rid of open menus on touch
		hammertime.on("singletap", (e)=> {
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				$('.lqs_card_menu').hide();
			}
		});
		
	
		// remember where a click started 
		$(document).on("mousedown", (e)=> { LQS_ClickStart = { x: e.pageX, y: e.pageY }; } );

		// add control panel
		this.addControlPanel();	
	}

	addControlPanel() {
		/* CONTROLS */

		var controlsWrapper = $('<div class="controls_wrapper"><div class="controls_icon"><img src="'+LQS.logo()+'" /></div></div>');
		var controls = $('<div class="controls"></div>');
		$(controlsWrapper).append(controls);
		$('body').append(controlsWrapper);

		//controls.append( $('<div style="font-family:fantasy;font-size:120%;margin-bottom:1em;padding-bottom:0.1em;border-bottom: solid 1px #999;">Liquid Space</div>'));

		/* CONTROLS: sliders */

		this.layoutScaleSlider = $('<input type="range" value="0" min="-8" max="2" step="0.001" />');
		var layoutScaleDisplay = $('<span>100%</span>');
		controls.append( $('<div>Layout scale: </div>' ).append(layoutScaleDisplay));
		controls.append( $('<div></div>').css('margin-bottom', '8px' ).append(this.layoutScaleSlider) );
		controls.append( this.layoutScaleSlider );
		//controls.append( contentToggle );
		this.layoutScaleSlider.on('propertychange input', (event)=> {
			// find coords of screen centre
			var screenMiddleVirt = this.toVirtual(LQS.screenMiddle());
			this.layoutScale = Math.pow(2,this.layoutScaleSlider.val());
			var perc = Math.round( this.layoutScale*100000 ) / 1000;
			layoutScaleDisplay.text( ""+perc+"%" );
			this.nodesLayer.css( 'font-size',perc+"%" );
			var screenMiddleReal = this.toReal(screenMiddleVirt);
			window.scrollTo( screenMiddleReal.x-LQS.winWidth()/2, screenMiddleReal.y-LQS.winHeight()/2 );
			this.updateAllPositions();
		});


		/* CONTROLS: tools */
		var controlTools = $('<div class="this"></div>');
		controls.append( $("<div style='margin-top:1em'>Tools</div>"));
		controls.append(controlTools);

		// reset
		var resetTool = $('<div title="reset" class="lqs_tool">Reset View</div>');
		controlTools.append( resetTool );
		resetTool.click( ()=> {
			this.layoutScaleSlider.val(0).trigger('input');
			this.centrePage();
			this.updateAllPositions();
		});

		// quine download
		var quineTool = $('<div title="quine" class="lqs_tool">Quine</div>');
		controlTools.append( quineTool );
		quineTool.click( ()=>{
			var head = $('head').html();
			var jsonLayout = JSON.stringify( this.getLayout());
			jsonLayout = jsonLayout.replace( /<\/script>/ig, "<\/\"+\"script>" );
			var page = `<!DOCTYPE html>\n<html lang='en'><head>${head}</head><body></body><script>$(document).ready( ()=>{ var lqs = new LQS(); lqs.setLayout( ${jsonLayout} ); });</`+"script></html>" ;
			var filename = "liquid-space."+Date.now()+".html";
			LQS.download( filename, page, "text/html" );
		});

		// purge everything
		var purgeTool = $('<div title="purge" class="lqs_tool">Purge</div>');
		controlTools.append( purgeTool );
		purgeTool.click( ()=>{
			if( confirm( "Purge layout? This will remove all cards and links from the page." ) ) {
				this.purgeLayout();
			}
			this.layoutScaleSlider.val(0).trigger('input');
			this.centrePage();
		});

		// strings and arrows
		var arrowTool = $('<div title="arrow" class="lqs_tool">Arrow Links</div>');
		var stringTool = $('<div title="string" class="lqs_tool">String Links</div>');
		controlTools.append( arrowTool );
		controlTools.append( stringTool );
		arrowTool.click( ()=> {
			arrowTool.hide();
			stringTool.show();
			this.setLinkStyle( 'arrow' );
		});
		stringTool.click( ()=> {
			arrowTool.show();
			stringTool.hide();
			this.setLinkStyle( 'string' );
		});
		if( this.linkStyle == 'string' ) {	
			stringTool.hide();
		}else {
			arrowTool.hide();
		}




		/* CONTROLS: load/save */
		var controlIO = $('<div class="lqs_controls_tools"></div>');
		var ioTextarea = $('<textarea class="normal-paste" placeholder="save/load: hit save and copy this, or paste in here and hit load" style="width: 100%; height: 10%;" id="lqs_io"></textarea>');
		controls.append( $("<div style='margin-top:1em'>Upload/Download</div>"));
		controls.append( ioTextarea );
		var downloadTool = $('<div title="download" class="lqs_tool">&darr;<div>');
		controlIO.append( downloadTool );
		var uploadTool = $('<div title="upload" class="lqs_tool">&uarr;</div>');
		controlIO.append( uploadTool );
		controls.append(controlIO);
		downloadTool.click( ()=>{
			var layout = this.getLayout();
			ioTextarea.val( JSON.stringify( layout ) );
			ioTextarea.select();
		});
		uploadTool.click( ()=>{
			var layout = JSON.parse( ioTextarea.val() );
			if( !layout ) {
				alert( "LOADING ERROR. Rewind tape and try again.");
				return;
			}
	
			this.setLayout(layout);
		});
		
		// graph

		controls.append( $("<div style='margin-top:1em'>Seeds</div>"));

		var graphSeed = $('<div class="lqs_seed">Data Connector</div>');
		controls.append( graphSeed );
		this.attachSeed( graphSeed, LQS_NodeTypes['graph-connect'].makeSeed({sourceCard:{data:{id:'//control-panel'}}}));

		var graphSeedLex = $('<div class="lqs_seed">Webscience Lexcon</div>');
		controls.append( graphSeedLex );
		this.attachSeed( graphSeedLex, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://www.soton.ac.uk/~totl/webscience-graph/' }));

		var graphSeedWPDemo = $('<div class="lqs_seed">Blog Demo</div>');
		controls.append( graphSeedWPDemo );
		this.attachSeed( graphSeedWPDemo, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://www.soton.ac.uk/~totl/wordpress-graph-demo/' }));

		var graphSeedWPDemo = $('<div class="lqs_seed">JRNL Blog</div>');
		controls.append( graphSeedWPDemo );
		this.attachSeed( graphSeedWPDemo, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://jrnl.global/wp-json/graph-api/v1/query' }));


	}	/* end controls */



	toVirtual(realpt) {
		return new LQS_Point( 
			(realpt.x-this.offset.x)/this.layoutScale,
			(realpt.y-this.offset.y)/this.layoutScale
		);
	}

	toReal(virtpt) {
		return new LQS_Point( 
			virtpt.x*this.layoutScale+this.offset.x,
			virtpt.y*this.layoutScale+this.offset.y
		);
	}
	
	deregisterCardSeeds( sourceID ) {
		if( !this.seedsBySource[sourceID] ) {
			// hopefully it just had no seeds
			return;
		}
		var ids = Object.keys( this.seedsBySource[sourceID] );
		for( let i=0; i<ids.length; ++i ) {
			var id = ids[i];
			var seed = this.seedsBySource[sourceID][id].seed;
			
			delete this.seedsByTarget[seed.id][id];
			delete this.seedsBySource[sourceID][id];
			delete this.seedsByID[id];
		}
	}

	attachSeed( el, seed ) {
		var id = LQS.uuid(); // unique ID for this element.
		// nb. seed.id is the ID of the node that comes from the seed so is not unique	
		if( ! this.seedsBySource[seed.sourceCard.data.id] ) { this.seedsBySource[seed.sourceCard.data.id]={}; }
		this.seedsBySource[seed.sourceCard.data.id][id] = { seed: seed, el: el };
		if( ! this.seedsByTarget[seed.id] ) { this.seedsByTarget[seed.id]={}; }
		this.seedsByTarget[seed.id][id] = { seed: seed, el: el };
		this.seedsByID[id] = { seed: seed, el: el };
		el.attr('data-seed',id );
		LQS.noDragClick( el, ()=>{ this.growSeed(seed,{}); }); // click grows with NO GEOMETRY
		el.draggable( { 
			scope: 'seeds',
  			helper: "clone",
			appendTo: this.nodesLayer,
			start: (event,ui)=>{
				el.addClass('lqs_seed_dragged_from');
			},
			stop: (event,ui)=>{
				el.removeClass('lqs_seed_dragged_from');
			},
			containment: $('.lqs_nodes'),
			opacity: 0.8,
			scroll: true,
//			drag: node.dragged.bind(node),
		});
		if( this.nodes[seed.id] ) {
			this.takeSeed( id );
		} else { 
			this.returnSeed( id );
		} 
	}

	takeSeed( seedID ) {
		if( this.seedsByID[seedID] ) {	
			this.seedsByID[seedID].el.addClass('lqs_seed_hole').removeClass('lqs_seed_filled').draggable('disable');
		}
	}

	returnSeed( seedID ) {
		if( this.seedsByID[seedID] ) {	
			this.seedsByID[seedID].el.removeClass('lqs_seed_hole').addClass('lqs_seed_filled').draggable('enable');
		}
	}

	seedDrop( event, ui ) {
		var seedInfo = this.seedsByID[ui.draggable.attr('data-seed')];
		if( ! seedInfo ) {
			console.log( "Seed Drop action failed - unknown seed dropped:", ui.draggable.attr('data-seed'), ui.draggable );
			return;
		}
		var geometry = { pos: this.toVirtual( { x: event.pageX, y: event.pageY } ) };
		this.growSeed( seedInfo.seed, geometry );
	}

	// geometry is things that are decided when the seed is grown like x,y 
	growSeed( seed, geometry ) {
		var sourceCard = seed.sourceCard;
		var sourceCardAction = seed.sourceCardAction;

		// copy the seed to make the nodeData
		var nodeData = $.extend(true, {}, seed);
		nodeData = Object.assign( nodeData, geometry );
		if( nodeData.id && this.nodes[nodeData.id] ) {
			// already exists, lets just bring it into view
			// but we'll still crate links if they are needed
			this.nodes[nodeData.id].reveal();
		} else {
			delete nodeData.sourceCard;
			delete nodeData.sourceCardAction;

			if( !nodeData.pos ) {
				nodeData.pos = this.toVirtual( LQS.screenMiddle() );
			}
			if( !nodeData.hasOwnProperty("id") ) {	
				nodeData.id = LQS.uuid();
			}
			var node = this.addNode( nodeData );	
			if( !nodeData.hasOwnProperty("size") ) {	
				node.data.size = {};
				node.fitSize();
			}
		}
	
		if( seed.links ) {
			for( var i=0; i<seed.links.length; ++i ) {
				this.addLink( seed.links[i] );
			}
		}

		if( sourceCardAction && sourceCard ) {
			var action = sourceCard.actionsByID[sourceCardAction];
			action.fn();
		}

		return node;
	}

	getLayout() {
		var layout = { nodes: [], links: [] };
		var linkKeys = Object.keys( this.links );
		for( var i=0;i<linkKeys.length;++i ) {
			layout.links.push( this.links[linkKeys[i]].data );
		}

		var nodeKeys = Object.keys( this.nodes );
		for( var i=0;i<nodeKeys.length;++i ) {
			layout.nodes.push( this.nodes[nodeKeys[i]].data );
		}

		layout.inspectorProxy = this.inspectorProxy;
		layout.linkStyle = this.linkStyle;
		return layout;
	}

	// erase all stuff
	purgeLayout() {
		var linkKeys = Object.keys(this.links);
		for( var i=0; i<linkKeys.length; ++i ) {
			this.links[linkKeys[i]].remove();
		}
		var nodeKeys = Object.keys(this.nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			this.nodes[nodeKeys[i]].remove();
		}
	}

	setLinkStyle( style ) {
		this.linkStyle = style;
		var linkKeys = Object.keys(this.links);
		for( var i=0; i<linkKeys.length; ++i ) {
			this.links[linkKeys[i]].removeDom();
			this.links[linkKeys[i]].addDom();
			this.links[linkKeys[i]].updatePosition();
		}
	}

	setLayout(layout) {
		this.purgeLayout();
		for( var i=0; i<layout.nodes.length; ++i ) {
			this.addNode( layout.nodes[i] );
		}
		for( var i=0; i<layout.links.length; ++i ) {
			this.addLink( layout.links[i] );
		}

		this.inspectorProxy = this.defaultInspectorProxy;
		if( layout.inspectorProxy ) {
			this.inspectorProxy = layout.inspectorProxy;
		}
		this.linkStyle = 'default';
		if( layout.linkStyle ) {
			this.linkStyle = layout.linkStyle;
		}
	}

	centrePage() {
		this.focusPage( new LQS_Point(0,0) );
	}

	// focus the real scroll window onto a point on the virtual layout
	focusPage( vpt ) {
		var rpt = this.toReal(vpt);
		$('html,body').animate({
			'scrollLeft': rpt.x-LQS.winWidth()/2,
			'scrollTop':  rpt.y-LQS.winHeight()/2
		},1000);
	}
		

	updateAllPositions() {
		var nodeKeys = Object.keys(this.nodes);
		for( var i=0; i<nodeKeys.length; ++i ) {
			this.nodes[nodeKeys[i]].updatePosition();
		}
		var linkKeys = Object.keys(this.links);
		for( var i=0; i<linkKeys.length; ++i ) {
			this.links[linkKeys[i]].updatePosition();
		}
	}


	addLink( linkData ) {
		// validate link TODO
		if( this.links[linkData.id] ) { return null; }
		if( !this.nodes[linkData.subject.node] ) { return null; }
		if( !this.nodes[linkData.object.node] ) { return null; }
		
		// create link
		var link = new LQS_Link( linkData, this );
		this.links[link.data.id] = link;
		this.links[link.data.id].updatePosition();
		return this.links[link.data.id];
	}

	addNode( nodeData ) {
		// validate node TODO

		var nodeClass;
		if( !nodeData.type ) {
			nodeClass = LQS_NodeTypes['html'];
		} else if( LQS_NodeTypes[nodeData.type] ) {
			nodeClass = LQS_NodeTypes[nodeData.type];
		} else {
			nodeClass = LQS_NodeTypes["error"];
		}
		
		// create node
		const NC = nodeClass;
		var node = new NC( nodeData, this );
		this.nodes[node.data.id] = node;
		this.nodes[node.data.id].init(); // things to do after the constructor
		this.nodes[node.data.id].updatePosition();

		// denature any visible seeds to this node
		if( this.seedsByTarget[node.data.id] ) {
			var ids = Object.keys( this.seedsByTarget[node.data.id] );
			for( let i=0;i<ids.length;++i ) {
				this.takeSeed( ids[i] );
			}
		}


		return this.nodes[node.data.id];
	}

	// nb. this is the final tidy up, use node.remove() to remove a node
	removeNode( node ) {
		if( this.seedsByTarget[node.data.id] ) {
			var ids = Object.keys( this.seedsByTarget[node.data.id] );
			for( let i=0;i<ids.length;++i ) {
				this.returnSeed( ids[i] );
			}
		}
		delete this.nodes[node.data.id];
	}


	pasteToBackground(event) {
		var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
		
		var text = clipboardData.getData( 'text/plain' );
		var html = clipboardData.getData( 'text/html' );
		var nodeData = {};
		nodeData.pos = this.toVirtual(this.mouse);

		if( html ) {	
			var thtml = html;
			//  moving html copypasta between major browsers adds these cruft tags which we will 
			//  trim for looking for special source
			thtml = thtml.replace( /<\/?(meta|html|head|body)[^>]*>/, '' );
			var dom = $($.parseHTML(thtml));
			if( dom.attr( 'data-citation-source' ) ) {
				nodeData.html   = thtml;
				nodeData.type   = 'cited';
				nodeData.source = {};
				nodeData.source.title  = dom.attr( 'data-citation-title' );
				nodeData.source.url = dom.attr( 'data-citation-source' );
				nodeData.source.copyTime  = dom.attr( 'data-citation-timestamp' );
				nodeData.source.pasteTime = Math.round((new Date()).getTime() / 1000);
				nodeData.source.creator   = [{}];
				nodeData.source.creator[0].name = dom.attr( 'data-citation-author-name' );
				nodeData.source.creator[0].url  = dom.attr( 'data-citation-author-url' );
				var newNode = this.addNode(nodeData);
				return;
			}
		}

		if( LQS.validURL(text) ) {
			nodeData.type = "embed";
			nodeData.source = {};
			nodeData.source.url = text;
			nodeData.id = text;
			if( this.nodes[nodeData.id] ) {
				// already exists, lets just bring it into view
				// but we'll still crate links if they are needed
				this.nodes[nodeData.id].reveal();
			} else {
				var newNode = this.addNode(nodeData);
			}
			return;
		}

		if( html ) {
			nodeData.title = "Pasted HTML";
			nodeData.html = html;
			nodeData.type = "html";
			var newNode = this.addNode(nodeData);
			newNode.fitSize();
			return;
		}
	
		nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.type = "text";
		var newNode = this.addNode(nodeData);
		newNode.fitSize();
	}	


	/* STATIC UTILITY FUNCTIONS */

	static download(filename, data, mimetype) {
		var blob = new Blob([data], {type: mimetype});
		if(window.navigator.msSaveOrOpenBlob) {
			window.navigator.msSaveBlob(blob, filename);
		}
		else{
			var elem = window.document.createElement('a');
			elem.href = window.URL.createObjectURL(blob);
			elem.download = filename;        
			document.body.appendChild(elem);
			elem.click();        
			document.body.removeChild(elem);
		}
	}

	// from http://forums.devshed.com/javascript-development-115/regexp-match-url-pattern-493764.html	
	static validURL(str) {
		//var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[-;&a-z\d%_.~+=]*)?(\#[-a-z\d_]*)?$/i;
		var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?[^ ]*/;
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	}

	static dataToHTML(value) {
		if( value === null || value === undefined ) {
			return $('<span style="text-style: italic" class="meta_value">NULL</span>');
		} else if( typeof value === 'object' && value.constructor === Array ) {
			// array
			var table = $('<table class="meta_array"></table');
			for( var i=0; i<value.length; ++i ) {
				var tr = $('<tr></tr>');
				tr.append( $('<th></th>').text(i) );
				tr.append( $('<td></td>').append( LQS.dataToHTML( value[i] ) ) );
				table.append(tr);
			}
			return table;
		} else if( typeof value === 'object' ) {
			// object
			var keys = Object.keys(value);
			var table = $('<table class="meta_object"></table');
			for( var i=0; i<keys.length; ++i ) {
				var tr = $('<tr></tr>');
				tr.append( $('<th></th>').text(keys[i]) );
				tr.append( $('<td></td>').append( LQS.dataToHTML( value[keys[i]] ) ) );
				table.append(tr);
			}
			return table;
		} else {
			return $('<span class="meta_value"></span>').text(value);
		}
	}

	static screenMiddle() {
		return new LQS_Point( LQS.winLeft()+LQS.winWidth()/2, LQS.winTop()+LQS.winHeight()/2 );
	}

	static winHeight() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerHeight || e.clientHeight || g.clientHeight;
	}
	static winWidth() {
		var w = window;
    		var d = document;
    		var e = d.documentElement;
    		var g = d.getElementsByTagName('body')[0];
    		return w.innerWidth || e.clientWidth || g.clientWidth;
	}
	static winLeft() {
		var d = document.documentElement;
		return (window.pageXOffset || d.scrollLeft) - (d.clientLeft || 0);
	}
	static winTop() {
		var d = document.documentElement;
		return (window.pageYOffset || d.scrollTop)  - (d.clientTop || 0);
	}


	static uuid() {
		function randomDigit() {
			if (crypto && crypto.getRandomValues) {
				var rands = new Uint8Array(1);
				crypto.getRandomValues(rands);
				return (rands[0] % 16).toString(16);
			} else {
				return ((Math.random() * 16) | 0).toString(16);
			}
		}
		var crypto = window.crypto || window.msCrypto;
		return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
	}

	static noDragClick( element, fn ){
		element.mouseup( (e) => {
        		if (e.pageX==LQS_ClickStart.x && e.pageY==LQS_ClickStart.y) {
				fn();
			}
		});
	}

	// remove the obvious secruity issues from 3rd party html
	// may need to become a while list function instead. 
	// don't forget js attributes
	static sanitiseHtml( html ) {
		if( !html ) { return ""; }
		html = html.replace( /<script>.*?<\/script>/, '' );
		return html;
	}

	static logo( svg ) {
		return "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDIwMDEwOTA0Ly9FTiIKICJodHRwOi8vd3d3LnczLm9yZy9UUi8yMDAxL1JFQy1TVkctMjAwMTA5MDQvRFREL3N2ZzEwLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4wIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiB3aWR0aD0iMTAyNC4wMDAwMDBwdCIgaGVpZ2h0PSIxMDI0LjAwMDAwMHB0IiB2aWV3Qm94PSIwIDAgMTAyNC4wMDAwMDAgMTAyNC4wMDAwMDAiCiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0Ij4KPG1ldGFkYXRhPgpDcmVhdGVkIGJ5IHBvdHJhY2UgMS4xNSwgd3JpdHRlbiBieSBQZXRlciBTZWxpbmdlciAyMDAxLTIwMTcKPC9tZXRhZGF0YT4KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsMTAyNC4wMDAwMDApIHNjYWxlKDAuMTAwMDAwLC0wLjEwMDAwMCkiCmZpbGw9IiMwMDAwMDAiIHN0cm9rZT0ibm9uZSI+CjxwYXRoIGQ9Ik01MjQ1IDk5OTQgYy0yOTggLTEyMiAtODIzIC0yMDIgLTE1MDYgLTIzMCBsLTE1NiAtNiAtNDIgLTE0MSBjLTI0Ci03NyAtNDUgLTE0NiAtNDggLTE1MyAtMyAtOSA2NSAtMTMgMjg5IC0xNyAzMTggLTUgMzg3IC0xNCA0NjAgLTYyIDgyIC01NAoxMTQgLTE4MyA4MyAtMzMzIC0zMSAtMTU0IC0xMjkgLTQ4MSAtMTAyNSAtMzQzNyAtNDkwIC0xNjE3IC05MzQgLTMwODcgLTk4NgotMzI2OCAtMjA2IC03MTYgLTI5NCAtMTEyMSAtMjk0IC0xMzUxIDAgLTI3MCA4NiAtNDkyIDI2MCAtNjY3IDE1NyAtMTU4IDM0MwotMjI5IDYwNSAtMjI5IDUxNCAwIDk2NyAyOTkgMTM1OCA4OTUgMTQ0IDIyMCAzMDIgNTMxIDQyMiA4MjkgbDUyIDEyOCAyNTQgMwpjNDQ2IDQgNzI0IDYxIDEwMjQgMjEwIDE1NyA3OCAyODEgMTY1IDM5OCAyODIgMjc2IDI3MSA0NTkgNjAwIDUyOSA5NDYgMzIKMTU5IDMzIDUwMSAwIDY4NyAtNjkgMzk5IC0yMjEgNzUyIC02NDUgMTQ5NSAtMjMxIDQwNSAtMzYyIDY3OSAtNDUxIDk0OSAtNzAKMjA3IC05MCAzMTYgLTkwIDQ4NiAwIDEzMyAyIDE1MiAyOCAyMjUgMzcgMTA2IDg2IDE4NSAxNjYgMjY1IDE2NyAxNjkgNDE1CjI3OCA2ODIgMjk4IDI2NiAyMSA0NDkgLTM0IDU3NiAtMTcyIDY2IC03MyAxMDQgLTE1MCAxNDcgLTI5NiA2MCAtMjA3IDEzMQotMzI1IDIyNiAtMzc3IDUwIC0yNyAxOTggLTI1IDI1OSAzIDU1IDI2IDEwMyA3MyAxMjkgMTI5IDQ3IDEwMSA1MiAyNzggMTEKMzkwIC04NCAyMjUgLTM2MSA0NTIgLTY4NCA1NjAgLTE0MyA0OCAtMjU2IDY2IC00NDcgNzIgLTMxOSAxMCAtNTc1IC00MiAtODQ3Ci0xNzIgLTE5MSAtOTIgLTM0NSAtMTk5IC01MDYgLTM1NSAtMjYwIC0yNTEgLTM5OSAtNTExIC00NTEgLTg0NSAtMjUgLTE1NgotMTYgLTM4OSAxOSAtNTM5IDc5IC0zMzcgMjYzIC03NjAgNTkxIC0xMzY2IDM4NSAtNzA5IDU0NyAtMTE0NCA1NDggLTE0NjUgMAotMjg1IC04NiAtNTEyIC0yNjUgLTcwMCAtMTg1IC0xOTQgLTQ1MiAtMzM5IC03MjEgLTM5MCAtMTg2IC0zNiAtNDAzIC0yOQotNTcwIDE2IC0xNjMgNDUgLTMyNyAxNDkgLTM4MSAyNDIgLTQ1IDc3IC00OCAxMTUgLTE1IDI0MSA4OSAzNDggMzUgNTY5IC0xNjEKNjQ4IC00NSAxOCAtNzYgMjIgLTE2NSAyMiAtMTM3IDEgLTE4NyAtMTggLTI2OCAtMTAzIC05OSAtMTAzIC0xMzcgLTIxMCAtMTM3Ci0zODAgMCAtMTI4IDE4IC0yMDYgNzUgLTMyNiAxMzAgLTI3NyA0MTEgLTUwNyA3MzAgLTYwMCA1NSAtMTYgMTAxIC0zMCAxMDMKLTMxIDYgLTMgLTY2IC0xNzEgLTEzNCAtMzEzIC0xNzcgLTM3MSAtMzUzIC02MzQgLTU1MiAtODIyIC0yMzggLTIyNyAtNDc2Ci0zNTIgLTYzNSAtMzM1IC0yNTYgMjcgLTMzOCAyNzkgLTI0MiA3NTEgMzcgMTgwIDgzIDM0MSAyMjAgNzY1IDg2IDI2NiAyMDYzCjY3NjEgMjQyMSA3OTUzIDUgMTUgLTQgMTcgLTg4IDE2IC03NCAtMSAtMTA1IC02IC0xNTMgLTI1eiIvPgo8L2c+Cjwvc3ZnPgo=";
	}
}










