<?php
# hopefully this is a mock up for what we'll get the data from Wordpress or other node sources

#$_GET['action']='nodes';
#$_GET['ids'] = 'user/9';
#$_GET['followLinks'] = '*';
#$_GET['stub'] = 1;

# actions:
# nodeTypes
# nodes- ids - followLinks
# nodes- types -  followLinks

# follow Links ; ^ to indicate inverse links, * for wildcard matching both dirs.

$g = getData();
$result = array( "ok"=>false, "action"=>"error" );
if( $_GET['action'] == 'nodeTypes' ) {
	$result["action"] = "nodeTypes";
	$result["ok"] = true;
	$g = getData();
	$types = array();
	foreach( $g["nodes"] as $node ) {
		$type = "";
		if( isset( $node["type"] ) ) { $type = $node["type"]; }
		if( !isset( $result["nodeTypes"][$type] ) ) { $result["nodeTypes"][$type] = 0; }
		$result["nodeTypes"][$type]++;
	}
}
elseif( $_GET['action']=='nodes' && ( isset( $_GET['ids'] ) || isset( $_GET['types'] ))) {
	$result["action"] = "nodes";
	$result["ok"] = true;
	// by id or type
	$result["nodes"] = array();
	$matchedNodes = array();
	if( isset( $_GET['ids'] ) ) {
		foreach( preg_split( "/\s+,\s+/", trim( $_GET["ids"] ) ) as $id ) {
			if( isset( $g["nodes"][$id] ) ) {
				$result["nodes"][$id] = $g["nodes"][$id];
				$matchedNodes[$id] = true;
			}
		}
	}
	if( isset( $_GET['types'] ) ) {
		$types = preg_split( "/\s*,\s*/", trim( $_GET["types"] ) );
		foreach( $g["nodes"] as $id=>$node ) {
			if( isset( $result["nodes"][$id] ) ) { continue; }
			foreach( $types as $type ) {
				if( $type == $node["type"] ) {
					$result["nodes"][$id] = $node;
					$matchedNodes[$id] = true;
					continue;
				}
			}
		}
	}


	if( isset( $_GET["followLinks"] ) ) {
		$result["links"] = array();
		$linkTypes = preg_split( "/\s*,\s*/", trim( $_GET["followLinks"] ) );
		foreach( $g["links"] as $link ) {
			foreach( $linkTypes as $type ) {
				if( ($type == $link["type"] || $type == "*") && isset($matchedNodes[$link["subject"]]) && isset($g["nodes"][$link["object"]])) {
					$result["links"][] = $link;
					if( !isset( $result["nodes"][$link["object"]] ) ) {
						$result["nodes"][$link["object"]] = $g["nodes"][$link["object"]];
					}
					continue; # don't add the link twice
				}
				if( ($type == "^".$link["type"] || $type == "*") && isset($matchedNodes[$link["object"]]) && isset($g["nodes"][$link["subject"]]) ) {
					$result["links"][] = $link;
					if( !isset( $result["nodes"][$link["subject"]] ) ) {
						$result["nodes"][$link["subject"]] = $g["nodes"][$link["subject"]];
					}
				}
			}
		}
	}

	if( $_GET['stub'] ) {
		// just return the title & type & id for each node
		$stubNodes = array();
		foreach( $result["nodes"] as $id=>$node ) {
			$type = "";
			if( isset( $node["type"] ) ) {
				$type = $node["type"];
			}
			$title = $type."#".$id;
			if( isset($node["title"]) && $node["title"]!="" ) {
				$title = $node["title"];
			} elseif( isset($node["name"]) && $node["name"]!="" ) {
				$title = $node["name"];
			}
				
			
			$stubNodes[$id] = array( 
				"id"=>$id, 
				"type"=>$type,
				"title"=>$title
			);
		}
		$result["nodes"] = $stubNodes;
	}	

}


	
header( "Content-type: application/json" );
print json_encode( $result);
exit;




function getData() {
	return json_decode(file_get_contents( "wordpress-graph.json"),true);
}
