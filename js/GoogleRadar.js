/************************************************************
 * Google Radar
 * By Fabien Vauthey
 * radar@blackspotradish.com
 * Twitter: @fabienvauthey
 * 2012 03 06 v1
 * @param {Object} map
 * @param {Object} opt
Copyright (c) 2012 Fabien Vauthey

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 ************************************************************/
GoogleRadar = function(map, opts) {
	/**
	 * Init the GoogleRadar
	 */
	if(( map instanceof Object) == false)
		return false;
	
	if(!(opts && opts.lat && opts.lng))
		return false;

	this.map = map;
	this.id = (opts && opts.id) || "radar_" + Math.random();
	this.setCenter(opts.lat, opts.lng);
	

	this.hasCircle = false;
	this.aMarkers = new Array();
	this.aCircles = new Array();
	
	this.EarthRadius = 6371;//km
	
}

GoogleRadar.prototype.setCenter = function(lat,lng) {
	this.lat = lat;
	this.lng = lng;
	this.center = new google.maps.LatLng(this.lat, this.lng);
}

/**
 * Axis
 */
GoogleRadar.prototype.drawAxis = function(opts) {
	
	if(typeof (this.axis) == "undefined") {
		this.axis = {};
		this.axis.radius = (opts && opts.radius) || 1000; //m
		this.axis.n = (opts && opts.n) || 10;
	}
		
	if(this.aCircles.length > 1)
		return false;

	for(n=0; n<=this.axis.n; n++) {
		var options = {
			center : this.center,
			clickable : false,
			fillColor : (opts && opts.fillColor) || "#00FF00",
			fillOpacity : (opts && opts.fillOpacity) || 0.1,
			map : this.map,
			radius : this.axis.radius * n,
			strokeColor : (opts && opts.strokeColor) || "#00FF00",
			strokeOpacity : (opts && opts.strokeOpacity) || 0.5,
			strokeWeight : (opts && opts.strokeWeight) || 4,
			zIndex: (opts && opts.zIndex) || 4
		};
		var circle = new google.maps.Circle(options);
		this.aCircles.push(circle);
	}

}

GoogleRadar.prototype.undrawAxis = function() {
	for(n=0; n<=this.axis.n; n++) {
		this.aCircles[n].setMap(null);
		this.aCircles[n] = null;		
	}
	this.aCircles = new Array();
	this.axis = undefined;
}

/**
 * Line
 */
GoogleRadar.prototype.addRadarLine = function(opts) {
	
	if( typeof (this.radarLine) == "undefined") {
		this.radarLine = {};

		this.radarLine.id = (opts && opts.id) || "line_" + Math.random();
		this.radarLine.radius = (opts && opts.radius) || 0.5; //km
		this.radarLine.time = (opts && opts.time) || 100;
		this.radarLine.angle = (opts && opts.angle) || 0;
		this.radarLine.angleOrigin = (opts && opts.angleOrigin) || 0;
		this.radarLine.angleIncrease = (opts && opts.angleIncrease) || 5;
		this.radarLine.angleMaxOverture = (opts && opts.angleMaxOverture) || 10;
		this.radarLine.lapCurrent = 0;
		this.radarLine.lapMax = (opts && opts.lapMax)|| 0;
		
		if(opts && (typeof(opts.autostart) == 'boolean'))
			this.radarLine.autostart = opts.autostart;
		else 
			this.radarLine.autostart = true;
		
		var remote = this.destinationPoint(this.center, this.radarLine.radius, this.radarLine.angle);
		var aLine = [new google.maps.LatLng(this.lat, this.lng), remote];

		this.radarLine.shape = new google.maps.Polyline({
			clickable: false,
			geodesic: false,
			map: this.map,
			path : aLine,
			strokeColor : (opts && opts.color) || "#0000FF",
			strokeOpacity : (opts && opts.opacity) || "0.5",
			strokeWeight : (opts && opts.weight) || 2,
			zIndex: (opts && opts.zIndex) || 2,
		});
	} 
	else {
		if(this.radarLine.callback != null) 
			return false;
	}

	if(this.radarLine.autostart)
		this.rotateLine();
}

GoogleRadar.prototype.rotateLine = function() {

	if(!this.radarLine.angle && !this.radarLine.time && !this.radarLine.radius)
		return false;
		
	var remote = this.destinationPoint(this.center, this.radarLine.radius, this.radarLine.angle);
	var aNewPath = [this.center, remote];
	this.radarLine.shape.setPath(aNewPath);

	//detect if there is a marker in it
	if(this.aMarkers != null) {
		for(var i = 0; i < this.aMarkers.length; i++) {
			var markerAngle = this.bearingTo(this.center, this.aMarkers[i].getPosition());
			var markerDistance = this.distanceFrom(this.center, this.aMarkers[i].getPosition());
			if(this.radarLine.angle == this.radarLine.angleOrigin)
				this.aMarkers[i].hasbeenShown = false;
			
			if(!this.aMarkers[i].hasbeenShown && 
				(markerAngle < (this.radarLine.angle + this.radarLine.angleMaxOverture / 2)) && 
				(markerAngle > (this.radarLine.angle - this.radarLine.angleMaxOverture / 2)) && 
				(markerDistance < this.radarLine.radius)) {

				if(this.aMarkers[i].handle)
					this.aMarkers[i].handle();

				this.aMarkers[i].hasbeenShown = true;

			}
		}
	} else {
		//console.log("no marker at all");
	}

	// Count the laps.
	this.lapsAndLoops(this.radarLine, "rotateLine");

}

