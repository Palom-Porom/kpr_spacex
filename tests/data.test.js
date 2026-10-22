import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLaunchpads, getCoordinates, getLaunchPadId, toGeoJSON } from '../src/data.js';

const padA = {id:80,name:'Space Launch Complex 40',latitude:28.56194,longitude:-80.57735};
const padB = {id:93,name:'SLC-4E',latitude:34.632,longitude:-120.61};

test('GeoJSON Point coordinates follow [longitude, latitude]', () => {
  const collection = toGeoJSON([padA]);
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.features[0].geometry.type, 'Point');
  assert.deepEqual(collection.features[0].geometry.coordinates, [-80.57735,28.56194]);
  assert.equal(collection.features[0].properties.id,'80');
});

test('coordinates validation skips null, invalid and out-of-range values', () => {
  assert.equal(getCoordinates({latitude:null,longitude:0}),null);
  assert.equal(getCoordinates({latitude:'xyz',longitude:0}),null);
  assert.equal(getCoordinates({latitude:91,longitude:0}),null);
  assert.equal(getCoordinates({latitude:20,longitude:-200}),null);
  assert.equal(toGeoJSON([padA,{id:5,latitude:null,longitude:20}]).features.length,1);
});

test('missing pads are supplemented from launches and deduplicated by ID', () => {
  const launch = {id:'uuid-1',pad:padB};
  const pads = buildLaunchpads([padA,padA], [launch]);
  assert.equal(pads.length,2);
  assert.deepEqual(pads.map(p => p.id),[80,93]);
  assert.equal(getLaunchPadId(launch),'93');
  assert.equal(getLaunchPadId({pad:null}),null);
});

test('prefer pad with coordinates for duplicate id', () => {
  const pads = buildLaunchpads([{id:80,name:'No coordinates'}],[{pad:padA}]);
  assert.equal(toGeoJSON(pads).features.length,1);
  assert.deepEqual(getCoordinates(pads[0]),[-80.57735,28.56194]);
});
