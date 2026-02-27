import folium
from statistics import mean
import openrouteservice
from flask import Flask, request, render_template_string
import webbrowser

# Replace with your ORS API key
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ1NDZhMWI3ODFkYzRlYzFiZDFjODUwMzU5ZmI2ZjdjIiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

app = Flask(__name__)

COLORS = ["red", "blue", "green"]
print(f"Available colors: {COLORS}")

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Alternative Routes Map</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .input-group { margin: 10px 0; }
        input[type="text"] { padding: 8px; width: 300px; margin-right: 10px; }
        button { padding: 8px 15px; margin: 5px; cursor: pointer; }
        .legend { margin: 10px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }
    </style>
</head>
<body>
<h2>Alternative Routes Map</h2>
<p>Enter Source and Destination to see up to 3 alternative routes:</p>

<div class="input-group">
    <label>Source:</label>
    <input type="text" id="source" placeholder="Enter source place or use current location">
    <button onclick="useCurrentLocation()">Use Current Location</button>
</div>

<div class="input-group">
    <label>Destination:</label>
    <input type="text" id="dest" placeholder="Enter destination place">
</div>

<button onclick="plotRoute()" style="background-color: #4CAF50; color: white;">Show Alternative Routes</button>

<div class="legend">
    <strong>All alternative routes will be displayed on one map below:</strong>
    <p>🔴 Route 1 (Red) | 🔵 Route 2 (Blue) | 🟢 Route 3 (Green)</p>
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
    
    // Show loading message
    document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px;'><h3>Finding alternative routes...</h3><p>This may take a few moments</p></div>";
    
    fetch(`/route?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}`)
        .then(response => response.text())
        .then(html => { 
            document.getElementById("map").innerHTML = html; 
        })
        .catch(error => {
            document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px; color: red;'><h3>Error loading routes</h3><p>Please check your input and try again</p></div>";
            console.error('Error:', error);
        });
}
</script>
</body>
</html>
"""

def geocode_address(addr):
    """Return [lon, lat] for an address or 'lat,lon' string"""
    try:
        # If user entered coordinates directly
        lat, lon = map(float, addr.split(","))
        return [lon, lat]
    except:
        # Otherwise geocode using ORS Pelias
        result = client.pelias_search(text=addr)
        if len(result['features']) == 0:
            raise ValueError(f"Place '{addr}' not found")
        coords = result['features'][0]['geometry']['coordinates']
        return coords  # [lon, lat]

def get_three_routes(origin, destination):
    """Get three alternative routes using waypoint-based approach"""
    routes = []
    
    print(f"Generating routes from {origin} to {destination}")
    
    # Calculate distance between origin and destination
    import math
    lat_diff = destination[1] - origin[1]
    lon_diff = destination[0] - origin[0]
    distance_km = math.sqrt(lat_diff**2 + lon_diff**2) * 111  # Rough km conversion
    
    print(f"Direct distance: {distance_km:.1f} km")
    
    # Create three different routes using waypoints
    waypoint_strategies = [
        # Route 1: Direct route
        [],
        
        # Route 2: Route with waypoint to the east
        [[origin[0] + 0.005, origin[1] + 0.003]],
        
        # Route 3: Route with waypoint to the west  
        [[origin[0] - 0.005, origin[1] + 0.003]]
    ]
    
    for i, waypoints in enumerate(waypoint_strategies):
        try:
            print(f"Creating route {i+1} with {len(waypoints)} waypoints")
            
            # Build coordinates list
            coords = [origin]
            coords.extend(waypoints)
            coords.append(destination)
            
            print(f"Route {i+1} coordinates: {coords}")
            
            # Get route
            route = client.directions(coordinates=coords, profile="driving-car", format="geojson")
            
            if route and 'features' in route and len(route['features']) > 0:
                feature = route['features'][0]
                distance = feature['properties']['summary']['distance']
                duration = feature['properties']['summary']['duration']
                
                print(f"Route {i+1} created: {distance/1000:.1f} km, {duration/60:.0f} min")
                
                # Check if this route is significantly different
                is_different = True
                for existing_route in routes:
                    if existing_route and 'features' in existing_route and len(existing_route['features']) > 0:
                        existing_distance = existing_route['features'][0]['properties']['summary']['distance']
                        if abs(existing_distance - distance) < 50:  # Less than 50m difference
                            is_different = False
                            break
                
                if is_different or len(routes) == 0:
                    routes.append(route)
                    print(f"Added route {len(routes)}: {distance/1000:.1f} km")
                else:
                    print(f"Route {i+1} too similar to existing routes, skipping")
            else:
                print(f"Route {i+1} failed: Invalid response")
                
        except Exception as e:
            print(f"Error creating route {i+1}: {e}")
    
    # If we still don't have 3 routes, try with different waypoint strategies
    if len(routes) < 3:
        print("Trying alternative waypoint strategies...")
        
        # Calculate midpoint
        mid_lat = (origin[1] + destination[1]) / 2
        mid_lon = (origin[0] + destination[0]) / 2
        
        alternative_waypoints = [
            [[mid_lon + 0.008, mid_lat + 0.005]],  # Northeast of midpoint
            [[mid_lon - 0.008, mid_lat + 0.005]],  # Northwest of midpoint
            [[mid_lon, mid_lat + 0.008]]           # North of midpoint
        ]
        
        for i, waypoints in enumerate(alternative_waypoints):
            if len(routes) >= 3:
                break
                
            try:
                print(f"Trying alternative route {i+1}")
                
                coords = [origin]
                coords.extend(waypoints)
                coords.append(destination)
                
                route = client.directions(coordinates=coords, profile="driving-car", format="geojson")
                
                if route and 'features' in route and len(route['features']) > 0:
                    feature = route['features'][0]
                    distance = feature['properties']['summary']['distance']
                    
                    # Check uniqueness
                    is_different = True
                    for existing_route in routes:
                        if existing_route and 'features' in existing_route and len(existing_route['features']) > 0:
                            existing_distance = existing_route['features'][0]['properties']['summary']['distance']
                            if abs(existing_distance - distance) < 100:
                                is_different = False
                                break
                    
                    if is_different:
                        routes.append(route)
                        print(f"Added alternative route {len(routes)}: {distance/1000:.1f} km")
                        
            except Exception as e:
                print(f"Error with alternative route {i+1}: {e}")
    
    # Ensure we have at least one route
    if len(routes) == 0:
        try:
            print("Creating basic fallback route...")
            route = client.directions(coordinates=[origin, destination], profile="driving-car", format="geojson")
            routes.append(route)
            print("Added basic route as fallback")
        except Exception as e:
            print(f"Error getting basic route: {e}")
    
    print(f"Total routes generated: {len(routes)}")
    
    # Debug: Print details of each route
    for i, route in enumerate(routes):
        if route and 'features' in route and len(route['features']) > 0:
            feature = route['features'][0]
            distance = feature['properties']['summary']['distance']
            duration = feature['properties']['summary']['duration']
            print(f"Route {i+1}: {distance/1000:.1f} km, {duration/60:.0f} min, coordinates: {len(feature['geometry']['coordinates'])} points")
        else:
            print(f"Route {i+1}: Invalid route data")
            
    
    return routes[:3]  # Return maximum 3 routes

def build_map(routes, origin, destination):
    """Build ONE map showing ALL routes together with clickable functionality"""
    print(f"Building map with {len(routes)} routes")
    
    # Collect all coordinates to calculate the best center and bounds
    all_lats, all_lngs = [], []
    for i, r in enumerate(routes):
        print(f"Processing route {i+1}")
        for lon, lat in r['features'][0]['geometry']['coordinates']:
            all_lats.append(lat)
            all_lngs.append(lon)
    
    # Calculate center point to fit all routes
    center = [mean(all_lats), mean(all_lngs)]
    print(f"Map center: {center}")
    
    # Create ONE map that will show all routes
    fmap = folium.Map(location=center, zoom_start=12)
    
    # Create a FeatureGroup for each route to enable show/hide functionality
    route_groups = []
    for i, r in enumerate(routes):
        coords_latlon = [(lat, lon) for lon, lat in r['features'][0]['geometry']['coordinates']]
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        
        # Ensure each route gets a different color
        color = COLORS[i]
        print(f"Adding route {i+1} with color {color}, distance: {dist_m/1000:.1f} km")
        
        # Create a FeatureGroup for this route
        route_group = folium.FeatureGroup(name=f'Route {i+1} ({color.title()})', show=True)
        
        # Create detailed popup with route information
        popup_text = f"""
        <b>Route {i+1}</b><br>
        Distance: {dist_m/1000:.1f} km<br>
        Duration: {dur_s/60:.0f} minutes<br>
        Color: {color.title()}<br>
        <button onclick="toggleRoute({i})" style="background-color: {color}; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Toggle Route</button>
        """
        
        # Add this route line to the FeatureGroup
        route_line = folium.PolyLine(
            coords_latlon, 
            color=color, 
            weight=8, 
            opacity=0.9,
            popup=popup_text,
            tooltip=f"Click to focus on Route {i+1}: {dist_m/1000:.1f} km, {dur_s/60:.0f} min"
        )
        route_line.add_to(route_group)
        route_group.add_to(fmap)
        route_groups.append(route_group)
        
        print(f"Route {i+1} added to map with color: {color}")

    # Add origin and destination markers (always visible)
    folium.Marker(
        origin[::-1], 
        popup="<b>Origin</b><br>Start Point", 
        icon=folium.Icon(color="black", icon="play", prefix="fa")
    ).add_to(fmap)
    
    folium.Marker(
        destination[::-1], 
        popup="<b>Destination</b><br>End Point", 
        icon=folium.Icon(color="black", icon="stop", prefix="fa")
    ).add_to(fmap)
    
    # Add Layer Control to show/hide routes
    folium.LayerControl(position='topright', collapsed=False).add_to(fmap)
    
    # Add interactive legend with clickable buttons
    legend_html = f'''
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 300px; height: auto; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 15px; border-radius: 5px;">
    <p><b>Alternative Routes - Click to Focus:</b></p>
    '''
    
    for i, r in enumerate(routes):
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        color = COLORS[i]
        legend_html += f'''
        <div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            <button onclick="showOnlyRoute({i})" style="background-color: {color}; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 10px; width: 100px;">Show {color.title()}</button>
            <span style="color:{color}; font-weight:bold; font-size:16px;">●</span> Route {i+1}: {dist_m/1000:.1f} km, {dur_s/60:.0f} min
        </div>
        '''
        print(f"Legend entry for route {i+1}: color={color}")
    
    legend_html += '''
    <div style="margin-top: 10px;">
        <button onclick="showAllRoutes()" style="background-color: #666; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer; width: 100%;">Show All Routes</button>
    </div>
    </div>
    '''
    
    # Add JavaScript for route toggling
    js_code = '''
    <script>
    function showOnlyRoute(routeIndex) {
        // Hide all routes first
        for (let i = 0; i < 3; i++) {
            const layer = window.map._layers[Object.keys(window.map._layers).find(key => 
                window.map._layers[key].options && 
                window.map._layers[key].options.name && 
                window.map._layers[key].options.name.includes('Route ' + (i + 1))
            )];
            if (layer) {
                if (i === routeIndex) {
                    window.map.addLayer(layer);
                } else {
                    window.map.removeLayer(layer);
                }
            }
        }
    }
    
    function showAllRoutes() {
        // Show all routes
        Object.values(window.map._layers).forEach(layer => {
            if (layer.options && layer.options.name && layer.options.name.includes('Route')) {
                window.map.addLayer(layer);
            }
        });
    }
    
    function toggleRoute(routeIndex) {
        const layer = window.map._layers[Object.keys(window.map._layers).find(key => 
            window.map._layers[key].options && 
            window.map._layers[key].options.name && 
            window.map._layers[key].options.name.includes('Route ' + (routeIndex + 1))
        )];
        
        if (layer) {
            if (window.map.hasLayer(layer)) {
                window.map.removeLayer(layer);
            } else {
                window.map.addLayer(layer);
            }
        }
    }
    
    // Store map reference globally for JavaScript access
    window.map = null;
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for map to be initialized
        setTimeout(function() {
            if (typeof L !== 'undefined' && L.map) {
                const maps = document.querySelectorAll('.folium-map');
                if (maps.length > 0) {
                    const mapDiv = maps[maps.length - 1];
                    window.map = L.map(mapDiv.id);
                }
            }
        }, 1000);
    });
    </script>
    '''
    
    # Add the legend and JavaScript to the map
    fmap.get_root().html.add_child(folium.Element(legend_html + js_code))
    
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
    except ValueError as e:
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Geocoding Error</h3><p>{str(e)}</p></div>"
    except Exception as e:
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Error</h3><p>Failed to geocode addresses: {str(e)}</p></div>"
    
    try:
        routes = get_three_routes(origin, destination)
        if not routes:
            return "<div style='text-align: center; padding: 50px; color: orange;'><h3>No Routes Found</h3><p>Could not find any routes between the specified locations</p></div>"
        return build_map(routes, origin, destination)
    except Exception as e:
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Routing Error</h3><p>Failed to calculate routes: {str(e)}</p></div>"

if __name__ == "__main__":
    print("Open http://127.0.0.1:5000 in your browser")
    webbrowser.open("http://127.0.0.1:5000")
    app.run(debug=True)
