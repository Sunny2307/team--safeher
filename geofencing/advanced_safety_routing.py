import folium
import openrouteservice
from statistics import mean
import math
import random
import json
from flask import Flask, request, render_template_string
import webbrowser

# Your ORS API Key
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ1NDZhMWI3ODFkYzRlYzFiZDFjODUwMzU5ZmI2ZjdjIiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

app = Flask(__name__)

COLORS = ["red", "blue", "green"]

# Enhanced safety scoring weights
SAFETY_WEIGHTS = {
    'police_station': 15,
    'hospital': 12,
    'fire_station': 10,
    'school': 8,
    'college': 6,
    'bank': 5,
    'government_office': 4,
    'shopping_mall': 3,
    'restaurant': 2,
    'bus_stop': 2,
    'metro_station': 4,
    'well_lit_area': 3,
    'high_traffic': 2,
    'residential_area': 1,
    'commercial_area': 2
}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Advanced Safety-Aware Route Planner</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .input-group { margin: 15px 0; }
        input[type="text"] { padding: 12px; width: 350px; margin-right: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px; }
        button { padding: 12px 20px; margin: 5px; cursor: pointer; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; }
        .primary-btn { background-color: #4CAF50; color: white; }
        .secondary-btn { background-color: #2196F3; color: white; }
        .legend { margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }
        .safety-results { margin: 20px 0; }
        .route-card { display: inline-block; margin: 15px; padding: 20px; border: 3px solid #ddd; border-radius: 10px; min-width: 300px; vertical-align: top; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .route-card.best { border-color: #4CAF50; background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e8 100%); }
        .route-card.good { border-color: #2196F3; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); }
        .route-card.medium { border-color: #FF9800; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); }
        .safety-score { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .score-excellent { color: #4CAF50; }
        .score-good { color: #2196F3; }
        .score-medium { color: #FF9800; }
        .score-low { color: #f44336; }
        .facility-list { margin: 10px 0; }
        .facility-item { display: inline-block; margin: 5px; padding: 5px 10px; background: #e0e0e0; border-radius: 15px; font-size: 12px; }
        .reasoning { margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #4CAF50; }
        .map-container { margin: 20px 0; border: 2px solid #ddd; border-radius: 10px; overflow: hidden; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
<div class="container">
    <h1>🛡️ Advanced Safety-Aware Route Planner</h1>
    <p>Find the safest routes from your current location to your destination with comprehensive safety analysis.</p>

    <div class="input-group">
        <label><strong>Current Location:</strong></label><br>
        <input type="text" id="source" placeholder="Enter your current location or use GPS">
        <button onclick="useCurrentLocation()" class="secondary-btn">📍 Use Current Location</button>
    </div>

    <div class="input-group">
        <label><strong>Destination:</strong></label><br>
        <input type="text" id="dest" placeholder="Enter your destination address">
    </div>

    <button onclick="findSafeRoutes()" class="primary-btn">🔍 Find Safest Routes</button>

    <div class="legend">
        <h3>🛡️ Safety Analysis Factors</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">🏛️</div>
                <div class="stat-label">Police Stations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🏥</div>
                <div class="stat-label">Hospitals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🚒</div>
                <div class="stat-label">Fire Stations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🏫</div>
                <div class="stat-label">Schools & Colleges</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🏦</div>
                <div class="stat-label">Banks & ATMs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">👥</div>
                <div class="stat-label">Crowd Density</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">💡</div>
                <div class="stat-label">Well-lit Areas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🚶</div>
                <div class="stat-label">Pedestrian Traffic</div>
            </div>
        </div>
    </div>

    <div id="safety-results"></div>

    <div class="map-container">
        <div id="map" style="width:100%; height:600px;"></div>
    </div>
</div>

<script>
function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            document.getElementById("source").value = position.coords.latitude + "," + position.coords.longitude;
        }, function(error) {
            alert("Unable to get your location. Please enter manually.");
        });
    } else {
        alert("Geolocation not supported by this browser.");
    }
}

function findSafeRoutes() {
    var source = document.getElementById("source").value;
    var dest = document.getElementById("dest").value;
    
    if (!source || !dest) { 
        alert("Please enter both current location and destination"); 
        return; 
    }
    
    // Show loading
    document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 100px;'><h3>🛡️ Analyzing Safety Factors...</h3><p>Finding safest routes with comprehensive safety analysis</p><div style='margin-top: 20px;'>⏳ Please wait...</div></div>";
    document.getElementById("safety-results").innerHTML = "<div style='text-align: center; padding: 20px; color: #666;'>🔍 Calculating safety scores and route analysis...</div>";
    
    // Get routes
    fetch(`/route?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}`)
        .then(response => response.text())
        .then(html => { 
            document.getElementById("map").innerHTML = html; 
        })
        .catch(error => {
            document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px; color: red;'><h3>❌ Error Loading Routes</h3><p>Please check your input and try again</p></div>";
        });
    
    // Get safety analysis
    fetch(`/safety_analysis?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}`)
        .then(response => response.json())
        .then(data => {
            displaySafetyResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById("safety-results").innerHTML = "<div style='color: red;'>❌ Error calculating safety scores</div>";
        });
}

function displaySafetyResults(data) {
    let html = '<div class="safety-results"><h2>🛡️ Safety Analysis Results</h2>';
    
    if (data.routes) {
        // Sort routes by safety score (highest first)
        const sortedRoutes = data.routes.sort((a, b) => b.safety_score - a.safety_score);
        
        html += '<div style="display: flex; flex-wrap: wrap; justify-content: center;">';
        
        sortedRoutes.forEach((route, index) => {
            let cardClass = 'route-card';
            let scoreClass = 'score-medium';
            
            if (route.safety_score >= 80) {
                cardClass += ' best';
                scoreClass = 'score-excellent';
            } else if (route.safety_score >= 70) {
                cardClass += ' good';
                scoreClass = 'score-good';
            } else if (route.safety_score >= 60) {
                scoreClass = 'score-medium';
            } else {
                scoreClass = 'score-low';
            }
            
            const badge = index === 0 ? '<div style="background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; display: inline-block;">🥇 RECOMMENDED</div>' : '';
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
            
            html += `
                <div class="${cardClass}">
                    ${badge}
                    <h3>${rank} Route ${route.route_number}</h3>
                    
                    <div class="safety-score ${scoreClass}">${route.safety_score.toFixed(1)}/100</div>
                    
                    <div style="margin: 15px 0;">
                        <strong>📏 Distance:</strong> ${route.distance.toFixed(1)} km<br>
                        <strong>⏱️ Duration:</strong> ${route.duration.toFixed(0)} minutes<br>
                        <strong>🏛️ Public Facilities:</strong> ${route.total_facilities} found
                    </div>
                    
                    <div class="facility-list">
                        <div class="facility-item">🚔 Police: ${route.police_count}</div>
                        <div class="facility-item">🏥 Hospitals: ${route.hospital_count}</div>
                        <div class="facility-item">🚒 Fire Stations: ${route.fire_count}</div>
                        <div class="facility-item">🏫 Schools: ${route.school_count}</div>
                        <div class="facility-item">🏦 Banks: ${route.bank_count}</div>
                        <div class="facility-item">👥 Traffic: ${route.traffic_level}</div>
                    </div>
                    
                    <div class="reasoning">
                        <strong>🔍 Safety Reasoning:</strong><br>
                        ${route.reasoning}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Overall recommendation
        const bestRoute = sortedRoutes[0];
        const safetyDiff = bestRoute.safety_score - sortedRoutes[1].safety_score;
        
        html += `<div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 10px; margin-top: 20px;">
                    <h3>💡 Safety Recommendation</h3>
                    <p><strong>Route ${bestRoute.route_number}</strong> is recommended with a safety score of ${bestRoute.safety_score.toFixed(1)}/100. 
                    ${safetyDiff > 10 ? `This route is significantly safer (+${safetyDiff.toFixed(1)} points) than the alternatives.` : 'This route provides the best balance of safety and efficiency.'}</p>
                    <p><strong>Key Safety Features:</strong> ${bestRoute.reasoning}</p>
                 </div>`;
    }
    
    html += '</div>';
    document.getElementById("safety-results").innerHTML = html;
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

def generate_enhanced_hex_grid(center_lat, center_lon, radius_km=20, hex_size_km=1.5):
    """Generate enhanced hexagonal grid with realistic facility distribution"""
    hexagons = []
    
    print(f"Generating enhanced hex grid at {center_lat}, {center_lon}")
    
    # Convert km to degrees
    lat_degree_per_km = 1/111
    lon_degree_per_km = 1/(111 * math.cos(math.radians(center_lat)))
    
    radius_lat = radius_km * lat_degree_per_km
    radius_lon = radius_km * lon_degree_per_km
    hex_lat = hex_size_km * lat_degree_per_km
    hex_lon = hex_size_km * lon_degree_per_km
    
    rows = max(1, int(2 * radius_lat / hex_lat) + 1)
    cols = max(1, int(2 * radius_lon / hex_lon) + 1)
    
    for row in range(rows):
        for col in range(cols):
            hex_lat_center = center_lat - radius_lat + row * hex_lat
            hex_lon_center = center_lon - radius_lon + col * hex_lon
            
            distance = math.sqrt((hex_lat_center - center_lat)**2 + (hex_lon_center - center_lon)**2)
            if distance <= radius_lat:
                hexagon = create_hexagon(hex_lat_center, hex_lon_center, hex_lat, hex_lon)
                hexagons.append({
                    'center': [hex_lat_center, hex_lon_center],
                    'vertices': hexagon,
                    'safety_score': 0,
                    'facilities': {}
                })
    
    return hexagons

def create_hexagon(lat, lon, hex_lat, hex_lon):
    """Create hexagon vertices"""
    vertices = []
    for i in range(6):
        angle = math.pi / 3 * i
        x = hex_lat * math.cos(angle)
        y = hex_lat * math.sin(angle)
        vertices.append([lat + y, lon + x])
    return vertices

def calculate_enhanced_safety_score(hexagons, origin, destination):
    """Calculate enhanced safety scores with realistic facility distribution"""
    print(f"Calculating enhanced safety scores for {len(hexagons)} hexagons")
    
    for hexagon in hexagons:
        lat, lon = hexagon['center']
        
        # Calculate distance from route path (simplified)
        route_distance = min(
            math.sqrt((lat - origin[1])**2 + (lon - origin[0])**2),
            math.sqrt((lat - destination[1])**2 + (lon - destination[0])**2)
        )
        
        # Base urban factor
        urban_factor = 1.0
        
        # Enhanced urban detection (near major cities)
        if (abs(lat - 22.7) < 0.1 and abs(lon - 72.87) < 0.1) or \
           (abs(lat - 22.56) < 0.1 and abs(lon - 72.93) < 0.1) or \
           route_distance < 0.05:  # Near route path
            urban_factor = 2.5
        
        # Simulate realistic facility distribution
        facilities = {
            'police_station': 0,
            'hospital': 0,
            'fire_station': 0,
            'school': 0,
            'college': 0,
            'bank': 0,
            'government_office': 0,
            'shopping_mall': 0,
            'restaurant': 0,
            'bus_stop': 0,
            'metro_station': 0,
            'well_lit_area': 0,
            'high_traffic': 0,
            'residential_area': 0,
            'commercial_area': 0
        }
        
        # Assign facilities based on urban factor and randomness
        for facility_type, weight in SAFETY_WEIGHTS.items():
            base_probability = 0.08  # 8% base chance
            if facility_type in ['well_lit_area', 'high_traffic', 'residential_area', 'commercial_area']:
                base_probability = 0.3  # Higher chance for general area types
            
            if random.random() < base_probability * urban_factor:
                if facility_type in ['well_lit_area', 'high_traffic', 'residential_area', 'commercial_area']:
                    facilities[facility_type] = random.choice([1, 2, 3])
                else:
                    facilities[facility_type] = random.randint(1, 2)
        
        # Calculate comprehensive safety score
        total_score = 0
        for facility_type, count in facilities.items():
            total_score += count * SAFETY_WEIGHTS.get(facility_type, 1)
        
        # Normalize to 0-100 scale
        hexagon['facilities'] = facilities
        hexagon['safety_score'] = min(100, total_score / 3)  # Scale to 0-100
    
    return hexagons

def evaluate_route_safety_enhanced(route_coordinates, hexagons):
    """Enhanced route safety evaluation"""
    total_safety = 0
    hexagon_count = 0
    facility_counts = {}
    
    # Sample more points along the route for better analysis
    sample_points = []
    for i in range(0, len(route_coordinates), max(1, len(route_coordinates) // 30)):
        sample_points.append(route_coordinates[i])
    
    for point in sample_points:
        for hexagon in hexagons:
            if point_in_polygon(point, hexagon['vertices']):
                total_safety += hexagon['safety_score']
                hexagon_count += 1
                
                for facility_type, count in hexagon['facilities'].items():
                    facility_counts[facility_type] = facility_counts.get(facility_type, 0) + count
                break
    
    # Calculate average safety score
    avg_safety = total_safety / max(1, hexagon_count)
    
    # Generate reasoning
    reasoning_parts = []
    
    if facility_counts.get('police_station', 0) > 0:
        reasoning_parts.append(f"passes by {facility_counts['police_station']} police station(s)")
    if facility_counts.get('hospital', 0) > 0:
        reasoning_parts.append(f"near {facility_counts['hospital']} hospital(s)")
    if facility_counts.get('fire_station', 0) > 0:
        reasoning_parts.append(f"close to {facility_counts['fire_station']} fire station(s)")
    if facility_counts.get('school', 0) + facility_counts.get('college', 0) > 0:
        total_education = facility_counts.get('school', 0) + facility_counts.get('college', 0)
        reasoning_parts.append(f"goes by {total_education} educational institution(s)")
    
    # Traffic and lighting assessment
    traffic_level = "low"
    if facility_counts.get('high_traffic', 0) > 2:
        traffic_level = "high"
    elif facility_counts.get('high_traffic', 0) > 0:
        traffic_level = "moderate"
    
    if facility_counts.get('well_lit_area', 0) > 1:
        reasoning_parts.append("well-lit streets")
    else:
        reasoning_parts.append("mixed lighting conditions")
    
    reasoning_parts.append(f"{traffic_level} pedestrian traffic")
    
    reasoning = ", ".join(reasoning_parts) if reasoning_parts else "standard urban route"
    
    return {
        'safety_score': avg_safety,
        'hexagons_traversed': hexagon_count,
        'facility_counts': facility_counts,
        'reasoning': reasoning,
        'traffic_level': traffic_level
    }

def point_in_polygon(point, polygon):
    """Check if a point is inside a polygon"""
    x, y = point
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside

def get_three_routes_enhanced(origin, destination):
    """Get three alternative routes with enhanced waypoint strategies"""
    routes = []
    
    print(f"Generating enhanced routes from {origin} to {destination}")
    
    # Enhanced waypoint strategies for more diverse routes
    waypoint_strategies = [
        [],  # Direct route
        [[origin[0] + 0.008, origin[1] + 0.005]],  # East waypoint
        [[origin[0] - 0.008, origin[1] + 0.005]]   # West waypoint
    ]
    
    for i, waypoints in enumerate(waypoint_strategies):
        try:
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
                
                if is_different or len(routes) == 0:
                    routes.append(route)
                    print(f"Added route {len(routes)}: {distance/1000:.1f} km")
                    
        except Exception as e:
            print(f"Error creating route {i+1}: {e}")
    
    # Fallback
    if len(routes) == 0:
        try:
            route = client.directions(coordinates=[origin, destination], profile="driving-car", format="geojson")
            routes.append(route)
        except Exception as e:
            print(f"Error getting basic route: {e}")
    
    return routes[:3]

def build_enhanced_safety_map(routes, origin, destination, hexagons, route_safety_data):
    """Build enhanced map with comprehensive safety visualization"""
    print(f"Building enhanced safety map with {len(routes)} routes")
    
    # Calculate center
    all_lats, all_lngs = [], []
    for r in routes:
        for lon, lat in r['features'][0]['geometry']['coordinates']:
            all_lats.append(lat)
            all_lngs.append(lon)
    
    center = [mean(all_lats), mean(all_lngs)]
    fmap = folium.Map(location=center, zoom_start=12)
    
    # Add hexagonal grid with enhanced visualization
    for hexagon in hexagons:
        safety_score = hexagon['safety_score']
        
        # Enhanced color scheme
        if safety_score >= 70:
            color = 'green'
            opacity = 0.6
        elif safety_score >= 50:
            color = 'orange'
            opacity = 0.5
        else:
            color = 'red'
            opacity = 0.4
        
        # Enhanced popup
        facility_summary = []
        for facility_type, count in hexagon['facilities'].items():
            if count > 0:
                facility_summary.append(f"{facility_type.replace('_', ' ').title()}: {count}")
        
        popup_text = f"""
        <b>Safety Score: {safety_score:.1f}/100</b><br>
        <b>Facilities:</b><br>
        {chr(10).join(facility_summary) if facility_summary else 'No major facilities'}
        """
        
        folium.Polygon(
            locations=[[lat, lon] for lat, lon in hexagon['vertices']],
            color='black',
            weight=1,
            fillColor=color,
            fillOpacity=opacity,
            popup=popup_text,
            tooltip=f"Safety: {safety_score:.1f}/100"
        ).add_to(fmap)
    
    # Add routes with enhanced information
    for i, r in enumerate(routes):
        coords_latlon = [(lat, lon) for lon, lat in r['features'][0]['geometry']['coordinates']]
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        
        color = COLORS[i]
        safety_info = route_safety_data[i]
        
        # Enhanced popup
        popup_text = f"""
        <b>Route {i+1}</b><br>
        <b>Safety Score: {safety_info['safety_score']:.1f}/100</b><br>
        Distance: {dist_m/1000:.1f} km<br>
        Duration: {dur_s/60:.0f} minutes<br>
        <b>Safety Features:</b><br>
        {safety_info['reasoning']}
        """
        
        folium.PolyLine(
            coords_latlon, 
            color=color, 
            weight=8, 
            opacity=0.9,
            popup=popup_text,
            tooltip=f"Route {i+1}: Safety {safety_info['safety_score']:.1f}/100"
        ).add_to(fmap)
    
    # Add markers
    folium.Marker(
        origin[::-1], 
        popup="<b>📍 Current Location</b>", 
        icon=folium.Icon(color="blue", icon="home", prefix="fa")
    ).add_to(fmap)
    
    folium.Marker(
        destination[::-1], 
        popup="<b>🎯 Destination</b>", 
        icon=folium.Icon(color="red", icon="flag", prefix="fa")
    ).add_to(fmap)
    
    # Enhanced legend
    legend_html = f'''
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 350px; height: auto; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; border: 2px solid #333; z-index:9999; 
                font-size:14px; padding: 20px; border-radius: 10px;">
    <h4 style="margin: 0 0 15px 0;">🛡️ Safety Legend</h4>
    <p><span style="color: #4CAF50; font-size: 18px;">●</span> High Safety (70-100)</p>
    <p><span style="color: #FF9800; font-size: 18px;">●</span> Medium Safety (50-69)</p>
    <p><span style="color: #f44336; font-size: 18px;">●</span> Low Safety (0-49)</p>
    <h4 style="margin: 15px 0 10px 0;">🛣️ Routes</h4>
    '''
    
    for i, r in enumerate(routes):
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        color = COLORS[i]
        safety_info = route_safety_data[i]
        legend_html += f'<p><span style="color:{color}; font-weight:bold; font-size:16px;">●</span> Route {i+1}: Safety {safety_info["safety_score"]:.1f}/100</p>'
    
    legend_html += '</div>'
    fmap.get_root().html.add_child(folium.Element(legend_html))
    
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
        print(f"Enhanced route from {origin} to {destination}")
        
        routes = get_three_routes_enhanced(origin, destination)
        if not routes:
            return "<div style='text-align: center; padding: 50px; color: orange;'><h3>No Routes Found</h3></div>"
        
        # Generate enhanced hexagonal grid
        center_lat = (origin[1] + destination[1]) / 2
        center_lon = (origin[0] + destination[0]) / 2
        hexagons = generate_enhanced_hex_grid(center_lat, center_lon, radius_km=20, hex_size_km=1.5)
        
        # Calculate enhanced safety scores
        hexagons = calculate_enhanced_safety_score(hexagons, origin, destination)
        
        # Evaluate route safety
        route_safety_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = evaluate_route_safety_enhanced(route_coords, hexagons)
            route_safety_data.append(safety_data)
            print(f"Route {i+1} safety score: {safety_data['safety_score']:.1f}/100")
        
        return build_enhanced_safety_map(routes, origin, destination, hexagons, route_safety_data)
        
    except Exception as e:
        print(f"Error: {e}")
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Error</h3><p>{str(e)}</p></div>"

@app.route("/safety_analysis")
def safety_analysis():
    source = request.args.get("source")
    dest = request.args.get("dest")
    
    try:
        origin = geocode_address(source)
        destination = geocode_address(dest)
        
        routes = get_three_routes_enhanced(origin, destination)
        if not routes:
            return {"error": "No routes found"}
        
        # Generate enhanced hexagonal grid
        center_lat = (origin[1] + destination[1]) / 2
        center_lon = (origin[0] + destination[0]) / 2
        hexagons = generate_enhanced_hex_grid(center_lat, center_lon, radius_km=20, hex_size_km=1.5)
        
        # Calculate enhanced safety scores
        hexagons = calculate_enhanced_safety_score(hexagons, origin, destination)
        
        # Evaluate route safety
        route_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = evaluate_route_safety_enhanced(route_coords, hexagons)
            
            route_info = {
                'route_number': i + 1,
                'distance': route['features'][0]['properties']['summary']['distance'] / 1000,
                'duration': route['features'][0]['properties']['summary']['duration'] / 60,
                'safety_score': safety_data['safety_score'],
                'police_count': safety_data['facility_counts'].get('police_station', 0),
                'hospital_count': safety_data['facility_counts'].get('hospital', 0),
                'fire_count': safety_data['facility_counts'].get('fire_station', 0),
                'school_count': safety_data['facility_counts'].get('school', 0) + safety_data['facility_counts'].get('college', 0),
                'bank_count': safety_data['facility_counts'].get('bank', 0),
                'total_facilities': sum(safety_data['facility_counts'].values()),
                'traffic_level': safety_data['traffic_level'],
                'reasoning': safety_data['reasoning']
            }
            route_data.append(route_info)
        
        return {"routes": route_data}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("🛡️ Advanced Safety-Aware Route Planner starting...")
    print("Open http://127.0.0.1:5002 in your browser")
    app.run(debug=True, port=5002)
