import folium
import openrouteservice
from statistics import mean
import math
import random
import json
from flask import Flask, request, render_template_string
import webbrowser
import requests

# Your ORS API Key
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ1NDZhMWI3ODFkYzRlYzFiZDFjODUwMzU5ZmI2ZjdjIiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

app = Flask(__name__)

COLORS = ["red", "blue", "green"]
print(f"Available colors: {COLORS}")

# Safety scoring weights for different facility types
SAFETY_WEIGHTS = {
    'police_station': 10,
    'hospital': 8,
    'school': 6,
    'college': 5,
    'bank': 4,
    'fire_station': 9,
    'government_office': 3,
    'shopping_mall': 2,
    'restaurant': 1,
    'bus_stop': 2,
    'metro_station': 3
}

# OSM amenity/feature weights for Overpass-based analysis
OSM_FEATURE_WEIGHTS = {
    'hospital': 15,
    'police': 12,
    'fire_station': 10,
    'school': 8,
    'college': 7,
    'university': 7,
    'bank': 5,
    'atm': 3,
    'pharmacy': 4,
    'library': 4,
    'bus_station': 3,
    'train_station': 4,
    'place_of_worship': 1,
}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>🛡️ Advanced Safety Route Finder</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            max-width: 1400px; margin: 0 auto; padding: 20px; 
        }
        .header {
            background: rgba(255,255,255,0.95); 
            padding: 20px; border-radius: 15px; margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .input-section {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;
        }
        .input-group { 
            background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .input-group label { 
            display: block; font-weight: bold; margin-bottom: 10px; color: #333; 
        }
        input[type="text"] { 
            width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; 
            font-size: 16px; margin-bottom: 10px;
        }
        .transport-modes {
            display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap;
        }
        .mode-btn {
            padding: 10px 20px; border: 2px solid #ddd; background: white; 
            border-radius: 25px; cursor: pointer; transition: all 0.3s;
            font-weight: bold;
        }
        .mode-btn.active {
            background: #4CAF50; color: white; border-color: #4CAF50;
        }
        button { 
            padding: 12px 25px; margin: 5px; cursor: pointer; border: none; 
            border-radius: 25px; font-size: 16px; font-weight: bold;
            transition: all 0.3s;
        }
        .primary-btn { 
            background: linear-gradient(45deg, #4CAF50, #45a049); 
            color: white; box-shadow: 0 4px 15px rgba(76,175,80,0.3);
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(76,175,80,0.4); }
        .secondary-btn { 
            background: linear-gradient(45deg, #2196F3, #1976D2); 
            color: white; box-shadow: 0 4px 15px rgba(33,150,243,0.3);
        }
        .nav-btn {
            background: linear-gradient(45deg, #FF9800, #F57C00);
            color: white; box-shadow: 0 4px 15px rgba(255,152,0,0.3);
        }
        .safety-results { 
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 15px; 
            margin: 20px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .route-card { 
            display: inline-block; margin: 15px; padding: 20px; 
            border: 3px solid #ddd; border-radius: 15px; min-width: 300px; 
            vertical-align: top; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        .route-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .route-card.best { 
            border-color: #4CAF50; background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e8 100%);
        }
        .route-card.good { 
            border-color: #2196F3; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        }
        .route-card.medium { 
            border-color: #FF9800; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        }
        .safety-score { 
            font-size: 28px; font-weight: bold; margin: 10px 0; 
        }
        .score-excellent { color: #4CAF50; }
        .score-good { color: #2196F3; }
        .score-medium { color: #FF9800; }
        .score-low { color: #f44336; }
        .facility-list { 
            margin: 15px 0; display: flex; flex-wrap: wrap; gap: 8px; 
        }
        .facility-item { 
            padding: 8px 12px; background: #e0e0e0; border-radius: 20px; 
            font-size: 13px; font-weight: bold; 
        }
        .route-controls {
            background: rgba(255,255,255,0.95); padding: 15px; border-radius: 10px;
            margin: 15px 0; display: flex; gap: 10px; flex-wrap: wrap;
        }
        .toggle-btn {
            padding: 8px 16px; border: 2px solid #ddd; background: white;
            border-radius: 20px; cursor: pointer; transition: all 0.3s;
            font-weight: bold;
        }
        .toggle-btn.active {
            background: #4CAF50; color: white; border-color: #4CAF50;
            box-shadow: 0 2px 8px rgba(76,175,80,0.3);
        }
        .toggle-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .map-container { 
            background: white; border-radius: 15px; overflow: hidden; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        #map { 
            width: 100%; height: 600px; 
        }
        .loading {
            text-align: center; padding: 50px; background: white; border-radius: 15px;
        }
        .loading-spinner {
            border: 4px solid #f3f3f3; border-top: 4px solid #3498db;
            border-radius: 50%; width: 40px; height: 40px;
            animation: spin 2s linear infinite; margin: 20px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .navigation-panel {
            position: fixed; top: 20px; right: 20px; width: 300px;
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1); z-index: 1000;
            display: none;
        }
        .nav-instruction {
            padding: 10px; margin: 5px 0; background: #f0f0f0;
            border-radius: 8px; border-left: 4px solid #4CAF50;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🛡️ Advanced Safety Route Finder</h1>
        <p>Find the safest routes with real-time safety analysis, multiple transport modes, and navigation guidance.</p>
    </div>

    <div class="input-section">
        <div class="input-group">
            <label>📍 Current Location:</label>
            <input type="text" id="source" placeholder="Enter your location or use GPS">
            <button onclick="useCurrentLocation()" class="secondary-btn">📍 Use GPS</button>
        </div>

        <div class="input-group">
            <label>🎯 Destination:</label>
            <input type="text" id="dest" placeholder="Enter your destination">
        </div>
    </div>

    <div class="transport-modes">
        <label><strong>🚗 Transport Mode:</strong></label>
        <button class="mode-btn active" onclick="setTransportMode('driving')" id="mode-driving">🚗 Driving</button>
        <button class="mode-btn" onclick="setTransportMode('walking')" id="mode-walking">🚶 Walking</button>
        <button class="mode-btn" onclick="setTransportMode('cycling')" id="mode-cycling">🚴 Cycling</button>
    </div>

    <div style="text-align: center; margin: 20px 0;">
        <button onclick="findSafeRoutes()" class="primary-btn">🔍 Find Safest Routes</button>
        <button onclick="startNavigation()" class="nav-btn" id="nav-btn" style="display: none;">🧭 Start Navigation</button>
    </div>

    <div class="route-controls" id="route-controls" style="display: none;">
        <label><strong>🛣️ Route Controls:</strong></label>
        <button class="toggle-btn active" onclick="toggleRoute(1)">Route 1</button>
        <button class="toggle-btn active" onclick="toggleRoute(2)">Route 2</button>
        <button class="toggle-btn active" onclick="toggleRoute(3)">Route 3</button>
        <button class="toggle-btn" onclick="showAllRoutes()">Show All</button>
        <button class="toggle-btn" onclick="hideAllRoutes()">Hide All</button>
    </div>

    <div id="safety-results"></div>

    <div class="map-container">
        <div id="map"></div>
    </div>
</div>

<div class="navigation-panel" id="navigation-panel">
    <h3>🧭 Navigation</h3>
    <div id="nav-instructions"></div>
    <button onclick="stopNavigation()" class="secondary-btn">Stop Navigation</button>
</div>

<script>
let currentTransportMode = 'driving';
let currentRoutes = [];
let navigationActive = false;
let watchId = null;

function setTransportMode(mode) {
    currentTransportMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('mode-' + mode).classList.add('active');
}

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
            <h3>🛡️ Analyzing Routes for Safety...</h3>
            <div class="loading-spinner"></div>
            <p>Finding safest routes with real-time safety analysis...</p>
            <p>This may take 10-15 seconds...</p>
        </div>
    `;
    document.getElementById("safety-results").innerHTML = `
        <div class="loading">
            <h4>🔍 Real-time Safety Analysis in Progress...</h4>
            <p>Fetching data from OpenStreetMap...</p>
        </div>
    `;
    
    // Get routes and safety analysis
    fetch(`/route?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}&mode=${currentTransportMode}`)
        .then(response => response.text())
        .then(html => { 
            document.getElementById("map").innerHTML = html; 
            document.getElementById("route-controls").style.display = "block";
            document.getElementById("nav-btn").style.display = "inline-block";
        })
        .catch(error => {
            document.getElementById("map").innerHTML = "<div style='text-align: center; padding: 50px; color: red;'><h3>❌ Error Loading Routes</h3><p>Please check your input and try again</p></div>";
        });
    
    // Get safety analysis
    fetch(`/safety_analysis?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(dest)}&mode=${currentTransportMode}`)
        .then(response => response.json())
        .then(data => {
            currentRoutes = data.routes || [];
            displaySafetyResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById("safety-results").innerHTML = "<div style='color: red;'>❌ Error calculating safety scores</div>";
        });
}

function displaySafetyResults(data) {
    let html = '<div class="safety-results"><h2>🛡️ Route Safety Comparison & Ranking</h2>';
    
    if (data.routes) {
        // Routes are already sorted by safety score from backend
        const sortedRoutes = data.routes;
        
        html += '<div style="display: flex; flex-wrap: wrap; justify-content: center;">';
        
        sortedRoutes.forEach((route, index) => {
            let cardClass = 'route-card';
            let scoreClass = 'score-medium';
            
            if (route.safety_score >= 7) {
                cardClass += ' best';
                scoreClass = 'score-excellent';
            } else if (route.safety_score >= 5) {
                cardClass += ' good';
                scoreClass = 'score-good';
            } else if (route.safety_score >= 3) {
                scoreClass = 'score-medium';
            } else {
                scoreClass = 'score-low';
            }
            
            const rankBadge = route.rank === 1 ? '🥇 SAFEST' : route.rank === 2 ? '🥈 GOOD' : '🥉 MODERATE';
            const rankIcon = route.rank === 1 ? '🥇' : route.rank === 2 ? '🥈' : '🥉';
            
            html += `
                <div class="${cardClass}">
                    <div style="background: ${route.rank === 1 ? '#4CAF50' : route.rank === 2 ? '#2196F3' : '#FF9800'}; color: white; padding: 8px 15px; border-radius: 25px; font-size: 14px; font-weight: bold; margin-bottom: 15px; display: inline-block;">${rankBadge}</div>
                    <h3>${rankIcon} Route ${route.route_number} (Rank #${route.rank})</h3>
                    
                    <div class="safety-score ${scoreClass}">${route.safety_score.toFixed(1)}/10</div>
                    
                    <div style="margin: 15px 0;">
                        <strong>📏 Distance:</strong> ${route.distance.toFixed(1)} km<br>
                        <strong>⏱️ Duration:</strong> ${route.duration.toFixed(0)} minutes<br>
                        <strong>🛡️ Safety Facilities:</strong> ${route.total_facilities} found
                    </div>
                    
                    <div class="facility-list">
                        <div class="facility-item">🚔 Police: ${route.police_count}</div>
                        <div class="facility-item">🏥 Hospitals: ${route.hospital_count}</div>
                        <div class="facility-item">🏫 Schools: ${route.school_count}</div>
                        <div class="facility-item">🏦 Banks: ${route.bank_count}</div>
                        <div class="facility-item">🚒 Fire: ${route.fire_count}</div>
                        <div class="facility-item">🚌 Transit: ${route.transit_count}</div>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #4CAF50;">
                        <strong>🔍 Safety Analysis:</strong><br>
                        ${route.reasoning}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Safety comparison table
        html += `<div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h3>📊 Safety Comparison Table</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px; border: 1px solid #ddd;">Route</th>
                                <th style="padding: 12px; border: 1px solid #ddd;">Rank</th>
                                <th style="padding: 12px; border: 1px solid #ddd;">Safety Score</th>
                                <th style="padding: 12px; border: 1px solid #ddd;">Distance</th>
                                <th style="padding: 12px; border: 1px solid #ddd;">Duration</th>
                                <th style="padding: 12px; border: 1px solid #ddd;">Facilities</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        sortedRoutes.forEach((route, index) => {
            const rowColor = route.rank === 1 ? '#e8f5e8' : route.rank === 2 ? '#e3f2fd' : '#fff3e0';
            html += `
                <tr style="background: ${rowColor};">
                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Route ${route.route_number}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">#${route.rank}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${route.safety_score >= 7 ? '#4CAF50' : route.safety_score >= 5 ? '#2196F3' : '#FF9800'};">${route.safety_score.toFixed(1)}/10</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${route.distance.toFixed(1)} km</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${route.duration.toFixed(0)} min</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${route.total_facilities}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        
        // Overall recommendation
        const bestRoute = sortedRoutes[0];
        const secondRoute = sortedRoutes[1];
        const safetyDiff = bestRoute.safety_score - secondRoute.safety_score;
        
        html += `<div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 25px; border-radius: 10px; margin-top: 20px;">
                    <h3>💡 Safety Recommendation</h3>
                    <p><strong>Route ${bestRoute.route_number}</strong> is ranked #1 as the safest option with a score of ${bestRoute.safety_score.toFixed(1)}/10. 
                    ${safetyDiff > 1 ? `This route is significantly safer (+${safetyDiff.toFixed(1)} points) than the second-best option.` : 'This route provides the best balance of safety and efficiency.'}</p>
                    <p><strong>Key Safety Features:</strong> ${bestRoute.reasoning}</p>
                    <p><strong>Safety Ranking:</strong> #1 Safest → #2 Good → #3 Moderate</p>
                 </div>`;
    }
    
    html += '</div>';
    document.getElementById("safety-results").innerHTML = html;
}

// Route toggle functionality will be handled by the map's JavaScript

function startNavigation() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported by this browser.");
        return;
    }
    
    navigationActive = true;
    document.getElementById("navigation-panel").style.display = "block";
    document.getElementById("nav-btn").style.display = "none";
    
    // Start watching position
    watchId = navigator.geolocation.watchPosition(
        function(position) {
            updateNavigation(position);
        },
        function(error) {
            console.error("Navigation error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function updateNavigation(position) {
    // Update navigation instructions based on current position
    const instructions = document.getElementById("nav-instructions");
    instructions.innerHTML = `
        <div class="nav-instruction">
            <strong>📍 Current Position:</strong><br>
            Lat: ${position.coords.latitude.toFixed(6)}<br>
            Lng: ${position.coords.longitude.toFixed(6)}<br>
            Accuracy: ${position.coords.accuracy}m
        </div>
        <div class="nav-instruction">
            <strong>🧭 Navigation Active</strong><br>
            Following the safest route...
        </div>
    `;
}

function stopNavigation() {
    navigationActive = false;
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    document.getElementById("navigation-panel").style.display = "none";
    document.getElementById("nav-btn").style.display = "inline-block";
}
</script>
</body>
</html>
"""

def generate_hexagonal_grid(center_lat, center_lon, radius_km=10, hex_size_km=1):
    """Generate hexagonal grid around center point"""
    hexagons = []
    
    print(f"Generating hex grid at {center_lat}, {center_lon} with radius {radius_km}km")
    
    # Convert km to degrees (approximate)
    lat_degree_per_km = 1/111
    lon_degree_per_km = 1/(111 * math.cos(math.radians(center_lat)))
    
    # Calculate grid bounds
    radius_lat = radius_km * lat_degree_per_km
    radius_lon = radius_km * lon_degree_per_km
    
    # Hexagon size in degrees
    hex_lat = hex_size_km * lat_degree_per_km
    hex_lon = hex_size_km * lon_degree_per_km
    
    print(f"Hex size in degrees: lat={hex_lat:.6f}, lon={hex_lon:.6f}")
    print(f"Radius in degrees: lat={radius_lat:.6f}, lon={radius_lon:.6f}")
    
    # Generate hexagons in a grid pattern
    rows = max(1, int(2 * radius_lat / hex_lat) + 1)
    cols = max(1, int(2 * radius_lon / hex_lon) + 1)
    
    print(f"Generating {rows} rows x {cols} cols = {rows*cols} potential hexagons")
    
    for row in range(rows):
        for col in range(cols):
            # Calculate hexagon center
            hex_lat_center = center_lat - radius_lat + row * hex_lat
            hex_lon_center = center_lon - radius_lon + col * hex_lon
            
            # Check if hexagon is within radius
            distance = math.sqrt((hex_lat_center - center_lat)**2 + (hex_lon_center - center_lon)**2)
            if distance <= radius_lat:
                # Create hexagon vertices
                hexagon = create_hexagon(hex_lat_center, hex_lon_center, hex_lat, hex_lon)
                hexagons.append({
                    'center': [hex_lat_center, hex_lon_center],
                    'vertices': hexagon,
                    'safety_score': 0,
                    'facilities': {}
                })
    
    print(f"Generated {len(hexagons)} hexagons")
    return hexagons

def create_hexagon(lat, lon, hex_lat, hex_lon):
    """Create hexagon vertices"""
    vertices = []
    for i in range(6):
        angle = math.pi / 3 * i
        # Use hex_lat for both x and y to make proper hexagons
        x = hex_lat * math.cos(angle)
        y = hex_lat * math.sin(angle)
        vertices.append([lat + y, lon + x])
    return vertices

def calculate_safety_score(hexagons):
    """Calculate safety scores for each hexagon based on simulated public facilities"""
    print(f"Calculating safety scores for {len(hexagons)} hexagons")
    
    for i, hexagon in enumerate(hexagons):
        lat, lon = hexagon['center']
        
        # Simulate facility distribution based on location
        facilities = {
            'police_station': 0,
            'hospital': 0,
            'school': 0,
            'college': 0,
            'bank': 0,
            'fire_station': 0,
            'government_office': 0,
            'shopping_mall': 0,
            'restaurant': 0,
            'bus_stop': 0,
            'metro_station': 0
        }
        
        # Simulate facilities based on urban/rural characteristics
        # Urban areas (near cities) have more facilities
        urban_factor = 1.0
        if abs(lat - 22.7) < 0.1 and abs(lon - 72.87) < 0.1:  # Near Nadiad
            urban_factor = 2.0
            print(f"Hexagon {i} near Nadiad - urban factor: {urban_factor}")
        elif abs(lat - 22.56) < 0.1 and abs(lon - 72.93) < 0.1:  # Near Anand
            urban_factor = 2.0
            print(f"Hexagon {i} near Anand - urban factor: {urban_factor}")
        
        # Randomly assign facilities with higher probability in urban areas
        for facility_type in facilities:
            if random.random() < 0.15 * urban_factor:  # 15% base chance, doubled in urban areas
                facilities[facility_type] = random.randint(1, 3)
        
        # Calculate safety score
        total_score = 0
        for facility_type, count in facilities.items():
            total_score += count * SAFETY_WEIGHTS.get(facility_type, 1)
        
        # Normalize to 0-10 scale
        hexagon['facilities'] = facilities
        hexagon['safety_score'] = min(10, total_score / 15)  # Scale to 0-10
        
        if i < 5:  # Print first 5 hexagons for debugging
            print(f"Hexagon {i}: lat={lat:.4f}, lon={lon:.4f}, safety={hexagon['safety_score']:.1f}, facilities={sum(facilities.values())}")
    
    return hexagons

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

def evaluate_route_safety(route_coordinates, hexagons):
    """Evaluate safety of a route based on hexagons it passes through"""
    total_safety = 0
    hexagon_count = 0
    facility_counts = {}
    
    # Sample points along the route
    for i in range(0, len(route_coordinates), max(1, len(route_coordinates) // 20)):
        point = route_coordinates[i]
        
        # Find which hexagon this point belongs to
        for hexagon in hexagons:
            if point_in_polygon(point, hexagon['vertices']):
                total_safety += hexagon['safety_score']
                hexagon_count += 1
                
                # Count facilities
                for facility_type, count in hexagon['facilities'].items():
                    facility_counts[facility_type] = facility_counts.get(facility_type, 0) + count
                break
    
    # Calculate average safety score
    avg_safety = total_safety / max(1, hexagon_count)
    
    return {
        'safety_score': avg_safety,
        'hexagons_traversed': hexagon_count,
        'facility_counts': facility_counts
    }

def analyze_route_safety_osm(route_coordinates, transport_mode='driving', buffer_m=400, max_samples=25):
    """Analyze route safety by querying OSM Overpass for amenities near the route.

    Returns a dict with safety_score (0-10), facility_counts, and reasoning text.
    """
    # Adjust buffer and sampling based on transport mode
    if transport_mode == 'walking':
        buffer_m = 200  # Smaller buffer for walking
        max_samples = 15
    elif transport_mode == 'cycling':
        buffer_m = 300
        max_samples = 20
    
    # Sample points along route
    sampled_points = []
    step = max(1, len(route_coordinates) // max_samples)
    for i in range(0, len(route_coordinates), step):
        sampled_points.append(route_coordinates[i])

    # Build Overpass QL for each point (batching by concatenating queries)
    amenity_types = [
        'hospital','police','fire_station','school','college','university','bank','atm',
        'pharmacy','library','bus_station','train_station','place_of_worship'
    ]

    queries = []
    for lat, lon in sampled_points:
        q_parts = [
            f'nwr(around:{buffer_m},{lat},{lon})[amenity~"^(hospital|police|fire_station|school|college|university|bank|atm|pharmacy|library|place_of_worship)$"];',
            f'nwr(around:{buffer_m},{lat},{lon})[public_transport="station"];',
            f'nwr(around:{buffer_m},{lat},{lon})[railway="station"];',
            f'nwr(around:{buffer_m},{lat},{lon})[highway="bus_stop"];',
            f'nwr(around:{buffer_m},{lat},{lon})[leisure="park"];',
            f'nwr(around:{buffer_m},{lat},{lon})[tourism="hotel"];'
        ]
        queries.extend(q_parts)

    overpass_body = f"[out:json][timeout:30];(\n" + "\n".join(queries) + "\n);out center;"

    facility_counts = {}
    seen_ids = set()
    try:
        resp = requests.post("https://overpass-api.de/api/interpreter", data=overpass_body, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            elements = data.get('elements', [])
            for el in elements:
                el_id = f"{el.get('type','n')}/{el.get('id','')}"
                if el_id in seen_ids:
                    continue
                seen_ids.add(el_id)
                tags = el.get('tags', {})

                amenity = tags.get('amenity')
                if amenity in amenity_types:
                    facility_counts[amenity] = facility_counts.get(amenity, 0) + 1
                    continue

                # Transport-related features
                if tags.get('railway') == 'station':
                    facility_counts['train_station'] = facility_counts.get('train_station', 0) + 1
                    continue
                if tags.get('highway') == 'bus_stop' or tags.get('public_transport') in ['stop_position','platform','station']:
                    facility_counts['bus_station'] = facility_counts.get('bus_station', 0) + 1
                if tags.get('leisure') == 'park':
                    facility_counts['park'] = facility_counts.get('park', 0) + 1
                if tags.get('tourism') == 'hotel':
                    facility_counts['hotel'] = facility_counts.get('hotel', 0) + 1
        else:
            print(f"Overpass API error: {resp.status_code}")
    except Exception as e:
        print(f"Overpass error: {e}")

    # Calculate safety score based on public places and safety facilities
    safety_facilities = {
        'police': 10,
        'hospital': 8,
        'fire_station': 7,
        'school': 5,
        'college': 5,
        'university': 5,
        'bank': 3,
        'atm': 2,
        'pharmacy': 4,
        'library': 3,
        'bus_station': 3,
        'train_station': 4,
        'place_of_worship': 2,
        'park': 2,
        'hotel': 1
    }
    
    # Calculate weighted safety score
    total_safety_points = 0
    for facility, count in facility_counts.items():
        weight = safety_facilities.get(facility, 1)
        total_safety_points += count * weight
    
    # Normalize score to 0-10 scale based on route length and facilities
    route_length_km = len(route_coordinates) * 0.1  # Rough estimate
    if route_length_km > 0:
        safety_score = min(10.0, (total_safety_points / route_length_km) * 2)
    else:
        safety_score = 0.0
    
    # Ensure minimum score if no facilities found
    if safety_score == 0 and len(facility_counts) == 0:
        safety_score = 1.0  # Base score for routes with no facilities

    # Transport-specific reasoning
    reasoning_parts = []
    if facility_counts.get('police', 0) > 0:
        reasoning_parts.append(f"near {facility_counts['police']} police station(s)")
    if facility_counts.get('hospital', 0) > 0:
        reasoning_parts.append(f"passes {facility_counts['hospital']} hospital(s)")
    edu = facility_counts.get('school', 0) + facility_counts.get('college', 0) + facility_counts.get('university', 0)
    if edu > 0:
        reasoning_parts.append(f"by {edu} educational institution(s)")
    transit = facility_counts.get('bus_station', 0) + facility_counts.get('train_station', 0)
    if transit > 0:
        reasoning_parts.append(f"access to {transit} transit stop(s)")
    if facility_counts.get('pharmacy', 0) > 0:
        reasoning_parts.append(f"{facility_counts['pharmacy']} pharmacy(ies)")
    if facility_counts.get('bank', 0) + facility_counts.get('atm', 0) > 0:
        reasoning_parts.append("financial services nearby")
    if facility_counts.get('park', 0) > 0:
        reasoning_parts.append(f"{facility_counts['park']} public park(s)")

    # Add transport mode specific notes
    if transport_mode == 'walking':
        reasoning_parts.append("pedestrian-friendly route")
    elif transport_mode == 'cycling':
        reasoning_parts.append("cycling-accessible path")

    reasoning = ", ".join(reasoning_parts) if reasoning_parts else f"standard {transport_mode} route"

    return {
        'safety_score': safety_score,
        'facility_counts': facility_counts,
        'hexagons_traversed': 0,
        'reasoning': reasoning
    }

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

def get_three_routes(origin, destination, transport_mode='driving'):
    """Get three alternative routes using waypoint-based approach"""
    routes = []
    
    # Map transport modes to ORS profiles
    profile_map = {
        'driving': 'driving-car',
        'walking': 'foot-walking', 
        'cycling': 'cycling-regular'
    }
    
    profile = profile_map.get(transport_mode, 'driving-car')
    print(f"Generating {transport_mode} routes from {origin} to {destination}")
    
    # Calculate distance between origin and destination
    lat_diff = destination[1] - origin[1]
    lon_diff = destination[0] - origin[0]
    distance_km = math.sqrt(lat_diff**2 + lon_diff**2) * 111  # Rough km conversion
    
    print(f"Direct distance: {distance_km:.1f} km")
    
    # Adjust waypoint strategies based on transport mode
    if transport_mode == 'walking':
        waypoint_offset = 0.002  # Smaller offsets for walking
    elif transport_mode == 'cycling':
        waypoint_offset = 0.003
    else:
        waypoint_offset = 0.005  # Default for driving
    
    # Create three different routes using waypoints
    waypoint_strategies = [
        # Route 1: Direct route
        [],
        
        # Route 2: Route with waypoint to the east
        [[origin[0] + waypoint_offset, origin[1] + waypoint_offset * 0.6]],
        
        # Route 3: Route with waypoint to the west  
        [[origin[0] - waypoint_offset, origin[1] + waypoint_offset * 0.6]]
    ]
    
    for i, waypoints in enumerate(waypoint_strategies):
        try:
            print(f"Creating {transport_mode} route {i+1} with {len(waypoints)} waypoints")
            
            # Build coordinates list
            coords = [origin]
            coords.extend(waypoints)
            coords.append(destination)
            
            print(f"Route {i+1} coordinates: {coords}")
            
            # Get route with appropriate profile
            route = client.directions(coordinates=coords, profile=profile, format="geojson")
            
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
            [[mid_lon + waypoint_offset * 1.6, mid_lat + waypoint_offset]],  # Northeast of midpoint
            [[mid_lon - waypoint_offset * 1.6, mid_lat + waypoint_offset]],  # Northwest of midpoint
            [[mid_lon, mid_lat + waypoint_offset * 1.6]]           # North of midpoint
        ]
        
        for i, waypoints in enumerate(alternative_waypoints):
            if len(routes) >= 3:
                break
                
            try:
                print(f"Trying alternative route {i+1}")
                
                coords = [origin]
                coords.extend(waypoints)
                coords.append(destination)
                
                route = client.directions(coordinates=coords, profile=profile, format="geojson")
                
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
            route = client.directions(coordinates=[origin, destination], profile=profile, format="geojson")
            routes.append(route)
            print("Added basic route as fallback")
        except Exception as e:
            print(f"Error getting basic route: {e}")
    
    print(f"Total {transport_mode} routes generated: {len(routes)}")
    
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

def build_safety_map(routes, origin, destination, hexagons, route_safety_data):
    """Build enhanced map showing routes with safety analysis and markers"""
    print(f"Building enhanced safety map with {len(routes)} routes")
    
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
    
    # Create map with enhanced styling
    fmap = folium.Map(location=center, zoom_start=12, tiles='OpenStreetMap')
    
    # Add safety facility markers along routes
    safety_markers_added = 0
    for i, r in enumerate(routes):
        safety_info = route_safety_data[i]
        route_coords = [(lat, lon) for lon, lat in r['features'][0]['geometry']['coordinates']]
        
        # Sample points along route to add safety markers
        step = max(1, len(route_coords) // 10)  # Add markers every 10th point
        for j in range(0, len(route_coords), step):
            lat, lon = route_coords[j]
            
            # Add safety facility markers based on what's nearby
            facility_counts = safety_info['facility_counts']
            
            # Police stations
            if facility_counts.get('police', 0) > 0 and j % (step * 3) == 0:
                folium.Marker(
                    [lat, lon],
                    popup=f"🚔 Police Station<br>Route {i+1}",
                    icon=folium.Icon(color="blue", icon="shield", prefix="fa")
                ).add_to(fmap)
                safety_markers_added += 1
            
            # Hospitals
            if facility_counts.get('hospital', 0) > 0 and j % (step * 4) == 0:
                folium.Marker(
                    [lat, lon],
                    popup=f"🏥 Hospital<br>Route {i+1}",
                    icon=folium.Icon(color="red", icon="hospital", prefix="fa")
                ).add_to(fmap)
                safety_markers_added += 1
            
            # Schools
            if facility_counts.get('school', 0) > 0 and j % (step * 5) == 0:
                folium.Marker(
                    [lat, lon],
                    popup=f"🏫 School<br>Route {i+1}",
                    icon=folium.Icon(color="green", icon="graduation-cap", prefix="fa")
                ).add_to(fmap)
                safety_markers_added += 1
    
    print(f"Added {safety_markers_added} safety markers to map")
    
    # Add routes with enhanced styling and safety information
    for i, r in enumerate(routes):
        coords_latlon = [(lat, lon) for lon, lat in r['features'][0]['geometry']['coordinates']]
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        
        color = COLORS[i]
        safety_info = route_safety_data[i]
        
        print(f"Adding route {i+1} with color {color}, safety score: {safety_info['safety_score']:.1f}")
        
        # Enhanced popup with detailed safety information
        popup_text = f"""
        <div style="font-family: Arial, sans-serif; min-width: 250px;">
            <h3 style="color: {color}; margin: 0 0 10px 0;">🛣️ Route {i+1}</h3>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 5px 0;">
                <strong>📏 Distance:</strong> {dist_m/1000:.1f} km<br>
                <strong>⏱️ Duration:</strong> {dur_s/60:.0f} minutes<br>
                <strong>🛡️ Safety Score:</strong> <span style="color: {'#4CAF50' if safety_info['safety_score'] >= 7 else '#FF9800' if safety_info['safety_score'] >= 4 else '#f44336'}; font-weight: bold;">{safety_info['safety_score']:.1f}/10</span>
            </div>
            <div style="margin: 10px 0;">
                <strong>🏛️ Safety Facilities:</strong><br>
                🚔 Police: {safety_info['facility_counts'].get('police', 0)}<br>
                🏥 Hospitals: {safety_info['facility_counts'].get('hospital', 0)}<br>
                🏫 Schools: {safety_info['facility_counts'].get('school', 0)}<br>
                🏦 Banks: {safety_info['facility_counts'].get('bank', 0)}<br>
                🚒 Fire Stations: {safety_info['facility_counts'].get('fire_station', 0)}<br>
                🚌 Transit: {safety_info['facility_counts'].get('bus_station', 0) + safety_info['facility_counts'].get('train_station', 0)}
            </div>
            <div style="background: #e8f5e8; padding: 8px; border-radius: 3px; font-size: 12px;">
                <strong>🔍 Analysis:</strong><br>
                {safety_info['reasoning']}
            </div>
        </div>
        """
        
        # Create route line with enhanced styling and store reference for toggling
        route_line = folium.PolyLine(
            coords_latlon, 
            color=color, 
            weight=8, 
            opacity=0.9,
            popup=folium.Popup(popup_text, max_width=300),
            tooltip=f"Route {i+1}: Safety {safety_info['safety_score']:.1f}/10"
        )
        route_line.add_to(fmap)
        
        # Store route layer reference for JavaScript toggling
        print(f"Route {i+1} added to map with ID: route{i+1}")

    # Add enhanced origin and destination markers
    folium.Marker(
        origin[::-1], 
        popup="<div style='font-family: Arial;'><h3>📍 Current Location</h3><p>Starting point of your journey</p></div>", 
        icon=folium.Icon(color="blue", icon="home", prefix="fa")
    ).add_to(fmap)
    
    folium.Marker(
        destination[::-1], 
        popup="<div style='font-family: Arial;'><h3>🎯 Destination</h3><p>Your final destination</p></div>", 
        icon=folium.Icon(color="red", icon="flag", prefix="fa")
    ).add_to(fmap)
    
    # Enhanced legend with more information
    legend_html = f'''
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 350px; height: auto; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; border: 2px solid #333; z-index:9999; 
                font-size:14px; padding: 20px; border-radius: 10px;">
    <h4 style="margin: 0 0 15px 0;">🛡️ Safety Route Map</h4>
    <p><strong>Safety Legend:</strong></p>
    <p><span style="color: #4CAF50; font-size: 18px;">●</span> High Safety (7-10)</p>
    <p><span style="color: #FF9800; font-size: 18px;">●</span> Medium Safety (4-6)</p>
    <p><span style="color: #f44336; font-size: 18px;">●</span> Low Safety (0-3)</p>
    <h4 style="margin: 15px 0 10px 0;">🛣️ Routes</h4>
    '''
    
    for i, r in enumerate(routes):
        dist_m = r['features'][0]['properties']['summary']['distance']
        dur_s = r['features'][0]['properties']['summary']['duration']
        color = COLORS[i]
        safety_info = route_safety_data[i]
        legend_html += f'<p><span style="color:{color}; font-weight:bold; font-size:16px;">●</span> Route {i+1}: Safety {safety_info["safety_score"]:.1f}/10 ({dist_m/1000:.1f}km, {dur_s/60:.0f}min)</p>'
    
    legend_html += '''
    <h4 style="margin: 15px 0 10px 0;">🏛️ Safety Facilities</h4>
    <p>🚔 Police | 🏥 Hospitals | 🏫 Schools | 🏦 Banks | 🚒 Fire | 🚌 Transit</p>
    '''
    legend_html += '</div>'
    fmap.get_root().html.add_child(folium.Element(legend_html))
    
    # Add JavaScript for route toggling functionality
    route_toggle_script = '''
    <script>
    // Route toggle functions with visual feedback
    function toggleRoute(routeNum) {
        console.log('Toggling route ' + routeNum);
        const button = document.querySelector('button[onclick="toggleRoute(' + routeNum + ')"]');
        const isActive = button.classList.contains('active');
        
        if (isActive) {
            button.classList.remove('active');
            button.style.background = '#f0f0f0';
            button.style.color = '#333';
            button.innerHTML = 'Route ' + routeNum + ' (Hidden)';
            console.log('Hiding route ' + routeNum);
        } else {
            button.classList.add('active');
            button.style.background = '#4CAF50';
            button.style.color = 'white';
            button.innerHTML = 'Route ' + routeNum + ' (Visible)';
            console.log('Showing route ' + routeNum);
        }
    }
    
    function showAllRoutes() {
        console.log('Showing all routes');
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            if (btn.textContent.includes('Route')) {
                btn.classList.add('active');
                btn.style.background = '#4CAF50';
                btn.style.color = 'white';
                const routeNum = btn.textContent.match(/Route (\\d+)/)[1];
                btn.innerHTML = 'Route ' + routeNum + ' (Visible)';
            }
        });
    }
    
    function hideAllRoutes() {
        console.log('Hiding all routes');
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            if (btn.textContent.includes('Route')) {
                btn.classList.remove('active');
                btn.style.background = '#f0f0f0';
                btn.style.color = '#333';
                const routeNum = btn.textContent.match(/Route (\\d+)/)[1];
                btn.innerHTML = 'Route ' + routeNum + ' (Hidden)';
            }
        });
    }
    
    // Initialize route controls when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Route controls initialized');
    });
    </script>
    '''
    
    fmap.get_root().html.add_child(folium.Element(route_toggle_script))
    
    return fmap._repr_html_()

@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route("/route")
def route():
    source = request.args.get("source")
    dest = request.args.get("dest")
    transport_mode = request.args.get("mode", "driving")
    
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
        routes = get_three_routes(origin, destination, transport_mode)
        if not routes:
            return "<div style='text-align: center; padding: 50px; color: orange;'><h3>No Routes Found</h3><p>Could not find any routes between the specified locations</p></div>"
        
        # OSM-based safety analysis near the route (no hex grid)
        hexagons = []
        route_safety_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = analyze_route_safety_osm(route_coords, transport_mode)
            route_safety_data.append(safety_data)
            print(f"Route {i+1} OSM safety score: {safety_data['safety_score']:.1f}/10")
        
        return build_safety_map(routes, origin, destination, hexagons, route_safety_data)
        
    except Exception as e:
        print(f"Error in route function: {e}")
        return f"<div style='text-align: center; padding: 50px; color: red;'><h3>Routing Error</h3><p>Failed to calculate routes: {str(e)}</p></div>"

@app.route("/safety_analysis")
def safety_analysis():
    source = request.args.get("source")
    dest = request.args.get("dest")
    transport_mode = request.args.get("mode", "driving")
    
    try:
        origin = geocode_address(source)
        destination = geocode_address(dest)
        
        routes = get_three_routes(origin, destination, transport_mode)
        if not routes:
            return {"error": "No routes found"}
        
        # OSM-based safety analysis
        route_data = []
        for i, route in enumerate(routes):
            route_coords = [(lat, lon) for lon, lat in route['features'][0]['geometry']['coordinates']]
            safety_data = analyze_route_safety_osm(route_coords, transport_mode)
            
            route_info = {
                'route_number': i + 1,
                'distance': route['features'][0]['properties']['summary']['distance'] / 1000,
                'duration': route['features'][0]['properties']['summary']['duration'] / 60,
                'safety_score': safety_data['safety_score'],
                'police_count': safety_data['facility_counts'].get('police', 0),
                'hospital_count': safety_data['facility_counts'].get('hospital', 0),
                'school_count': safety_data['facility_counts'].get('school', 0) + safety_data['facility_counts'].get('college', 0) + safety_data['facility_counts'].get('university', 0),
                'bank_count': safety_data['facility_counts'].get('bank', 0) + safety_data['facility_counts'].get('atm', 0),
                'fire_count': safety_data['facility_counts'].get('fire_station', 0),
                'transit_count': safety_data['facility_counts'].get('bus_station', 0) + safety_data['facility_counts'].get('train_station', 0),
                'total_facilities': sum(safety_data['facility_counts'].values()),
                'reasoning': safety_data['reasoning']
            }
            route_data.append(route_info)
        
        # Sort routes by safety score (highest first) for ranking
        route_data.sort(key=lambda x: x['safety_score'], reverse=True)
        
        # Add ranking information
        for i, route in enumerate(route_data):
            route['rank'] = i + 1
            if i == 0:
                route['safety_level'] = 'SAFEST'
            elif i == 1:
                route['safety_level'] = 'GOOD'
            else:
                route['safety_level'] = 'MODERATE'
        
        return {"routes": route_data}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("Open http://127.0.0.1:5000 in your browser")
    webbrowser.open("http://127.0.0.1:5000")
    app.run(debug=True)
