<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta content="initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" name="viewport">
    <script id='all_js'>
<?php
readfile("js/jquery-1.12.4.min.js");
readfile("js/jquery-ui.js");
readfile("js/jquery.ui.touch-punch.min.js");
readfile("js/html2canvas.min.js");
readfile("js/webleau.js");
?>
    </script>
    <style id='all_css'>
<?php
readfile("css/jquery-ui.css");
readfile("css/liquid-space.css");
?>
    </style>
  </head>
  <body></body>
  <script>
$(document).ready(function(){ liquidSpaceInit({
		nodes: [
			{
				id: 'a',
				x: 400,
				y: 100,
				width: 200,
				height: 200,
				title: '',
				text: 'Try pasting URLs from media sites. Try double clicking on the background. Use the spanner to save state (to a text string for now). Drag nodes to touch to make a link.',
				edit: true
			},
			{
				id: 'welcome',
				x: 0,
				y: 0,
				width: 200,
				height: 200,
				title: 'Welcome',
				html: '<p>Welcome to Liquid Space.</p><p>To get started, for now all we have is an <a href="https://jrnl.global/2018/10/30/webleau-progress/">Introduction blog post</a></p>',
				edit: true
			}
		],
		links: [
			{
				label: "comments",
				id: 'welcomelink',
				subject: { node: 'a' },
				object: { node: 'welcome' }
			}
		]
	});
});
  </script>
</html>
