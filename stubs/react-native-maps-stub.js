// Stub for react-native-maps on web platform
// Provides no-op components so the web bundle doesn't crash
const React = require('react');
const { View, Text } = require('react-native');

const MapViewStub = (props) => React.createElement(View, { style: props.style });
MapViewStub.displayName = 'MapView';

const MarkerStub = () => null;
MarkerStub.displayName = 'Marker';

const PolylineStub = () => null;
PolylineStub.displayName = 'Polyline';

const CircleStub = () => null;
CircleStub.displayName = 'Circle';

module.exports = MapViewStub;
module.exports.default = MapViewStub;
module.exports.Marker = MarkerStub;
module.exports.Polyline = PolylineStub;
module.exports.Circle = CircleStub;
module.exports.PROVIDER_DEFAULT = null;
module.exports.PROVIDER_GOOGLE = 'google';
