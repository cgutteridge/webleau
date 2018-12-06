<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta content="initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" name="viewport">

<?php
$scripts = array(
  "js/jquery-1.12.4.min.js",
  "js/jquery-ui.js",
  "js/jquery.ui.touch-punch.min.js",
  "js/hammer.min.js",
  "js/lqs/core.js",
  "js/lqs/point.js",
  "js/lqs/line.js",
  "js/lqs/node.js",
  "js/lqs/link.js",
  "js/lqs/viewspec.js",
  "js/lqs/node-text.js",
  "js/lqs/node-html.js",
  "js/lqs/node-error.js",
  "js/lqs/node-graph.js",
  "js/lqs/node-embed.js",
  "js/lqs/node-cited.js"
);
if( $_GET["debug"] ) {
	foreach( $scripts as $script ) {
		print "<script src='$script'></script>";
	}
} else {
	print "<script id='all_js'>\n";
	foreach( $scripts as $script ) {
		readfile( $script );
	}
	print "</script>\n";
}
?>
    <style id='all_css'>
<?php
readfile("css/jquery-ui.css");
readfile("css/liquid-space.css");
?>
    </style>
  </head>
  <body></body>
  <script>
$(document).ready(function(){ 
	var lqs = new LQS({
		inspectorProxy: 'https://www.southampton.ac.uk/~totl/lqs-inspector-v1/',
		nodes: [
			{
				id: 'a',
				pos: { x: 400, y: 100 },
				size: { width: 200, height: 200 },
				title: '',
				type: 'text',
				text: 'Try pasting URLs from media sites. Try double clicking on the background. Use the spanner to save state (to a text string for now). Drag nodes to touch to make a link.',
			},
			{
				id: 'welcome',
				pos: { x: 0, y: 0 },
				size: { width: 200, height: 200 },
				title: 'Welcome',
				type: 'html',
				html: '<p>Welcome to Liquid Space.</p><p>To get started, for now all we have is an <a href="https://jrnl.global/2018/10/30/webleau-progress/">Introduction blog post</a></p>',
			}
		],
		links: [
			{
				label: "",
				id: 'welcomelink',
				subject: { node: 'a' },
				object: { node: 'welcome' }
			}
		]
	});
});
  </script>
</html>
