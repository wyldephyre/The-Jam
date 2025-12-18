import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let tokenExpiresAt = 0;

async function ensureAccessToken() {
  if (Date.now() < tokenExpiresAt - 60000) {
    return;
  }
  
  spotifyApi.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);
  const data = await spotifyApi.refreshAccessToken();
  spotifyApi.setAccessToken(data.body.access_token);
  tokenExpiresAt = Date.now() + data.body.expires_in * 1000;
}

export async function searchTracks(query, limit = 10) {
  await ensureAccessToken();
  const result = await spotifyApi.searchTracks(query, { limit });
  return result.body.tracks.items.map(track => ({
    uri: track.uri,
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images[0]?.url,
  }));
}

export async function addToQueue(uri) {
  await ensureAccessToken();
  await spotifyApi.addToQueue(uri);
}

export { spotifyApi };

