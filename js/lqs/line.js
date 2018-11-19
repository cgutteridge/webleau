

class LQS_Line {
	constructor( from, to ) {
		this.from = from;
		this.to = to;
	}
	intersect( that ) {
		var offx1 = this.to.x-this.from.x;
		var offy1 = this.to.y-this.from.y;
		var offx2 = that.to.x-that.from.x;
		var offy2 = that.to.y-that.from.y;
		if( offx1 == 0 ) { offx1 = 0.000000000001; }
		if( offx2 == 0 ) { offx2 = 0.000000000001; }
		var g1 = offy1/offx1;
		var g2 = offy2/offx2;
		if( g1==g2 ) { return null; } // parallel lines
		// y=a+x*g1;
		// y=b+x*g2;
		var a = this.from.y- this.from.x*g1;
		var b = that.from.y- that.from.x*g2;
		// a+x*g1 = b+x*g2
		// a-b = x*g2-x*g1
		// a-b = x*(g2-g1)
		// x= (a-b)/(g2-g1)
		var x = (a-b)/(g2-g1);
		var y = this.from.y +  ( x - this.from.x ) * g1;
		var pt = new LQS_Point( x, y );
		if( pt.inBounds( this.from, this.to ) && pt.inBounds( that.from, that.to ) ) {
			return pt;
		}
		return null;
	}
}

