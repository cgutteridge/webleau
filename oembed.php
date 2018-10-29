<?php
include __DIR__.'/vendor/autoload.php';

use Embed\Embed;

header( "Content-type: application/json");

# TODO check origin of request
$info = Embed::create($_GET['url']);

$r = array( 
"title"=>$info->title,
"description"=>$info->description,
"html" => $info->code,
"source"=>array(
	"URL"  =>$info->url,
	"creators" => array( 
		array(
			"name" => $info->authorName,
			"page" => $info->authorUrl
		)
	),
	"provider"=>array(
		"name"  => $info->providerName,
		"URL"   => $info->providerUrl,
		"icons" => $info->providerIcons,
		"icon"  => $info->providerIcon,
	),
	"image"=>array(
		"URL"    => $info->image,
		"width"  => $info->imageWidth,
		"height" => $info->imageHeight,
	),
	"oembedExtra"=>array( // these are things not yet in the node data structure
		         "type" => $info->type,
		         "tags" => $info->tags,
		       "images" => $info->images,
		        "width" => $info->width,
		       "height" => $info->height,
		  "aspectRatio" => $info->aspectRatio,
		"publishedDate" => $info->publishedDate,
		      "license" => $info->license,
		   "linkedData" => $info->linkedData,
		        "feeds" => $info->feeds,
	 )
));
print json_encode($r);
