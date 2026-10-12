

class LQS_Line {
	constructor( from, to ) {
		this.from = from;
		this.to = to;
	}
	/**
	 * Intersection point of two line segments.
	 *
	 * Parametric form, so vertical and horizontal segments are exact even at
	 * the large real-coordinate offsets the canvas uses.
	 *
	 * @param {LQS_Line} that - Other segment
	 * @returns {LQS_Point|null} Intersection, or null if parallel or not overlapping
	 */
	intersect( that ) {
		var dx1 = this.to.x - this.from.x;
		var dy1 = this.to.y - this.from.y;
		var dx2 = that.to.x - that.from.x;
		var dy2 = that.to.y - that.from.y;
		var denom = dx1 * dy2 - dy1 * dx2;
		if( denom == 0 ) { return null; } // parallel or degenerate
		var ox = that.from.x - this.from.x;
		var oy = that.from.y - this.from.y;
		var t = ( ox * dy2 - oy * dx2 ) / denom; // position along this
		var u = ( ox * dy1 - oy * dx1 ) / denom; // position along that
		var eps = 1e-9;
		if( t < -eps || t > 1+eps || u < -eps || u > 1+eps ) { return null; }
		return new LQS_Point( this.from.x + t * dx1, this.from.y + t * dy1 );
	}
}

