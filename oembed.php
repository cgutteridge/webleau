<?php
include __DIR__.'/vendor/autoload.php';

use Embed\Embed;

//Load any url:
$info = Embed::create('https://www.youtube.com/watch?v=4PNPgaLKFlc&feature=youtu.be');

#$info = Embed::create('https://docs.google.com/spreadsheets/d/1p36UJLKm3ola-mRQchV4yEKTqGtqVpIwmQpvfiyo4jM/edit#gid=0');
#$info = Embed::create('https://www.bbc.co.uk/news/uk-england-lancashire-46003462');
#				nodeData.meta.source = {};
#				nodeData.meta.source.URL = jsonData.citation.url;
#				nodeData.meta.source.copiedTime = jsonData.citation.timestamp;
#				nodeData.meta.source.creators = [ 
$r = array( 
"title"=>$info->title,
"description"=>$info->description,
"source"=>array(
	"URL"  =>$info->url,
        "html" => $info->code,
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
