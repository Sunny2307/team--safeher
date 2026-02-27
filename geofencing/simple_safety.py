import folium
import openrouteservice
from statistics import mean
import math
import random
from flask import Flask, request, render_template_string

# Your ORS API Key
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ1NDZhMWI3ODFkYzRlYzFiZDFjODUwMzU5ZmI2ZjdjIiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

app = Flask(__name__)

COLORS = ["red", "blue", "green"]

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Simple Safety Route Finder</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .input-group { margin: 10px 0; }
        input[type="text"] { padding: 8px; width: 300px; margin-right: 10px; }
        button { padding: 8px 15px; margin: 5px; cursor: pointer; }
        .legend { margin: 10px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }
    </style>
</head>
<body>
<h2>Simple Safety Route Finder</h2>
<p>Enter source and destination to see routes with hexagon safety analysis:</p>

<div class="input-group">
    <label>Source:</label>
    <input type="text" id="source" placeholder="Enter source place">
    <button onclick="useCurrentLocation()">Use Current Location</button>
</div>

<div class="input-group">
    <label>Destination:</label>
    <input type="text" id="dest" placeholder="Enter destination place">
</div>

<button onclick="plotRoute()" style="background-color: #4CAF50; color: white;">Show Routes with Safety</button>

<div class="legend">
    <strong>Safety Legend:</strong>
    <p>🟢 Green: High Safety (7-10) | 🟠 Orange: Medium Safety (4-6) | 🔴 Red: Low Safety (0-3)</p>
</div>

<div id="map" style="width:100%; height:700px; margin-top:20px; border: 2px solid #ddd;"></div>

<script>
function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            document.getElementById("source").value = position.coords.latitude + "," + position.coords.longitude;
        });
    } else {
        alert("Geolocation not supported");
    }
}

