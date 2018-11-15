
class LQSPoint {
	constructor(x,y) {
		this.x=x;
		this.y=y;
	}
	distance( pt ) {
		var ld = (pt.x-this.x)*(pt.x-this.x)+(pt.y-this.y)*(pt.y-this.y);
		return Math.sqrt( ld );
	}
	inBounds( corner1, corner2 ) {
		return( this.x>=Math.min(corner1.x,corner2.x)-1 && this.x<=Math.max(corner1.x,corner2.x+1) 
		     && this.y>=Math.min(corner1.y,corner2.y)-1 && this.y<=Math.max(corner1.y,corner2.y+1) );
	}
}
