<?php
# hopefully this is a mock up for what we'll get the data from Wordpress or other node sources

# with no params it should say it's a graph API and for what. Maybe what it supports.

$_GET['action'] = 'nodeTypes';
#$_GET['action']='nodes';
#$_GET['ids'] = 'user/9';
#$_GET['followLinks'] = '*';
#$_GET['stub'] = 1;
$_GET['endpoint'] = "http://sparql.data.southampton.ac.uk/";

# actions:
# nodeTypes
# nodes- ids - followLinks
# nodes- types -  followLinks

# follow Links ; ^ to indicate inverse links, * for wildcard matching both dirs.

require_once( 'sparqllib.php');
$result = array( "ok"=>false, "action"=>"error" );

if( $_GET['action'] == 'nodeTypes' ) {
	$result["action"] = "nodeTypes";
	$result["ok"] = true;

	$db = sparql_connect( $_GET['endpoint'] );
	if( !$db ) { print $db->errno() . ": " . $db->error(). "\n"; exit; }
 	
	$sparql = "SELECT DISTINCT ?type WHERE { ?foo a ?type } LIMIT 51";
	$sparqlResult = $db->query( $sparql ); 
	if( $sparqlResult ) { 
		$fields = $sparqlResult->field_array( $result );
 		
		$sparqlResult["nodeTypes"] = array();
		while( $row = $sparqlResult->fetch_array() )
		{
			$sparqlResult["nodeTypes"][$row["type"]] = null; 
		}
		if( $sparqlResult->num_rows() == $MAX+1 ) {
			$result["complete"] = false;
		}
	} else {
		$result["errormsg"] = "SPARQL ERROR: ".$db->errno() . ": " . $db->error();
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

#http://www.soton.ac.uk/~totl/webleau-dev/graph-api.php?action=nodes&stub=1&types=comment
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
		foreach( $result["nodes"] as $id=>$node ) {
			unset( $node["data"] );
		}
	}	

}

header( "Content-type: application/json" );
print json_encode( $result);
exit;