GoogleRadar.prototype.stopLine = function() {
	window.clearTimeout(this.radarLine.callback);
	this.radarLine.callback = null;
}

GoogleRadar.prototype.forceStartLine = function() {
	this.radarLine.autostart = true;
	
	if(this.radarLine.autostart)
		this.rotateLine();
}

GoogleRadar.prototype.hideLine = function() {
	this.radarLine.shape.setVisible(false);
}

GoogleRadar.prototype.showLine = function() {
	this.radarLine.shape.setVisible(true);
}

/**
 * Polygon
 */
GoogleRadar.prototype.addRadarPolygon = function(opts) {
	if( typeof (this.radarPolygon) == "undefined") {
		this.radarPolygon = {};
		this.radarPolygon.id = (opts && opts.id) || "polygon_" + Math.random();
		this.radarPolygon.radius = (opts && opts.radius) || 1;//km
		this.radarPolygon.time = (opts && opts.time) || 100;
		this.radarPolygon.angle = (opts && opts.angle) || 0;
		this.radarPolygon.angleOrigin = (opts && opts.angleOrigin) || 0;
		this.radarPolygon.angleIncrease = (opts && opts.angleIncrease) || 5;
		this.radarPolygon.angleMaxOverture = 10;
		this.radarPolygon.shapeCoords = (opts && opts.shapeCoords) || [this.center, this.destinationPoint(this.center, this.radarPolygon.radius, this.radarPolygon.angleMaxOverture / 2), this.destinationPoint(this.center, this.radarPolygon.radius, -this.radarPolygon.angleMaxOverture / 2), this.center];
		this.radarPolygon.lapCurrent = 0;
		this.radarPolygon.lapMax = (opts && opts.lapMax)|| 0;
		
		if(opts && (typeof(opts.autostart) == 'boolean'))
			this.radarPolygon.autostart = opts.autostart;
		else 
			this.radarPolygon.autostart = true;

		this.radarPolygon.shape = new google.maps.Polygon({
			clickable: false,
			fillColor : (opts && opts.fillColor) || "#FF0000",
			fillOpacity : (opts && opts.fillOpacity) || "0.5",
			geodesic : false,
			map: this.map,
			paths : this.radarPolygon.shapeCoords,
			strokeColor : (opts && opts.strokeColor) || "#FF0000",
			strokeOpacity : (opts && opts.strokeOpacity) || 0.8,
			strokeWeight : (opts && opts.strokeWeight) || 2,
			zIndex: (opts && opts.zIndex) || 6
		});
	} 
	else {
		if(this.radarPolygon.callback != null) 
		return false;
	}

	if(this.radarPolygon.autostart)
		this.rotatePolygon();
}

GoogleRadar.prototype.rotatePolygon = function(stop) {
	if(!this.radarPolygon.angle && !this.radarPolygon.time && !this.radarPolygon.angleIncrease)
		return false;
	// Transform the shape with google.latlng into {distance, bearing} array
	this.radarPolygon.shapeCylindric = new Array();

	for( i = 0; i < this.radarPolygon.shapeCoords.length; i++) {

		this.radarPolygon.shapeCylindric.push({
			distance : this.distanceFrom(this.center, this.radarPolygon.shapeCoords[i]),
			angle : this.bearingTo(this.center, this.radarPolygon.shapeCoords[i])
		});

	}

	this.rotateInArray(stop);
}

GoogleRadar.prototype.rotateInArray = function(stop) {
	var aNewShapePolygon = [];

	for(var i = 0; i < this.radarPolygon.shapeCylindric.length; i++) {
		var remote = this.destinationPoint(this.center, this.radarPolygon.shapeCylindric[i].distance, this.radarPolygon.shapeCylindric[i].angle + this.radarPolygon.angle);
		aNewShapePolygon.push(remote);
	}

	this.radarPolygon.shape.setPath(aNewShapePolygon);

	//detect if there is a marker in it
	this.detectMarkers(this.radarPolygon);

	// Count the laps.
	if((typeof(stop) == "boolean" && stop==false) || (stop==null))
		this.lapsAndLoops(this.radarPolygon, "rotateInArray");
}

GoogleRadar.prototype.stopPolygon = function() {
	window.clearTimeout(this.radarPolygon.callback);
	this.radarPolygon.callback = null;
}

GoogleRadar.prototype.forceStartPolygon = function() {
	this.radarPolygon.autostart = true;
	
	if(this.radarPolygon.autostart)
		this.rotatePolygon();
}

GoogleRadar.prototype.hidePolygon = function() {
	this.radarPolygon.shape.setVisible(false);
}

GoogleRadar.prototype.showPolygon = function() {
	this.radarPolygon.shape.setVisible(true);
}

