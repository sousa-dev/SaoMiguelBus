import { busMarkerSvgFunctionSource } from '@/lib/bus-marker-svg';
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
      @keyframes live-pulse {
        0% { transform: scale(0.6); opacity: 0.5; }
        100% { transform: scale(1.9); opacity: 0; }
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
      let userLocationLayer = null;
      let userMarker = null;
      let config = null;
      let moveEndTimer = null;
      let suppressRegionEvents = 0;
      let hasInitialView = false;
      let userPannedGesture = false;
      let lastAppliedRegion = null;

      function post(type, payload) {
        if (!RN) return;
        RN.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }

      // A zoom LEVEL for a point (flyTo), not a container fit — deriving from
      // the larger of the two deltas keeps an east-west route from being
      // over-zoomed by its smaller north-south extent, and Math.floor errs
      // towards showing too much rather than clipping the path.
      function deltaToZoom(latitudeDelta, longitudeDelta) {
        const delta = Math.max(latitudeDelta, longitudeDelta || 0, 0.0005);
        const zoom = Math.log2(360 / delta);
        return Math.max(0, Math.min(19, Math.floor(zoom)));
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

      ${busMarkerSvgFunctionSource}

      function markerIcon(marker) {
        const fill = marker.pinColor || '#3388ff';
        const px = marker.size || 28;
        const radius = px / 2;
        const inner = marker.label || '';
        const fontSize = px <= 20 ? 10 : 11;
        var innerHtml = '';
        if (marker.iconKind === 'bus') {
          innerHtml = busIconSvg(marker.iconColor || '#ffffff', px);
        } else if (inner) {
          innerHtml =
            '<div style="color:#fff;font:700 ' + fontSize + 'px/1 system-ui,sans-serif;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.45)">' + inner + '</div>';
        }
        const caption = marker.showLabel && marker.title && marker.iconKind !== 'bus'
          ? '<div class="hub-marker-label">' + marker.title + '</div>'
          : '';
        const highlighted = !!marker.highlighted;
        const halo = highlighted
          ? '<div style="position:absolute;inset:-5px;border-radius:999px;border:2px solid #111;box-shadow:0 0 0 2px #fff"></div>'
          : '';
        // A real looping CSS animation, not a static ring like the
        // "highlighted" halo above -- this WebView runs actual HTML/CSS, so
        // the pulse costs no JS and no per-frame bridge traffic.
        const pulseRing = marker.pulsing
          ? '<div style="position:absolute;inset:-7px;border-radius:999px;background:' + fill +
            ';animation:live-pulse 1.4s ease-out infinite"></div>'
          : '';
        return L.divIcon({
          className: '',
          html:
            '<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)">' +
            '<div style="position:relative;width:' + px + 'px;height:' + px + 'px">' + halo + pulseRing +
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
            icon: markerIcon(marker),
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

      function refreshUserLocationFromConfig() {
        if (!config) return;
        applyUserLocation(!!config.showsUserLocation, config.userLocation || null);
      }

      function applyUserLocation(show, point) {
        if (!userLocationLayer) return;
        userLocationLayer.clearLayers();
        userMarker = null;
        if (!show || !point) return;
        const latlng = [point.latitude, point.longitude];
        userLocationLayer.addLayer(
          L.circleMarker(latlng, {
            radius: 14,
            color: '#1a73e8',
            weight: 1,
            fillColor: '#1a73e8',
            fillOpacity: 0.18,
            interactive: false,
            zIndexOffset: 2000,
          }),
        );
        userMarker = L.circleMarker(latlng, {
          radius: 8,
          color: '#ffffff',
          weight: 3,
          fillColor: '#1a73e8',
          fillOpacity: 1,
          interactive: false,
          zIndexOffset: 2001,
        });
        userLocationLayer.addLayer(userMarker);
        userLocationLayer.bringToFront();
      }

      function setTileStyle(isDark) {
        const url = isDark ? darkTiles : lightTiles;
        if (tileLayer) {
          tileLayer.setUrl(url);
          return;
        }
        tileLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
      }

      /**
       * Run a PROGRAMMATIC move without it being mistaken for a user gesture.
       *
       * Released on the map's own moveend, not on a fixed timer. Leaflet
       * animates fitBounds/flyTo over 250-350ms, so a 200ms window closed while
       * the move was still running: the resulting moveend arrived unsuppressed,
       * was read as a pan, and set userPannedGesture — which permanently
       * disabled every later applyRegion. The map framed itself once and then
       * ignored the app for the rest of its life.
       *
       * The timer is only a fallback for a move that never fires moveend (a
       * setView to where the map already is), and is long enough to outlast the
       * animation rather than racing it.
       */
      function withSuppressedRegionEvents(fn) {
        suppressRegionEvents += 1;
        let released = false;
        function release() {
          if (released) return;
          released = true;
          suppressRegionEvents = Math.max(0, suppressRegionEvents - 1);
        }
        try {
          fn();
        } finally {
          if (map) {
            // Registered after the main moveend listener, so that one runs
            // first and still sees the move suppressed; the release is deferred
            // a tick so any same-turn handler is covered too.
            map.once('moveend', function () { setTimeout(release, 0); });
          }
          setTimeout(release, 1200);
        }
      }

      function applyMapOptions(next) {
        if (!map) return;
        if (next.minZoom != null) map.setMinZoom(next.minZoom);
        if (next.maxZoom != null) map.setMaxZoom(next.maxZoom);
        if (typeof next.scrollEnabled === 'boolean') {
          map.dragging[next.scrollEnabled ? 'enable' : 'disable']();
        }
        if (typeof next.zoomEnabled === 'boolean') {
          map.touchZoom[next.zoomEnabled ? 'enable' : 'disable']();
          map.doubleClickZoom[next.zoomEnabled ? 'enable' : 'disable']();
          map.boxZoom[next.zoomEnabled ? 'enable' : 'disable']();
        }
        if (typeof next.isDark === 'boolean') {
          setTileStyle(next.isDark);
        }
        // Only touch markers when overlays are explicitly provided — options-only
        // updates (scroll/zoom/theme/user location) must not replay stale config overlays.
        if (next.overlays !== undefined) {
          applyOverlays(next.overlays);
        }
        if (
          typeof next.showsUserLocation === 'boolean' ||
          next.userLocation !== undefined
        ) {
          refreshUserLocationFromConfig();
        }
      }

      function setViewFromRegion(nextRegion, animate) {
        if (!map || !nextRegion) return;
        // Recorded before the no-op check, not after: this is the region the app
        // last ASKED for, and the post-layout re-fit below has to replay that
        // even when this particular call was skipped as already-satisfied.
        lastAppliedRegion = nextRegion;
        // Only diff against the current view once the map actually has one —
        // getCenter() throws on a freshly created map with no view set. The
        // comparison zoom is a heuristic (deltaToZoom), not what actually gets
        // applied below — fitBounds does its own container-aware arithmetic.
        if (hasInitialView) {
          const zoom = deltaToZoom(nextRegion.latitudeDelta, nextRegion.longitudeDelta);
          const center = map.getCenter();
          const latDiff = Math.abs(center.lat - nextRegion.latitude);
          const lngDiff = Math.abs(center.lng - nextRegion.longitude);
          const zoomDiff = Math.abs(map.getZoom() - zoom);
          if (latDiff < 0.0002 && lngDiff < 0.0002 && zoomDiff < 1) {
            return;
          }
        }
        const bounds = L.latLngBounds(
          [nextRegion.latitude - nextRegion.latitudeDelta / 2, nextRegion.longitude - nextRegion.longitudeDelta / 2],
          [nextRegion.latitude + nextRegion.latitudeDelta / 2, nextRegion.longitude + nextRegion.longitudeDelta / 2],
        );
        withSuppressedRegionEvents(function () {
          map.fitBounds(bounds, { animate: !!animate, padding: [8, 8] });
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
          userLocationLayer = L.layerGroup().addTo(map);
          map.on('click', function (e) {
            post('press', { latitude: e.latlng.lat, longitude: e.latlng.lng });
          });
          map.on('contextmenu', function (e) {
            post('longPress', { latitude: e.latlng.lat, longitude: e.latlng.lng });
          });
          map.on('moveend', function () {
            if (suppressRegionEvents > 0) return;
            // A real user pan/zoom on an interactive map — from here on, stop
            // fighting them with programmatic region syncs (applyRegion).
            if (config && config.scrollEnabled) {
              userPannedGesture = true;
            }
            clearTimeout(moveEndTimer);
            moveEndTimer = setTimeout(function () {
              post('regionChange', { region: regionFromMap() });
            }, 120);
          });
          // Set the view BEFORE reading anything off the map.
          setViewFromRegion(next.region, false);
          applyMapOptions(next);
          // Leaflet sometimes needs a nudge once the WebView has its final size —
          // and fitBounds must run again after that, since it accounts for the
          // container size and the first call ran against the pre-layout one.
          setTimeout(function () {
            if (!map) return;
            map.invalidateSize();
            // Re-fit against the region that is CURRENTLY wanted. RN sends its
            // first applyRegion the moment it sees ready, which lands inside
            // this 60ms window — replaying next.region here threw that away and
            // snapped the map back to the boot framing. A real user gesture in
            // the same window wins over both.
            if (userPannedGesture) return;
            hasInitialView = false;
            setViewFromRegion(lastAppliedRegion || next.region, false);
          }, 60);
          post('ready', {});
          return;
        }
        applyMapOptions(next);
      }

      window.__mapBridge = {
        applyConfig: applyConfig,
        updateOptions: function (next) {
          if (!map) return;
          config = config ? Object.assign({}, config, next) : next;
          applyMapOptions(next);
          refreshUserLocationFromConfig();
          if (userLocationLayer) {
            userLocationLayer.bringToFront();
          }
        },
        updateOverlays: function (overlays) {
          if (!map) return;
          applyOverlays(overlays || { markers: [], polylines: [] });
          refreshUserLocationFromConfig();
          if (userLocationLayer) {
            userLocationLayer.bringToFront();
          }
        },
        flyTo: function (region, durationMs) {
          if (!map) return;
          const zoom = deltaToZoom(region.latitudeDelta, region.longitudeDelta);
          withSuppressedRegionEvents(function () {
            map.flyTo([region.latitude, region.longitude], zoom, {
              animate: true,
              duration: Math.max(0.15, (durationMs || 300) / 1000),
            });
          });
        },
        // Post-mount region sync: geometry that arrives after the first paint
        // (a late leg, a direction swap) re-frames the map instead of leaving
        // it stuck on the region the WebView happened to boot with.
        applyRegion: function (region, animate) {
          if (!map || !region || userPannedGesture) return;
          setViewFromRegion(region, animate !== false);
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
          if (payload.type === 'applyRegion') window.__mapBridge.applyRegion(payload.region, payload.animate);
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
