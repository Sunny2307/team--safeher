import folium
import math
import random

def create_simple_hex_grid():
    """Create a simple hex grid for testing"""
    # Center around Nadiad
    center_lat, center_lon = 22.6935, 72.8615
    
    # Create a simple grid
    hexagons = []
    hex_size = 0.01  # About 1km
    
    for row in range(-3, 4):
        for col in range(-3, 4):
            lat = center_lat + row * hex_size * 0.866  # Hex spacing
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
    
    return hexagons

def create_test_map():
    """Create a test map without hexagons"""
    # Create map centered on Nadiad
    fmap = folium.Map(location=[22.6935, 72.8615], zoom_start=13)
    
    # Hexagons removed - no longer generating or adding hexagons to the map
    print("Hexagons removed from map")
    
    # Add a marker at center
    folium.Marker([22.6935, 72.8615], popup="Nadiad", icon=folium.Icon(color="blue")).add_to(fmap)
    
    # Simplified legend without hexagon references
    legend_html = '''
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 200px; height: auto; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 15px; border-radius: 5px;">
    <p><b>Map Legend:</b></p>
    <p><span style="color: blue;">📍</span> Location Marker</p>
    <p>Hexagons have been removed from this map</p>
    </div>
    '''
    
    fmap.get_root().html.add_child(folium.Element(legend_html))
    
    return fmap._repr_html_()

if __name__ == "__main__":
    html = create_test_map()
    
    # Save to file
    with open("test_hex_map.html", "w", encoding="utf-8") as f:
        f.write(html)
    
    print("Test map saved as test_hex_map.html")
    print("Open this file in your browser to see the map without hexagons")
