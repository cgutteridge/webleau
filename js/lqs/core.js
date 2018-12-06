
// effectively this is a static property
var LQS_NodeTypes = {};
var LQS_ClickStart = null;

class LQS {
	constructor() {
		this.nodesLayer = null;
		this.bgSvgLayer = null;
		this.fgSvgLayer = null;
		this.eventListeners = [];
		this.eventListeners.push( (e)=>{ console.log(e); } );

		this.nodes = {};
		this.links = {};
		this.layoutScale = 1;
		this.offset = new LQS_Point(50000,50000);
		this.curDown = false;
		this.layoutScaleSlider = null;
		this.defaultInspectorProxy = 'https://www.southampton.ac.uk/~totl/lqs-inspector-v1/';
		this.mouse = new LQS_Point( this.offset.x, this.offset.y );
		this.mouseOverBackground = true;
		this.seedsBySource = {};
		this.seedsByTarget = {};
		this.seedsByID = {};
		this.devMode = false;

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
		var defs	 = $(document.createElementNS("http://www.w3.org/2000/svg","defs"));
		var marker       = $(document.createElementNS("http://www.w3.org/2000/svg","marker"));
		var path	 = $(document.createElementNS("http://www.w3.org/2000/svg","path"));
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
	
		// remember where a click & pan started 
		this.posBeforePan;
		this.screenPosOnMouseDown;
		this.mouseDownOnBackground;
		$(document).on("mousedown", (e)=> { 
			LQS_ClickStart = { x: e.pageX, y: e.pageY }; // used for no-drag-click
			if( $(e.originalEvent.target).hasClass( "lqs_nodes" ) ) {
				this.mouseDownOnBackground = true;
			}
			this.posBeforePan = new LQS_Point( parseInt($(document).scrollLeft()), parseInt($(document).scrollTop() ) );
			this.screenPosOnMouseDown = new LQS_Point( e.screenX, e.screenY );
		});
		$(document).on("mouseup", (e)=> { 
			
			this.screenPosOnMouseDown = null;
			this.posBeforePan = null; 
			LQS_ClickStart = null;
			this.mouseDownOnBackground = false;	
		} );
		$(document).on("mousemove", (e)=> { 
			if( this.mouseDownOnBackground ) {
				$(document).scrollLeft( this.posBeforePan.x + this.screenPosOnMouseDown.x - e.screenX );
				$(document).scrollTop(  this.posBeforePan.y + this.screenPosOnMouseDown.y - e.screenY );
			}
				
		});

		if( navigator.userAgent.match(/iPad/i) != null ) {
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

			hammertime.on("panstart", (e)=> {
				if( $(e.target).hasClass( "lqs_nodes" ) ) {
					this.posBeforePan = new LQS_Point( parseInt($(document).scrollLeft()), parseInt($(document).scrollTop() ) );
				} else {
					this.posBeforePan = null;
				}
				return true;
			});

			/* drag background to scroll (ipad and desktop) */
			hammertime.add(new Hammer.Pan({threshold:0}));
			hammertime.get('pan').set({ enable: true });
			hammertime.on("panmove", (e)=> {
				if( $(e.srcEvent.target).hasClass( "lqs_nodes" ) && this.posBeforePan ) {
					$(document).scrollLeft( this.posBeforePan.x - e.deltaX );
					$(document).scrollTop(  this.posBeforePan.y - e.deltaY );
				}
				return true;
			});
		}

		this.nodesLayer.dblclick( (e)=>{
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				console.log(e);
				var nodeData = {
					id: LQS.uuid(),
					pos: this.toVirtual( { x: e.pageX, y: e.pageY } ),
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
		this.nodesLayer.click( (e)=>{
			if( $(e.target).hasClass( "lqs_nodes" ) ) {
				$('.lqs_card_menu').hide();
			}
		});
		
	
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
		var controlTools = $('<div class=""></div>');

		controls.append( $("<div class='lqs_controls_subtitle'>Tools</div>"));
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

		var optionTools = $('<div class=""></div>');

		controls.append( $("<div class='lqs_controls_subtitle'>Options</div>"));
		controls.append(optionTools);

		// strings and arrows
		var arrowTool = $('<div title="arrow" class="lqs_tool">Arrow Links</div>');
		var stringTool = $('<div title="string" class="lqs_tool">String Links</div>');
		optionTools.append( arrowTool );
		optionTools.append( stringTool );
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

		// devMode
		var frodeTool = $('<div title="Frode mode" class="lqs_tool">Disabled developer features</div>');
		var chrisTool = $('<div title="Chris mode" class="lqs_tool">Enable developer features</div>');
		optionTools.append( frodeTool );
		optionTools.append( chrisTool );
		frodeTool.click( ()=> {
			frodeTool.hide();
			chrisTool.show();
			this.setDevMode( false );
		});
		chrisTool.click( ()=> {
			frodeTool.show();
			chrisTool.hide();
			this.setDevMode( true );
		});
		if( this.devMode ) {
			chrisTool.hide();
		}else {
			frodeTool.hide();
		}



		/* CONTROLS: load/save */
		var controlIO = $('<div class="lqs_controls_tools"></div>');
		var ioTextarea = $('<textarea class="normal-paste" placeholder="save/load: hit save and copy this, or paste in here and hit load" style="width: 100%; height: 10%;" id="lqs_io"></textarea>');
		controls.append( $("<div class='lqs_controls_subtitle'>Upload/Download</div>"));
		controls.append( ioTextarea );
		var downloadTool = $('<div title="download" class="lqs_tool">Download<div>');
		controlIO.append( downloadTool );
		var uploadTool = $('<div title="upload" class="lqs_tool">Upload</div>');
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
	
		// puppetmaster

		controls.append( $("<div class='lqs_controls_subtitle'>Remote Control</div>"));
		var rcinput = $("<input placeholder='Remote Control URL' class='normal-paste' style='width:60%'/>");
		var rcbutton = $("<button>Open</button>");
		var rc = $("<div />");
		rcbutton.click( ()=>{
			var channel = new MessageChannel();
			var rciframe = $('<iframe></iframe>').attr('src', rcinput.val() );
			$('body').append($('<div class="lqs_remote_control"></div>').append(rciframe));
			rc.hide();
			rciframe.load( ()=>{ 
				channel.port1.onmessage = (e)=>{
					let event = JSON.parse(e.data);
					this.change( event );
				};
				this.eventListeners.push( (e)=>{
					let s = JSON.stringify(e);
					rciframe[0].contentWindow.postMessage( ''+s, '*' );
				} );
				rciframe[0].contentWindow.postMessage(JSON.stringify( {action:'hello'}), '*', [channel.port2] );
			});
		});
		rc.append( rcinput );
		rc.append( rcbutton );
		controls.append( rc );
		

		// graph
		controls.append( $("<div class='lqs_controls_subtitle'>Connect to Knowledge Graph</div>"));

		var input = $("<input placeholder='Graph endpoint URL' class='normal-paste' style='width:60%'/>");
		var button = $("<button>Open</button>");
		button.click( ()=> {
			var seed = LQS_NodeTypes['graph-connection'].makeSeed({endpoint:input.val()});
			// make the new connection appear in place of this node
			this.growSeed( seed );
		});
		var r = $("<div />");
		r.append( input );
		r.append( button );
		controls.append( r );

		controls.append( $("<p>Drag these onto the page to connect to a graph.</p>"));

		var graphSeedLex = this.renderSeed("Webscience Lexicon");
		controls.append( graphSeedLex );
		this.attachSeed( graphSeedLex, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://www.soton.ac.uk/~totl/webscience-graph/' }));

		var graphSeedWPDemo = this.renderSeed("Blog Demo");
		controls.append( graphSeedWPDemo );
		this.attachSeed( graphSeedWPDemo, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://www.soton.ac.uk/~totl/wordpress-graph-demo/' }));

		var graphSeedWPDemo = this.renderSeed("JRNL Blog");
		controls.append( graphSeedWPDemo );
		this.attachSeed( graphSeedWPDemo, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://jrnl.global/wp-json/graph-api/v1/query' }));

		var graphSeedWikipedia = this.renderSeed("Wikipedia");
		controls.append( graphSeedWikipedia );
		this.attachSeed( graphSeedWikipedia, LQS_NodeTypes['graph-connection'].makeSeed({sourceCard:{data:{id:'//control-panel'}}, endpoint: 'https://www.soton.ac.uk/~totl/wiki-graph-demo/' }));


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
				LQS.soundSocket().play();
			},
			stop: (event,ui)=>{
				el.removeClass('lqs_seed_dragged_from');
				LQS.soundSocket().play();
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
			var el = this.seedsByID[seedID].el;
			el.addClass('lqs_seed_hole').removeClass('lqs_seed_filled');
			if(el.data('ui-draggable')) { el.draggable('disable'); }
		}
	}

	returnSeed( seedID ) {
		if( this.seedsByID[seedID] ) {	
			var el = this.seedsByID[seedID].el;
			el.removeClass('lqs_seed_hole').addClass('lqs_seed_filled');
			if(el.data('ui-draggable')) { el.draggable('enable'); }
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
			this.nodes[nodeData.id].reveal();
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

	renderSeed(text) {
		return $("<div class='lqs_seed'></div>").append( $("<div class='lqs_seed_inner'></div>").text(text) );
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

	setDevMode( bool ) {
		this.devMode = bool;
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

	change( event ) {
		if( event.action == 'purge' ) {
			this.purgeLayout();
			return { ok: true };
		}
		if( event.action == 'node-focus' ) {
			if( !this.nodes[ event.node ] ) {
				return { ok: false, error: 'unknown node' };
			}
			this.nodes[ event.node ].reveal();
			return { ok: true };
		}
		if( event.action == 'node-alter' ) {
			if( !this.nodes[ event.node ] ) {
				return { ok: false, error: 'unknown node' };
			}
			var lastpath = event.field[ event.field.length-1 ];
			var target = this.nodes[event.node].data;
			for(let i=0;i<event.field.length-1;++i ) {
				if( !target[event.field[i]] ) { target[event.field[i]] = {}; }
				target = target[event.field[i]];
			}
			target[lastpath] = event.data;	
			this.nodes[event.node].updatePosition();
			this.logEvent( event );
			return { ok: true };
		} 
		if( event.action == 'link-add' ) {
			if( this.links[event.link.id] ) {
				return { ok: false, error: 'link already exists' };
			}
			if( !this.nodes[event.link.subject.node] ) {
				return { ok: false, error: 'unknown subject' };
			}
			if( !this.nodes[event.link.object.node] ) {
				return { ok: false, error: 'unknown object' };
			}
			
			this.logEvent( event );

			// create link
			var link = new LQS_Link( event.link, this );
			this.links[link.data.id] = link;
			this.links[link.data.id].updatePosition();
			return { ok: true };
		}
		if( event.action == 'node-add' ) {
			if( this.nodes[event.node.id] ) {
				return { ok: false, error: 'node already exists' };
			}

			var nodeClass;
			if( !event.node.type ) {
				nodeClass = LQS_NodeTypes['html'];
			} else if( LQS_NodeTypes[event.node.type] ) {
				nodeClass = LQS_NodeTypes[event.node.type];
			} else {
				return { ok: false, error: 'unknown node type' };
			}
			
			this.logEvent( event );

			// create node
			const NC = nodeClass;
			var node = new NC( event.node, this );
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
	
			return { ok: true };
		}
		if( event.action == 'link-remove' ) {
			if(! this.links[event.link] ) {
				return { ok: false, error: 'unknown link' };
			}
			var link = this.links[event.link];

			var subjectNode = this.nodes[link.data.subject.node];
			var objectNode = this.nodes[link.data.object.node];
			subjectNode.deRegisterLink(link);
			objectNode.deRegisterLink(link);
			delete this.links[link.data.id];
			link.removeDom();
			this.logEvent( event );
			return { ok: true };
		}
		if( event.action == 'node-remove' ) {
			if(! this.nodes[event.node] ) {
				return { ok: false, error: 'unknown node' };
			}
			var node = this.nodes[event.node];

			// clean up the viewSpec, including seeds
			node.viewSpec().leave(node);
	
			var link_ids = Object.keys(node.links);
			for( let i=0;i<link_ids.length;++i ) {
				node.links[link_ids[i]].remove();
			}
			var view_ids = Object.keys(node.views);
			for( let i=0;i<view_ids.length;++i ) {
				let viewSpec = node.views[view_ids[i]];
				viewSpec.destroy(node);
			}	
	
			if( this.seedsByTarget[node.data.id] ) {
				var ids = Object.keys( this.seedsByTarget[node.data.id] );
				for( let i=0;i<ids.length;++i ) {
					this.returnSeed( ids[i] );
				}
			}
			delete this.nodes[node.data.id];

			this.logEvent( event );
			return { ok: true };
		}
		return { ok: false, error: 'unknown action' };
	}

	logEvent( event ) {
		for( let i=0;i<this.eventListeners.length;++i ) {
			this.eventListeners[i](event);
		}
	}

	addLink( linkData ) {
		this.change( { 
			action: "link-add",
			link: linkData
		});
	}

	addNode( nodeData ) {
		// validate node TODO
		this.change( { 
			action: "node-add",
			node: nodeData
		});
		return this.nodes[ nodeData.id];
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
				this.addNode(nodeData);
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
				this.addNode(nodeData);
			}
			return;
		}

		if( html ) {
			//nodeData.title = "Pasted HTML";
			nodeData.html = html;
			nodeData.type = "html";
			this.addNode(nodeData);
			this.nodes[nodeData.id].fitSize();
			return;
		}
	
		//nodeData.title = "Pasted text";
		nodeData.text = text;
		nodeData.type = "text";
		this.addNode(nodeData);
		this.nodes[nodeData.id].fitSize();
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

	static clearTextSelection() {
		var sel = window.getSelection ? window.getSelection() : document.selection;
		if (sel) {
			if (sel.removeAllRanges) {
				sel.removeAllRanges();
			} else if (sel.empty) {
				sel.empty();
			}
		}
	}

	static truncate( text, max ) {
		if( text.length <= max ) { return text; }
		return text.substring(0,max-1)+"…";
	}

	static logo( svg ) {
		return "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDIwMDEwOTA0Ly9FTiIKICJodHRwOi8vd3d3LnczLm9yZy9UUi8yMDAxL1JFQy1TVkctMjAwMTA5MDQvRFREL3N2ZzEwLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4wIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiB3aWR0aD0iMTAyNC4wMDAwMDBwdCIgaGVpZ2h0PSIxMDI0LjAwMDAwMHB0IiB2aWV3Qm94PSIwIDAgMTAyNC4wMDAwMDAgMTAyNC4wMDAwMDAiCiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0Ij4KPG1ldGFkYXRhPgpDcmVhdGVkIGJ5IHBvdHJhY2UgMS4xNSwgd3JpdHRlbiBieSBQZXRlciBTZWxpbmdlciAyMDAxLTIwMTcKPC9tZXRhZGF0YT4KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsMTAyNC4wMDAwMDApIHNjYWxlKDAuMTAwMDAwLC0wLjEwMDAwMCkiCmZpbGw9IiMwMDAwMDAiIHN0cm9rZT0ibm9uZSI+CjxwYXRoIGQ9Ik01MjQ1IDk5OTQgYy0yOTggLTEyMiAtODIzIC0yMDIgLTE1MDYgLTIzMCBsLTE1NiAtNiAtNDIgLTE0MSBjLTI0Ci03NyAtNDUgLTE0NiAtNDggLTE1MyAtMyAtOSA2NSAtMTMgMjg5IC0xNyAzMTggLTUgMzg3IC0xNCA0NjAgLTYyIDgyIC01NAoxMTQgLTE4MyA4MyAtMzMzIC0zMSAtMTU0IC0xMjkgLTQ4MSAtMTAyNSAtMzQzNyAtNDkwIC0xNjE3IC05MzQgLTMwODcgLTk4NgotMzI2OCAtMjA2IC03MTYgLTI5NCAtMTEyMSAtMjk0IC0xMzUxIDAgLTI3MCA4NiAtNDkyIDI2MCAtNjY3IDE1NyAtMTU4IDM0MwotMjI5IDYwNSAtMjI5IDUxNCAwIDk2NyAyOTkgMTM1OCA4OTUgMTQ0IDIyMCAzMDIgNTMxIDQyMiA4MjkgbDUyIDEyOCAyNTQgMwpjNDQ2IDQgNzI0IDYxIDEwMjQgMjEwIDE1NyA3OCAyODEgMTY1IDM5OCAyODIgMjc2IDI3MSA0NTkgNjAwIDUyOSA5NDYgMzIKMTU5IDMzIDUwMSAwIDY4NyAtNjkgMzk5IC0yMjEgNzUyIC02NDUgMTQ5NSAtMjMxIDQwNSAtMzYyIDY3OSAtNDUxIDk0OSAtNzAKMjA3IC05MCAzMTYgLTkwIDQ4NiAwIDEzMyAyIDE1MiAyOCAyMjUgMzcgMTA2IDg2IDE4NSAxNjYgMjY1IDE2NyAxNjkgNDE1CjI3OCA2ODIgMjk4IDI2NiAyMSA0NDkgLTM0IDU3NiAtMTcyIDY2IC03MyAxMDQgLTE1MCAxNDcgLTI5NiA2MCAtMjA3IDEzMQotMzI1IDIyNiAtMzc3IDUwIC0yNyAxOTggLTI1IDI1OSAzIDU1IDI2IDEwMyA3MyAxMjkgMTI5IDQ3IDEwMSA1MiAyNzggMTEKMzkwIC04NCAyMjUgLTM2MSA0NTIgLTY4NCA1NjAgLTE0MyA0OCAtMjU2IDY2IC00NDcgNzIgLTMxOSAxMCAtNTc1IC00MiAtODQ3Ci0xNzIgLTE5MSAtOTIgLTM0NSAtMTk5IC01MDYgLTM1NSAtMjYwIC0yNTEgLTM5OSAtNTExIC00NTEgLTg0NSAtMjUgLTE1NgotMTYgLTM4OSAxOSAtNTM5IDc5IC0zMzcgMjYzIC03NjAgNTkxIC0xMzY2IDM4NSAtNzA5IDU0NyAtMTE0NCA1NDggLTE0NjUgMAotMjg1IC04NiAtNTEyIC0yNjUgLTcwMCAtMTg1IC0xOTQgLTQ1MiAtMzM5IC03MjEgLTM5MCAtMTg2IC0zNiAtNDAzIC0yOQotNTcwIDE2IC0xNjMgNDUgLTMyNyAxNDkgLTM4MSAyNDIgLTQ1IDc3IC00OCAxMTUgLTE1IDI0MSA4OSAzNDggMzUgNTY5IC0xNjEKNjQ4IC00NSAxOCAtNzYgMjIgLTE2NSAyMiAtMTM3IDEgLTE4NyAtMTggLTI2OCAtMTAzIC05OSAtMTAzIC0xMzcgLTIxMCAtMTM3Ci0zODAgMCAtMTI4IDE4IC0yMDYgNzUgLTMyNiAxMzAgLTI3NyA0MTEgLTUwNyA3MzAgLTYwMCA1NSAtMTYgMTAxIC0zMCAxMDMKLTMxIDYgLTMgLTY2IC0xNzEgLTEzNCAtMzEzIC0xNzcgLTM3MSAtMzUzIC02MzQgLTU1MiAtODIyIC0yMzggLTIyNyAtNDc2Ci0zNTIgLTYzNSAtMzM1IC0yNTYgMjcgLTMzOCAyNzkgLTI0MiA3NTEgMzcgMTgwIDgzIDM0MSAyMjAgNzY1IDg2IDI2NiAyMDYzCjY3NjEgMjQyMSA3OTUzIDUgMTUgLTQgMTcgLTg4IDE2IC03NCAtMSAtMTA1IC02IC0xNTMgLTI1eiIvPgo8L2c+Cjwvc3ZnPgo=";
	}

	static soundSocket() {
		var audio = new Audio( "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAEAAAFtABMTExMTExMTExMTExMTExMTExMTExMTEympqampqampqampqampqampqampqampqam5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5v////////////////////////////////8AAAAeTEFNRTMuOThyBJEAAAAAAAAAABQgJAaCbQABrgAABbScj/TkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//twZAAAAGYAVh0AAAgAAA/woAABF92PafmJEABlAC0/AACQ4AAAA//6gQnP/+XeTaLeKBDABASNBdIBS1vnyWaKZ3ugGdLzCXgeMHfJrUy0RoboNMWGlTevqMwKQC30S4fKYcoLIJwQVIqYjcNy4SAhOQpoO0pENQmZYJx6j46NSzEiCfNBQYncZQD8xOxgQAYYqhgkKZEoamxeK4YwLi0FNGia0eTxE1K5UoFIToTZMjODwupjhHjpJg+9NErmubHiPGbKZxZAyuoyNTZlmRRUYrQIcfPqRQRNysgynf1l8dg5ZJ//pJP9DpuYGp9YAAAAAAAAA3M4/GAAAAAAH//dP3x3pZDX2piCmopmXHJwXGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7gGQAAAYBVVp+YwCQF2AdzcADjgrxK2P88oAgOIApD4AABNd2IQAFAzEiEndA8f5/J0msmNcrcmlYG6AgjUIB3SQaP9ILufZUUQU0abInsYC68KVWYG33xXOUTKmiYIXILBaVdbxQ7OH4245aGGs/yEZE8orjTNZdik5fetTIkWMAfd9N5ULEZm19mmh54p5GJOrvP/5TV5//73xfDf//2n4a63Z25FFYlvGVZ40u/pv+kv8z52/WymZ53YGcKH4RSyrn44/Kfyy/ev13De+//afLcYhmNQDDMQl/50RCVw/7jYAAAAA2Aw/HwAAAAAAH/3I62Z69z98uoLzcMCASATOv+/0UKwiSRgfVwW16qWxwo5x5woeMIsxRahbW21IQzsLn2/+qocPFkPYo4XRLvIY3///1Td9XuNZUIR1Tb5jGUa0hJYqQFQqx6OsZysAGrgAB6AP//////WvsyT70piCmopmXHJwXGQAA//tgZAAAAupIVv09AAgAAA/woAABDNyts/lKfgAzADbPAA4ACLyhAgAAEAd9f73Qs7ShHcqS5dyywu1NEeOIw4sVzkZ5q7XWYekcgJjQ8Idl7///+O1nkXosPBUR+Ij+K//////+a2iYeidX1Jv2tqr/+FVDo6zgVE6Huee/ZruFBAEAGIHMHUJYOB4GAQAAAKPj8QXwElANvYqwNVTA3BFT4BAkLJg8aPwMYjBJKB5v4HcUor/AcFAxgMQEEBRlP/ASAAWAgYQqBtsIGhjABXuiv+QEzIKWGJop/ywSBYHhJ/2qt//1SXAwAAAAAAH///rO/yqYgpqKZlxycFxkAAAAAAAA//sQZAAP8AAAaQcAAAgAAA0g4AABAAABpAAAACAAADSAAAAETEFNRTMuOTguMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" );
    		audio.loop = false;
    		audio.volume = 0.03;
		return audio;
	}
}