GoogleRadar.prototype.justRotatePolygon = function(angle) {
	this.radarPolygon.angle+= angle;
	this.rotatePolygon(true);
}

/**
 * Laps and loops
 */
GoogleRadar.prototype.lapsAndLoops = function(radar, funcName) {
	if(radar.lapMax == 0 || radar.lapCurrent < radar.lapMax)
	{
		radar.angle = (radar.angle + radar.angleIncrease) % 360;
		
		if(typeof(GoogleRadar.aRadars) == "object")
		{
			//mmmh, let's see...
		}
		else 
		{
			GoogleRadar.aRadars = new Array();
		}
		
		GoogleRadar.aRadars[radar.id] = this;
		radar.callback = window.setTimeout('GoogleRadar.aRadars["'+radar.id+'"].'+funcName+'()', radar.time);
		if(radar.angle==radar.angleOrigin)
		{
			radar.lapCurrent++;
		}
	}
}

/**
 * Markers
 */
GoogleRadar.prototype.detectMarkers = function (radar){
		if(this.aMarkers != null) {

		for(var i = 0; i < this.aMarkers.length; i++) {
			var markerAngle = this.bearingTo(this.center, this.aMarkers[i].getPosition());
			var markerDistance = this.distanceFrom(this.center, this.aMarkers[i].getPosition());
			if(radar.angle == radar.angleOrigin)
				this.aMarkers[i].hasbeenShown = false;

			if(!this.aMarkers[i].hasbeenShown && (google.maps.geometry.poly.containsLocation(this.aMarkers[i].getPosition(),radar.shape))) 
			{

				if(this.aMarkers[i].handle)
					this.aMarkers[i].handle();

				this.aMarkers[i].hasbeenShown = true;

			}
		}
	} else {
		//console.log("no marker at all");
	}
}

GoogleRadar.prototype.addMarker = function(marker) {

	if(marker.lat == null || marker.lng == null || marker.id == null || marker.iconUrl == null)
		return false;

	if( typeof (this.aMarkers) === "undefined")
		return false;

	var gMarker = new google.maps.Marker({
		map : this.map,
		draggable : false,
		position : new google.maps.LatLng(marker.lat, marker.lng),
		icon : marker.iconUrl || null,
		handle : marker.handle || null,
		id : marker.id,
		visible : (marker.visible == null) && true
	});

	this.aMarkers.push(gMarker);
}

GoogleRadar.prototype.removeMarker = function(marker) {
	if(marker != null) {
		for( i = 0; i < this.aMarkers.length; i++) {
			if(this.aMarkers[i].id == marker.id)
			{
				this.aMarkers[i].setVisible(false);
				this.aMarkers[i].setPosition(null);
				this.aMarkers[i].unbindAll();
				this.aMarkers[i] = undefined;
				this.aMarkers.splice(i,1);
			}
		}
	}
}

GoogleRadar.prototype.addSetOfMarkersToDetect = function(aMarkersParams) {
	for( i = 0; i < aMarkersParams.length; i++) {
		this.addMarker(aMarkersParams[i]);
	}
}

GoogleRadar.prototype.removeSetOfMarkersToDetect = function(aMarkersParams) {
	for( j = 0; j < aMarkersParams.length; j++) {
		this.removeMarker(aMarkersParams[j]);
	}
}

/**
 * Browsers Compat
 */
if( typeof (Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function() {
		return this * Math.PI / 180;
	}
}

if( typeof (Number.prototype.toDeg) === "undefined") {
	Number.prototype.toDeg = function() {
		return this / Math.PI * 180;
	}
}

/**
 * Some Maths functions...
 */

GoogleRadar.prototype.distanceFrom = function(LatLng1, LatLng2) {
	var R = this.EarthRadius; // km
	var dLat = (LatLng2.lat() - LatLng1.lat()).toRad();
	var dLon = (LatLng2.lng() - LatLng1.lng()).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(LatLng1.lat().toRad()) * Math.cos(LatLng2.lat().toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;
	return d;
}

// Huge thanks to http://www.movable-type.co.uk/scripts/latlong.html
GoogleRadar.prototype.destinationPoint = function(initLatLon, dist, brng) {
	dist = typeof (dist) == "number" ? dist : typeof (dist) == "string" && dist.trim() != "" ? +dist : NaN;
	dist = dist / this.EarthRadius;
	// convert dist to angular distance in radians
	brng = brng.toRad();

	var lat1 = initLatLon.lat().toRad(), lon1 = initLatLon.lng().toRad();
	var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) + Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
	var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1), Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));
	lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
	// normalise to -180...+180
	return new google.maps.LatLng(lat2.toDeg(), lon2.toDeg());
}

GoogleRadar.prototype.bearingTo = function(gLatLngInit, gLatLng) {
	var lat1 = gLatLngInit.lat().toRad(), lat2 = gLatLng.lat().toRad();
	var dLon = (gLatLng.lng() - gLatLngInit.lng()).toRad();

	var y = Math.sin(dLon) * Math.cos(lat2);
	var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
	var brng = Math.atan2(y, x);

	return (brng.toDeg() + 360) % 360;
}