function plotRoute() {
    var source = document.getElementById("source").value;
    var dest = document.getElementById("dest").value;
    if (!source || !dest) { 
        alert("Please enter both source and destination"); 
        return; 
    }
    
    document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px;'><h3>Loading routes and safety analysis...</h3></div>";
    
    fetch(`/route?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}`)
        .then(response => response.text())
        .then(html => { 
            document.getElementById("map").innerHTML = html; 
        })
        .catch(error => {
            document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px; color: red;'><h3>Error loading routes</h3></div>";
        });
}
</script>
</body>
</html>
"""

def geocode_address(addr):
    """Return [lon, lat] for an address or 'lat,lon' string"""
    try:
        lat, lon = map(float, addr.split(","))
        return [lon, lat]
    except:
        result = client.pelias_search(text=addr)
        if len(result['features']) == 0:
            raise ValueError(f"Place '{addr}' not found")
        coords = result['features'][0]['geometry']['coordinates']
        return coords

def get_simple_routes(origin, destination):
    """Get simple routes"""
    routes = []
    
    # Create three different routes using waypoints
    waypoint_strategies = [
        [],  # Direct route
        [[origin[0] + 0.005, origin[1] + 0.003]],  # East waypoint
        [[origin[0] - 0.005, origin[1] + 0.003]]   # West waypoint
    ]
    
    for i, waypoints in enumerate(waypoint_strategies):
        try:
            coords = [origin]
            coords.extend(waypoints)
            coords.append(destination)
            
            route = client.directions(coordinates=coords, profile="driving-car", format="geojson")
            
            if route and 'features' in route and len(route['features']) > 0:
                routes.append(route)
                print(f"Added route {len(routes)}")
                
        except Exception as e:
            print(f"Error creating route {i+1}: {e}")
    
    # Fallback to single route
    if len(routes) == 0:
        try:
            route = client.directions(coordinates=[origin, destination], profile="driving-car", format="geojson")
            routes.append(route)
        except Exception as e:
            print(f"Error getting basic route: {e}")
    
    return routes[:3]

def create_simple_hex_grid(center_lat, center_lon):
    """Create a simple hex grid"""
    hexagons = []
    hex_size = 0.02  # Larger hexagons for visibility
    
    # Create a 7x7 grid
    for row in range(-3, 4):
        for col in range(-3, 4):
            lat = center_lat + row * hex_size * 0.866
            lon = center_lon + col * hex_size + (row % 2) * hex_size * 0.5
            
            # Create hexagon vertices
            vertices = []
            for i in range(6):
                angle = math.pi / 3 * i
                x = hex_size * math.cos(angle)
                y = hex_size * math.sin(angle)
                vertices.append([lat + y, lon + x])
            
            # Random safety score
            safety_score = random.uniform(0, 10)
            
            hexagons.append({
                'center': [lat, lon],
                'vertices': vertices,
                'safety_score': safety_score
            })
    
    print(f"Created {len(hexagons)} hexagons")
    return hexagons

def build_simple_map(routes, origin, destination):
    """Build map with hexagons and routes"""
    print(f"Building map with {len(routes)} routes")
    
    # Calculate center
    all_lats, all_lngs = [], []
    for r in routes:
        for lon, lat in r['features'][0]['geometry']['coordinates']:
            all_lats.append(lat)
            all_lngs.append(lon)
    
    center = [mean(all_lats), mean(all_lngs)]
    print(f"Map center: {center}")
    
    # Create map
    fmap = folium.Map(location=center, zoom_start=12)
    
    # Create and add hexagons
    hexagons = create_simple_hex_grid(center[0], center[1])
    
    for i, hexagon in enumerate(hexagons):
        safety_score = hexagon['safety_score']
        
        # Color based on safety score
        if safety_score >= 7:
            color = 'green'
            opacity = 0.6
        elif safety_score >= 4:
            color = 'orange'
            opacity = 0.4
        else:
            color = 'red'
            opacity = 0.3
        
        # Add hexagon
        folium.Polygon(
            locations=hexagon['vertices'],
            color='black',
            weight=2,
            fillColor=color,
            fillOpacity=opacity,
            popup=f"Safety: {safety_score:.1f}/10",
            tooltip=f"Safety: {safety_score:.1f}/10"
        ).add_to(fmap)
        
        if i < 3:
            print(f"Added hexagon {i}: safety={safety_score:.1f}, color={color}")
    
    # Add routes
    for i, r in enumerate(routes):
        coords_latlon = [(lat, lon) for lon, lat in r['features'][0]['geometry']['coordinates']]
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        
        color = COLORS[i]
        
        folium.PolyLine(
            coords_latlon, 
            color=color, 
            weight=6, 
            opacity=0.8,
            popup=f"Route {i+1}: {dist_m/1000:.1f} km, {dur_s/60:.0f} min",
            tooltip=f"Route {i+1}"
        ).add_to(fmap)
        
        print(f"Added route {i+1} with color {color}")
    
    # Add markers
    folium.Marker(origin[::-1], popup="Origin", icon=folium.Icon(color="black", icon="play")).add_to(fmap)
    folium.Marker(destination[::-1], popup="Destination", icon=folium.Icon(color="black", icon="stop")).add_to(fmap)
    
    print("Map created successfully")
    return fmap._repr_html_()

@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route("/route")
def route():
    source = request.args.get("source")
    dest = request.args.get("dest")
    
    if not source or not dest:
        return "<div style='text-align: center; padding: 50px; color: red;'><h3>Error</h3><p>Please provide both source and destination</p></div>"
    
    try:
        origin = geocode_address(source)
        destination = geocode_address(dest)
        print(f"Route from {origin} to {destination}")
        
        routes = get_simple_routes(origin, destination)
        if not routes:
            return "<div style='text-align: center; padding: 50px; color: orange;'><h3>No Routes Found</h3></div>"
        
        return build_simple_map(routes, origin, destination)
        
    except Exception as e:
        print(f"Error: {e}")
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Error</h3><p>{str(e)}</p></div>"

if __name__ == "__main__":
    print("Simple Safety Route Finder starting...")
    print("Open http://127.0.0.1:5001 in your browser")
    app.run(debug=True, port=5001)
