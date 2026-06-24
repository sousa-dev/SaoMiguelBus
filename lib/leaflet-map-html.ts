import type { MapOverlaySpec } from '@/lib/map-overlays';
import { ANDROID_LIGHT_TILE_URL, CARTO_DARK_TILE_URL } from '@/lib/map-tiles';

export type LeafletMapConfig = {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  overlays: MapOverlaySpec;
  isDark: boolean;
  scrollEnabled: boolean;
  zoomEnabled: boolean;
  minZoom?: number;
  maxZoom?: number;
  showsUserLocation: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
};

function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
}

/**
 * Self-initializing Leaflet map document for the Android WebView.
 *
 * - Leaflet is loaded async and polled for, so a slow/blocked CDN cannot hang the page.
 * - The initial viewport/overlays are embedded directly; the map renders without waiting
 *   for any React Native → WebView message. RN only sends incremental updates afterwards.
 */
export function leafletMapHtml(initialConfig: LeafletMapConfig): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <script>window.__leafletFailed = false;</script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="" async onerror="window.__leafletFailed=true;"></script>
    <style>
      html, body, #map { margin: 0; height: 100%; width: 100%; background: #e8eef2; }
      .hub-marker-label {
        color: #fff;
        font: 700 11px/1 system-ui, sans-serif;
        text-align: center;
        text-shadow: 0 1px 2px rgba(0,0,0,0.45);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const RN = window.ReactNativeWebView;
      const lightTiles = ${jsonForHtml(ANDROID_LIGHT_TILE_URL)};
      const darkTiles = ${jsonForHtml(CARTO_DARK_TILE_URL)};
      const INITIAL_CONFIG = ${jsonForHtml(initialConfig)};

      let map = null;
      let tileLayer = null;
      let markerLayer = null;
      let polylineLayer = null;
      let userMarker = null;
      let config = null;
      let moveEndTimer = null;
      let suppressRegionEvents = 0;
      let hasInitialView = false;

      function post(type, payload) {
        if (!RN) return;
        RN.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }

      function deltaToZoom(latitudeDelta) {
        const zoom = Math.log2(360 / Math.max(latitudeDelta, 0.0005));
        return Math.max(0, Math.min(19, Math.round(zoom)));
      }

      function regionFromMap() {
        const center = map.getCenter();
        const bounds = map.getBounds();
        return {
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: Math.max(bounds.getNorth() - bounds.getSouth(), 0.0005),
          longitudeDelta: Math.max(bounds.getEast() - bounds.getWest(), 0.0005),
        };
      }

      function markerIcon(color, title, label, size, highlighted) {
        const fill = color || '#3388ff';
        const px = size || 28;
        const radius = px / 2;
        const inner = label || '';
        const fontSize = px <= 20 ? 10 : 11;
        const innerHtml = inner
          ? '<div style="color:#fff;font:700 ' + fontSize + 'px/1 system-ui,sans-serif;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.45)">' + inner + '</div>'
          : '';
        const caption = title && !inner
          ? '<div class="hub-marker-label">' + title + '</div>'
          : '';
        const halo = highlighted
          ? '<div style="position:absolute;inset:-5px;border-radius:999px;border:2px solid #111;box-shadow:0 0 0 2px #fff"></div>'
          : '';
        return L.divIcon({
          className: '',
          html:
            '<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)">' +
            '<div style="position:relative;width:' + px + 'px;height:' + px + 'px">' + halo +
            '<div style="width:' + px + 'px;height:' + px + 'px;border-radius:' + radius + 'px;background:' + fill +
            ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center">' +
            innerHtml + '</div></div>' + caption + '</div>',
          iconSize: [px + (highlighted ? 10 : 0), px + (highlighted ? 10 : 0)],
          iconAnchor: [(px + (highlighted ? 10 : 0)) / 2, (px + (highlighted ? 10 : 0)) / 2],
        });
      }

      function applyOverlays(overlays) {
        if (!markerLayer || !polylineLayer) return;
        markerLayer.clearLayers();
        polylineLayer.clearLayers();
        (overlays.markers || []).forEach(function (marker) {
          const m = L.marker([marker.latitude, marker.longitude], {
            icon: markerIcon(marker.pinColor, marker.title, marker.label, marker.size, marker.highlighted),
            draggable: !!marker.draggable,
            opacity: typeof marker.opacity === 'number' ? marker.opacity : 1,
          });
          m.on('click', function () { post('markerPress', { id: marker.id }); });
          if (marker.draggable) {
            m.on('dragend', function () {
              const p = m.getLatLng();
              post('markerDragEnd', { id: marker.id, latitude: p.lat, longitude: p.lng });
            });
          }
          markerLayer.addLayer(m);
        });
        (overlays.polylines || []).forEach(function (line) {
          if (!line.coordinates || !line.coordinates.length) return;
          const latlngs = line.coordinates.map(function (c) { return [c.latitude, c.longitude]; });
          polylineLayer.addLayer(
            L.polyline(latlngs, {
              color: line.strokeColor || '#3388ff',
              weight: line.strokeWidth || 4,
              opacity: 0.92,
            }),
          );
        });
      }

      function applyUserLocation(show, point) {
        if (userMarker) {
          map.removeLayer(userMarker);
          userMarker = null;
        }
        if (!show || !point) return;
        userMarker = L.circleMarker([point.latitude, point.longitude], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: '#1a73e8',
          fillOpacity: 1,
        }).addTo(map);
      }

      function setTileStyle(isDark) {
        const url = isDark ? darkTiles : lightTiles;
        if (tileLayer) {
          tileLayer.setUrl(url);
          return;
        }
        tileLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
      }

      function withSuppressedRegionEvents(fn) {
        suppressRegionEvents += 1;
        try {
          fn();
        } finally {
          setTimeout(function () {
            suppressRegionEvents = Math.max(0, suppressRegionEvents - 1);
          }, 200);
        }
      }

      function applyMapOptions(next) {
        if (!map) return;
        if (next.minZoom != null) map.setMinZoom(next.minZoom);
        if (next.maxZoom != null) map.setMaxZoom(next.maxZoom);
        map.dragging[next.scrollEnabled ? 'enable' : 'disable']();
        map.touchZoom[next.zoomEnabled ? 'enable' : 'disable']();
        map.doubleClickZoom[next.zoomEnabled ? 'enable' : 'disable']();
        map.boxZoom[next.zoomEnabled ? 'enable' : 'disable']();
        setTileStyle(!!next.isDark);
        applyOverlays(next.overlays || { markers: [], polylines: [] });
        applyUserLocation(!!next.showsUserLocation, next.userLocation || null);
      }

      function setViewFromRegion(nextRegion, animate) {
        if (!map || !nextRegion) return;
        const zoom = deltaToZoom(nextRegion.latitudeDelta);
        // Only diff against the current view once the map actually has one —
        // getCenter() throws on a freshly created map with no view set.
        if (hasInitialView) {
          const center = map.getCenter();
          const latDiff = Math.abs(center.lat - nextRegion.latitude);
          const lngDiff = Math.abs(center.lng - nextRegion.longitude);
          const zoomDiff = Math.abs(map.getZoom() - zoom);
          if (latDiff < 0.0002 && lngDiff < 0.0002 && zoomDiff < 1) {
            return;
          }
        }
        withSuppressedRegionEvents(function () {
          map.setView([nextRegion.latitude, nextRegion.longitude], zoom, { animate: !!animate });
        });
        hasInitialView = true;
      }

      function applyConfig(next) {
        config = next;
        if (!map) {
          map = L.map('map', {
            zoomControl: false,
            attributionControl: true,
            dragging: !!next.scrollEnabled,
            scrollWheelZoom: false,
            doubleClickZoom: !!next.zoomEnabled,
            touchZoom: !!next.zoomEnabled,
            boxZoom: !!next.zoomEnabled,
            keyboard: false,
          });
          markerLayer = L.layerGroup().addTo(map);
          polylineLayer = L.layerGroup().addTo(map);
          map.on('click', function (e) {
            post('press', { latitude: e.latlng.lat, longitude: e.latlng.lng });
          });
          map.on('contextmenu', function (e) {
            post('longPress', { latitude: e.latlng.lat, longitude: e.latlng.lng });
          });
          map.on('moveend', function () {
            if (suppressRegionEvents > 0) return;
            clearTimeout(moveEndTimer);
            moveEndTimer = setTimeout(function () {
              post('regionChange', { region: regionFromMap() });
            }, 120);
          });
          // Set the view BEFORE reading anything off the map.
          setViewFromRegion(next.region, false);
          applyMapOptions(next);
          // Leaflet sometimes needs a nudge once the WebView has its final size.
          setTimeout(function () { if (map) map.invalidateSize(); }, 60);
          post('ready', {});
          return;
        }
        applyMapOptions(next);
      }

      window.__mapBridge = {
        applyConfig: applyConfig,
        updateOverlays: function (overlays) {
          if (!map) return;
          applyOverlays(overlays || { markers: [], polylines: [] });
        },
        updateOptions: function (next) {
          if (!map) return;
          config = config ? Object.assign({}, config, next) : next;
          applyMapOptions(config);
        },
        flyTo: function (region, durationMs) {
          if (!map) return;
          const zoom = deltaToZoom(region.latitudeDelta);
          withSuppressedRegionEvents(function () {
            map.flyTo([region.latitude, region.longitude], zoom, {
              animate: true,
              duration: Math.max(0.15, (durationMs || 300) / 1000),
            });
          });
        },
        fitBounds: function (coordinates, padding) {
          if (!map || !coordinates || !coordinates.length) return;
          const bounds = L.latLngBounds(coordinates.map(function (c) { return [c.latitude, c.longitude]; }));
          withSuppressedRegionEvents(function () {
            map.fitBounds(bounds, {
              paddingTopLeft: [padding.left || 0, padding.top || 0],
              paddingBottomRight: [padding.right || 0, padding.bottom || 0],
              animate: false,
            });
          });
        },
      };

      function handleBridgeMessage(raw) {
        try {
          const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!payload || !window.__mapBridge) return;
          if (payload.type === 'config') window.__mapBridge.applyConfig(payload.config);
          if (payload.type === 'updateOverlays') window.__mapBridge.updateOverlays(payload.overlays);
          if (payload.type === 'updateOptions') window.__mapBridge.updateOptions(payload.options);
          if (payload.type === 'flyTo') window.__mapBridge.flyTo(payload.region, payload.durationMs);
          if (payload.type === 'fitBounds') window.__mapBridge.fitBounds(payload.coordinates, payload.padding || {});
        } catch (_) {}
      }

      // Android delivers RN postMessage on document; iOS on window. Support both.
      document.addEventListener('message', function (event) { handleBridgeMessage(event.data); });
      window.addEventListener('message', function (event) { handleBridgeMessage(event.data); });

      function init() {
        try {
          applyConfig(INITIAL_CONFIG);
        } catch (e) {
          post('error', { message: String(e) });
        }
      }

      // Poll for the async Leaflet bundle so a blocked/slow CDN never hangs the page.
      function boot(attempt) {
        if (window.__leafletFailed) {
          post('error', { message: 'leaflet_cdn_error' });
          return;
        }
        if (typeof L !== 'undefined') {
          init();
          return;
        }
        if (attempt > 120) {
          post('error', { message: 'leaflet_timeout' });
          return;
        }
        setTimeout(function () { boot(attempt + 1); }, 50);
      }

      boot(0);
    </script>
  </body>
</html>`;
}
