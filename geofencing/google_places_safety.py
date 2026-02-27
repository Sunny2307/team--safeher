import folium
import openrouteservice
import requests
import json
from statistics import mean
import math
import random
from flask import Flask, request, render_template_string
import webbrowser

# Your API Keys
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ1NDZhMWI3ODFkYzRlYzFiZDFjODUwMzU5ZmI2ZjdjIiwiaCI6Im11cm11cjY0In0="
GOOGLE_PLACES_API_KEY = "AIzaSyD4pJZ5KFPrxBpbcWcKLBEXGEz7CXeO7Rw"

client = openrouteservice.Client(key=ORS_API_KEY)
app = Flask(__name__)

COLORS = ["red", "blue", "green"]

# Safety scoring weights for different place types
SAFETY_WEIGHTS = {
    'hospital': 15,
    'police': 12,
    'fire_station': 10,
    'school': 8,
    'university': 6,
    'bank': 5,
    'shopping_mall': 4,
    'restaurant': 2,
    'bus_station': 3,
    'train_station': 4,
    'gas_station': 2,
    'pharmacy': 3,
    'atm': 2,
    'convenience_store': 1,
    'park': 3,
    'library': 4,
    'government_office': 4
}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Google Places Safety-Aware Route Planner</title>
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
        .route-card { display: inline-block; margin: 15px; padding: 20px; border: 3px solid #ddd; border-radius: 10px; min-width: 320px; vertical-align: top; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .route-card.best { border-color: #4CAF50; background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e8 100%); }
        .route-card.good { border-color: #2196F3; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); }
        .route-card.medium { border-color: #FF9800; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); }
        .safety-score { font-size: 28px; font-weight: bold; margin: 10px 0; }
        .score-excellent { color: #4CAF50; }
        .score-good { color: #2196F3; }
        .score-medium { color: #FF9800; }
        .score-low { color: #f44336; }
        .facility-list { margin: 15px 0; display: flex; flex-wrap: wrap; gap: 8px; }
        .facility-item { padding: 8px 12px; background: #e0e0e0; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .reasoning { margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #4CAF50; }
        .map-container { margin: 20px 0; border: 2px solid #ddd; border-radius: 10px; overflow: hidden; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; margin-top: 5px; opacity: 0.9; }
        .loading { text-align: center; padding: 50px; }
        .loading-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
<div class="container">
    <h1>🏥 Google Places Safety-Aware Route Planner</h1>
    <p>Find the safest routes using real-time Google Places data for hospitals, police stations, and crowded areas.</p>

    <div class="input-group">
        <label><strong>Current Location:</strong></label><br>
        <input type="text" id="source" placeholder="Enter your current location or use GPS">
        <button onclick="useCurrentLocation()" class="secondary-btn">📍 Use Current Location</button>
    </div>

    <div class="input-group">
        <label><strong>Destination:</strong></label><br>
        <input type="text" id="dest" placeholder="Enter your destination address">
    </div>

    <button onclick="findSafeRoutes()" class="primary-btn">🔍 Analyze Routes with Google Places</button>

    <div class="legend">
        <h3>🏥 Real-Time Safety Analysis</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">🏥</div>
                <div class="stat-label">Hospitals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🚔</div>
                <div class="stat-label">Police Stations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🚒</div>
                <div class="stat-label">Fire Stations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🏫</div>
                <div class="stat-label">Schools</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🏦</div>
                <div class="stat-label">Banks & ATMs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🛒</div>
                <div class="stat-label">Shopping Areas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🚌</div>
                <div class="stat-label">Transport Hubs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">🌳</div>
                <div class="stat-label">Public Spaces</div>
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
    document.getElementById("map").innerHTML = `
        <div class="loading">
            <h3>🏥 Analyzing Routes with Google Places API...</h3>
            <div class="loading-spinner"></div>
            <p>Finding hospitals, police stations, and safety facilities along each route...</p>
            <p>This may take 10-15 seconds...</p>
        </div>
    `;
    document.getElementById("safety-results").innerHTML = `
        <div class="loading">
            <h4>🔍 Real-time Safety Analysis in Progress...</h4>
            <p>Fetching data from Google Places API...</p>
        </div>
    `;
    
    // Get routes and safety analysis
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
    let html = '<div class="safety-results"><h2>🏥 Real-Time Safety Analysis Results</h2>';
    
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
            
            const badge = index === 0 ? '<div style="background: #4CAF50; color: white; padding: 8px 15px; border-radius: 25px; font-size: 14px; font-weight: bold; margin-bottom: 15px; display: inline-block;">🥇 SAFEST ROUTE</div>' : '';
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
            
            html += `
                <div class="${cardClass}">
                    ${badge}
                    <h3>${rank} Route ${route.route_number}</h3>
                    
                    <div class="safety-score ${scoreClass}">${route.safety_score.toFixed(1)}/100</div>
                    
                    <div style="margin: 15px 0;">
                        <strong>📏 Distance:</strong> ${route.distance.toFixed(1)} km<br>
                        <strong>⏱️ Duration:</strong> ${route.duration.toFixed(0)} minutes<br>
                        <strong>🏥 Safety Facilities:</strong> ${route.total_facilities} found
                    </div>
                    
                    <div class="facility-list">
                        <div class="facility-item">🏥 Hospitals: ${route.hospital_count}</div>
                        <div class="facility-item">🚔 Police: ${route.police_count}</div>
                        <div class="facility-item">🚒 Fire Stations: ${route.fire_count}</div>
                        <div class="facility-item">🏫 Schools: ${route.school_count}</div>
                        <div class="facility-item">🏦 Banks: ${route.bank_count}</div>
                        <div class="facility-item">🛒 Shopping: ${route.shopping_count}</div>
                        <div class="facility-item">🚌 Transport: ${route.transport_count}</div>
                        <div class="facility-item">🌳 Public: ${route.public_count}</div>
                    </div>
                    
                    <div class="reasoning">
                        <strong>🔍 Safety Analysis:</strong><br>
                        ${route.reasoning}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Overall recommendation
        const bestRoute = sortedRoutes[0];
        const safetyDiff = bestRoute.safety_score - sortedRoutes[1].safety_score;
        
        html += `<div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 25px; border-radius: 10px; margin-top: 20px;">
                    <h3>💡 Safety Recommendation</h3>
                    <p><strong>Route ${bestRoute.route_number}</strong> is the safest option with a score of ${bestRoute.safety_score.toFixed(1)}/100. 
                    ${safetyDiff > 10 ? `This route is significantly safer (+${safetyDiff.toFixed(1)} points) than alternatives.` : 'This route provides the best balance of safety and efficiency.'}</p>
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

def search_google_places(lat, lon, place_type, radius=1000):
    """Search Google Places API for specific place types"""
    try:
        # Map our place types to Google Places types
        google_types = {
            'hospital': 'hospital',
            'police': 'police',
            'fire_station': 'fire_station',
            'school': 'school',
            'university': 'university',
            'bank': 'bank',
            'shopping_mall': 'shopping_mall',
            'restaurant': 'restaurant',
            'bus_station': 'bus_station',
            'train_station': 'train_station',
            'gas_station': 'gas_station',
            'pharmacy': 'pharmacy',
            'atm': 'atm',
            'convenience_store': 'convenience_store',
            'park': 'park',
            'library': 'library',
            'government_office': 'local_government_office'
        }
        
        if place_type not in google_types:
            return []
        
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f"{lat},{lon}",
            'radius': radius,
            'type': google_types[place_type],
            'key': GOOGLE_PLACES_API_KEY
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data['status'] == 'OK':
            return data['results']
        else:
            print(f"Google Places API error for {place_type}: {data.get('status', 'Unknown error')}")
            return []
            
    except Exception as e:
        print(f"Error searching Google Places for {place_type}: {e}")
        return []

def analyze_route_safety(route_coordinates, route_name):
    """Analyze route safety using Google Places API"""
    print(f"Analyzing safety for {route_name} with {len(route_coordinates)} points")
    
    # Sample points along the route (every 500m approximately)
    sample_points = []
    for i in range(0, len(route_coordinates), max(1, len(route_coordinates) // 20)):
        sample_points.append(route_coordinates[i])
    
    # Count facilities along the route
    facility_counts = {}
    all_places = {}
    
    for point in sample_points:
        lat, lon = point
        
        # Search for different types of places
        place_types = ['hospital', 'police', 'fire_station', 'school', 'university', 'bank', 
                      'shopping_mall', 'restaurant', 'bus_station', 'train_station', 
                      'gas_station', 'pharmacy', 'atm', 'convenience_store', 'park', 
                      'library', 'government_office']
        
        for place_type in place_types:
            places = search_google_places(lat, lon, place_type, radius=500)  # 500m radius
            
            if place_type not in facility_counts:
                facility_counts[place_type] = 0
                all_places[place_type] = []
            
            # Count unique places (avoid duplicates)
            for place in places:
                place_id = place.get('place_id')
                if place_id and place_id not in [p.get('place_id') for p in all_places[place_type]]:
                    facility_counts[place_type] += 1
                    all_places[place_type].append(place)
    
    # Calculate safety score
    total_score = 0
    for place_type, count in facility_counts.items():
        weight = SAFETY_WEIGHTS.get(place_type, 1)
        total_score += count * weight
    
    # Normalize to 0-100 scale
    safety_score = min(100, total_score / 2)  # Adjust divisor based on testing
    
    # Generate reasoning
    reasoning_parts = []
    
    if facility_counts.get('hospital', 0) > 0:
        reasoning_parts.append(f"passes by {facility_counts['hospital']} hospital(s)")
    if facility_counts.get('police', 0) > 0:
        reasoning_parts.append(f"near {facility_counts['police']} police station(s)")
    if facility_counts.get('fire_station', 0) > 0:
        reasoning_parts.append(f"close to {facility_counts['fire_station']} fire station(s)")
    if facility_counts.get('school', 0) + facility_counts.get('university', 0) > 0:
        total_education = facility_counts.get('school', 0) + facility_counts.get('university', 0)
        reasoning_parts.append(f"goes by {total_education} educational institution(s)")
    if facility_counts.get('shopping_mall', 0) > 0:
        reasoning_parts.append(f"near {facility_counts['shopping_mall']} shopping area(s)")
    if facility_counts.get('park', 0) > 0:
        reasoning_parts.append(f"passes by {facility_counts['park']} public park(s)")
    
    # Add crowd density assessment
    crowded_places = facility_counts.get('shopping_mall', 0) + facility_counts.get('restaurant', 0) + facility_counts.get('bus_station', 0)
    if crowded_places > 3:
        reasoning_parts.append("high pedestrian traffic areas")
    elif crowded_places > 1:
        reasoning_parts.append("moderate pedestrian traffic")
    else:
        reasoning_parts.append("limited pedestrian traffic")
    
    reasoning = ", ".join(reasoning_parts) if reasoning_parts else "standard urban route with basic facilities"
    
    return {
        'safety_score': safety_score,
        'facility_counts': facility_counts,
        'reasoning': reasoning,
        'all_places': all_places,
        'sample_points': len(sample_points)
    }

def get_three_routes(origin, destination):
    """Get three alternative routes"""
    routes = []
    
    print(f"Generating routes from {origin} to {destination}")
    
    # Create different routes using waypoints
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

def build_google_places_map(routes, origin, destination, route_safety_data):
    """Build map with Google Places data"""
    print(f"Building Google Places map with {len(routes)} routes")
    
    # Calculate center
    all_lats, all_lngs = [], []
    for r in routes:
        for lon, lat in r['features'][0]['geometry']['coordinates']:
            all_lats.append(lat)
            all_lngs.append(lon)
    
    center = [mean(all_lats), mean(all_lngs)]
    fmap = folium.Map(location=center, zoom_start=13)
    
    # Add routes with safety information
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
        <b>Safety Analysis:</b><br>
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
        
        # Add safety facility markers along the route
        for place_type, places in safety_info['all_places'].items():
            for place in places[:5]:  # Limit to first 5 places per type to avoid clutter
                if 'geometry' in place and 'location' in place['geometry']:
                    lat = place['geometry']['location']['lat']
                    lon = place['geometry']['location']['lng']
                    name = place.get('name', place_type.replace('_', ' ').title())
                    
                    # Different icons for different place types
                    icon_map = {
                        'hospital': ('🏥', 'red'),
                        'police': ('🚔', 'blue'),
                        'fire_station': ('🚒', 'orange'),
                        'school': ('🏫', 'green'),
                        'university': ('🎓', 'green'),
                        'bank': ('🏦', 'darkblue'),
                        'shopping_mall': ('🛒', 'purple'),
                        'restaurant': ('🍽️', 'darkred'),
                        'bus_station': ('🚌', 'darkgreen'),
                        'train_station': ('🚉', 'darkgreen'),
                        'park': ('🌳', 'green'),
                        'library': ('📚', 'darkblue')
                    }
                    
                    icon_text, icon_color = icon_map.get(place_type, ('📍', 'gray'))
                    
                    folium.Marker(
                        [lat, lon],
                        popup=f"<b>{icon_text} {name}</b><br>Type: {place_type.replace('_', ' ').title()}<br>Route {i+1}",
                        icon=folium.Icon(color=icon_color, icon='info-sign')
                    ).add_to(fmap)
    
    # Add origin and destination markers
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
                bottom: 50px; left: 50px; width: 400px; height: auto; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; border: 2px solid #333; z-index:9999; 
                font-size:14px; padding: 20px; border-radius: 10px;">
    <h4 style="margin: 0 0 15px 0;">🏥 Google Places Safety Map</h4>
    <h4 style="margin: 15px 0 10px 0;">🛣️ Routes</h4>
    '''
    
    for i, r in enumerate(routes):
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        color = COLORS[i]
        safety_info = route_safety_data[i]
        legend_html += f'<p><span style="color:{color}; font-weight:bold; font-size:16px;">●</span> Route {i+1}: Safety {safety_info["safety_score"]:.1f}/100</p>'
    
    legend_html += '''
    <h4 style="margin: 15px 0 10px 0;">🏥 Safety Facilities</h4>
    <p>🏥 Hospitals | 🚔 Police | 🚒 Fire Stations | 🏫 Schools | 🏦 Banks | 🛒 Shopping</p>
    '''
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
        print(f"Google Places route from {origin} to {destination}")
        
        routes = get_three_routes(origin, destination)
        if not routes:
            return "<div style='text-align: center; padding: 50px; color: orange;'><h3>No Routes Found</h3></div>"
        
        # Analyze route safety using Google Places
        route_safety_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = analyze_route_safety(route_coords, f"Route {i+1}")
            route_safety_data.append(safety_data)
            print(f"Route {i+1} safety score: {safety_data['safety_score']:.1f}/100")
        
        return build_google_places_map(routes, origin, destination, route_safety_data)
        
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
        
        routes = get_three_routes(origin, destination)
        if not routes:
            return {"error": "No routes found"}
        
        # Analyze route safety using Google Places
        route_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = analyze_route_safety(route_coords, f"Route {i+1}")
            
            route_info = {
                'route_number': i + 1,
                'distance': route['features'][0]['properties']['summary']['distance'] / 1000,
                'duration': route['features'][0]['properties']['summary']['duration'] / 60,
                'safety_score': safety_data['safety_score'],
                'hospital_count': safety_data['facility_counts'].get('hospital', 0),
                'police_count': safety_data['facility_counts'].get('police', 0),
                'fire_count': safety_data['facility_counts'].get('fire_station', 0),
                'school_count': safety_data['facility_counts'].get('school', 0) + safety_data['facility_counts'].get('university', 0),
                'bank_count': safety_data['facility_counts'].get('bank', 0) + safety_data['facility_counts'].get('atm', 0),
                'shopping_count': safety_data['facility_counts'].get('shopping_mall', 0),
                'transport_count': safety_data['facility_counts'].get('bus_station', 0) + safety_data['facility_counts'].get('train_station', 0),
                'public_count': safety_data['facility_counts'].get('park', 0) + safety_data['facility_counts'].get('library', 0),
                'total_facilities': sum(safety_data['facility_counts'].values()),
                'reasoning': safety_data['reasoning']
            }
            route_data.append(route_info)
        
        return {"routes": route_data}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("🏥 Google Places Safety-Aware Route Planner starting...")
    print("Open http://127.0.0.1:5003 in your browser")
    app.run(debug=True, port=5003)

