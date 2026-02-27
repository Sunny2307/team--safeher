import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import { getEmergencyPlaces } from '../../api/api';
import customAlertService from '../../services/customAlertService';

const RADII = [
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
];
const TYPES = [
  { value: 'pharmacy', label: 'Pharmacies' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'doctor', label: 'Clinics' },
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) / 1000;
}

export default function EmergencyLocatorScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [radius, setRadius] = useState(5000);
  const [placeType, setPlaceType] = useState('pharmacy');
  const [openNow, setOpenNow] = useState(false);

  const requestLocation = async () => {
    let status;
    if (Platform.OS === 'android') {
      status = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (status !== RESULTS.GRANTED) {
        status = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      }
    } else {
      status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (status !== RESULTS.GRANTED) {
        status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }
    }
    if (status !== RESULTS.GRANTED && status !== RESULTS.LIMITED) {
      customAlertService.showError('Location required', 'Please enable location to find nearby places.');
      return null;
    }
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
      );
    });
  };

  const fetchPlaces = async () => {
    if (!location) return;
    setLoadingPlaces(true);
    try {
      const res = await getEmergencyPlaces({
        lat: location.latitude,
        lng: location.longitude,
        radius,
        types: placeType,
        openNow: openNow ? 'true' : undefined,
      });
      const list = res.data?.places || [];
      const withDistance = list.map(p => ({
        ...p,
        distance: p.lat && p.lng ? haversine(location.latitude, location.longitude, p.lat, p.lng) : null,
      })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      setPlaces(withDistance);
    } catch (err) {
      customAlertService.showError('Error', err.response?.data?.error || 'Failed to load places');
      setPlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  useEffect(() => {
    requestLocation().then(setLocation).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (location) {
      setLoading(false);
      fetchPlaces();
    }
  }, [location, radius, placeType, openNow]);

  const openDirections = (item) => {
    if (!item?.lat || !item?.lng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${item.lat},${item.lng}`,
      android: `geo:0,0?q=${item.lat},${item.lng}`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${item.lat},${item.lng}`));
  };

  const openCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  if (loading && !location) {
    return (
      <View style={styles.container}>
        <Header showBack showIcons={false} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9C7BB8" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  const region = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : null;

  return (
    <View style={styles.container}>
      <Header showBack showIcons={false} />
      <View style={styles.content}>
        <Text style={styles.screenTitle}>Emergency contraception locator</Text>
        <Text style={styles.subtitle}>Find nearby pharmacies and hospitals</Text>
        {region && (
          <View style={styles.mapWrap}>
            <MapView style={styles.map} initialRegion={region} region={region} showsUserLocation>
              {places.filter(p => p.lat && p.lng).map((p) => (
                <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} />
              ))}
            </MapView>
          </View>
        )}
        <View style={styles.controls}>
          <Text style={styles.controlLabel}>Type</Text>
          <View style={styles.chipRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, placeType === t.value && styles.chipActive]}
                onPress={() => setPlaceType(t.value)}
              >
                <Text style={[styles.chipText, placeType === t.value && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.controlLabel}>Radius</Text>
          <View style={styles.chipRow}>
            {RADII.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, radius === r.value && styles.chipActive]}
                onPress={() => setRadius(r.value)}
              >
                <Text style={[styles.chipText, radius === r.value && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.chip, openNow && styles.chipActive]}
            onPress={() => setOpenNow(!openNow)}
          >
            <Text style={[styles.chipText, openNow && styles.chipTextActive]}>Open now</Text>
          </TouchableOpacity>
        </View>
        {loadingPlaces ? (
          <ActivityIndicator style={{ padding: 20 }} color="#9C7BB8" />
        ) : (
          <FlatList
            data={places}
            keyExtractor={(item) => item.id || item.name}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.placeCard}>
                <View style={styles.placeHeader}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  {item.is24Hours && (
                    <View style={styles.badge24}>
                      <Text style={styles.badge24Text}>24h</Text>
                    </View>
                  )}
                </View>
                {item.vicinity && <Text style={styles.vicinity} numberOfLines={1}>{item.vicinity}</Text>}
                <View style={styles.placeMeta}>
                  {item.distance != null && <Text style={styles.distance}>{item.distance.toFixed(1)} km</Text>}
                  {item.rating != null && <Text style={styles.rating}>★ {item.rating}</Text>}
                </View>
                <View style={styles.placeActions}>
                  <TouchableOpacity style={styles.dirBtn} onPress={() => openDirections(item)}>
                    <Text style={styles.dirBtnText}>Directions</Text>
                  </TouchableOpacity>
                  {item.phoneNumber ? (
                    <TouchableOpacity style={styles.callBtn} onPress={() => openCall(item.phoneNumber)}>
                      <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No places found in this area.</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  content: { flex: 1, paddingHorizontal: 16 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  mapWrap: { height: 200, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  controls: { marginBottom: 16 },
  controlLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 4,
  },
  chipActive: { backgroundColor: '#9C7BB8' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { paddingBottom: 40 },
  placeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  placeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  placeName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  badge24: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badge24Text: { fontSize: 11, color: '#065F46', fontWeight: '700' },
  vicinity: { fontSize: 13, color: '#666', marginBottom: 6 },
  placeMeta: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  distance: { fontSize: 12, color: '#888' },
  rating: { fontSize: 12, color: '#888' },
  placeActions: { flexDirection: 'row', gap: 10 },
  dirBtn: { backgroundColor: '#E0E7FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  dirBtnText: { fontSize: 13, color: '#4338CA', fontWeight: '600' },
  callBtn: { backgroundColor: '#D1FAE5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  callBtnText: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  empty: { textAlign: 'center', color: '#888', paddingVertical: 24 },
});
