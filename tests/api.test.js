import test from 'node:test';
import assert from 'node:assert/strict';
import { SpaceX } from '../src/api/spacex.js';

const response = data => ({ok:true,json:async()=>data});

test('launches requests SpaceX 121, normal mode and returns results', async () => {
  const calls=[];
  const api=new SpaceX('https://ll.thespacedevs.com/2.3.0/', {
    fetchImpl:async url=> {calls.push(new URL(url));return response({results:[{id:'launch-1',pad:{id:80}}]});},
    storage:null,
  });
  const launches=await api.launches(50);
  assert.equal(launches[0].id,'launch-1');
  assert.match(calls[0].pathname,/\/launches\/previous\/$/);
  assert.equal(calls[0].searchParams.get('lsp__id'),'121');
  assert.equal(calls[0].searchParams.get('mode'),'normal');
  assert.equal(calls[0].searchParams.get('limit'),'50');
});

test('launchpads requests SpaceX pads and follows pages', async () => {
  const calls=[];
  const api=new SpaceX(undefined,{
    fetchImpl:async url=> {
      const u=new URL(url);calls.push(u);
      return response(u.searchParams.get('offset')==='0'
        ? {results:[{id:80}],next:'https://example.org/page2'}
        : {results:[{id:93}],next:null});
    },storage:null,
  });
  const pads=await api.launchpads();
  assert.deepEqual(pads.map(p=>p.id),[80,93]);
  assert.equal(calls.length,2);
  assert.equal(calls[0].searchParams.get('agencies_ids'),'121');
  assert.equal(calls[1].searchParams.get('offset'),'1');
});

test('pad detail requests /pads/{id}/',async () => {
  const api=new SpaceX(undefined,{fetchImpl:async url=>response({url}),storage:null});
  const pad=await api.launchpad(80);
  assert.match(pad.url,/\/pads\/80\/$/);
  assert.throws(()=>api.launchpad('../foo'),/Некорректный/);
});

test('HTTP error 429 is explained in Russian',async () => {
  const api=new SpaceX(undefined,{fetchImpl:async()=>({ok:false,status:429,statusText:'Too Many Requests'}),storage:null});
  await assert.rejects(api.launches(),/429/);
});

test('cache prevents repeat fetches until expiration',async () => {
  let hits=0;
  const cache=new Map();
  const storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k),get length(){return cache.size},key:i=>Array.from(cache.keys())[i]};
  let now=1000;
  const api=new SpaceX(undefined,{fetchImpl:async()=>{hits++;return response({results:[]});},storage,now:()=>now});
  await api.launches();await api.launches();
  assert.equal(hits,1);
  api.clearCache();await api.launches();
  assert.equal(hits,2);
  now+=31*60*1000;await api.launches();
  assert.equal(hits,3);
});
