import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon path for Leaflet
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Fix "Unable to preventDefault inside passive event listener" warning
// Override L.DomEvent.stop để suppress warning
const originalStop = L.DomEvent.stop;
L.DomEvent.stop = function(e) {
    if (e && e.cancelable !== false) {
        originalStop.call(this, e);
    }
};

export default L;

