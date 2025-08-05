import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreviousScreen } from '../../components/ui/PreviousScreenContext';
import { TopBar } from '../../components/ui/TopBar';
import { useThemeColors } from '../../hooks/useThemeColors';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: {
      Player: {
        create: (config: any) => Promise<any>;
      };
    };
  }
}

interface UserPlaylist {
  id: string;
  title: string;
  url: string;
  height: number;
  type: 'playlist' | 'album' | 'track';
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  uri: string;
  popularity?: number;
  previewUrl?: string | null;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: SpotifyTrack[];
}

export default function MusicScreen() {
  const { colors } = useThemeColors();
  const { handleBack, addToStack } = usePreviousScreen();
  const [webViewError, setWebViewError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  
  // Spotify integration states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPlaylist, setCurrentPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'track' | 'context'>('off');
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const defaultPlaylists = [
    {
      title: 'KindFrame Focus Playlist',
      url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYoYGBbGKurt?utm_source=generator',
      height: 152,
    },
    {
      title: 'Calm & Focused',
      url: 'https://open.spotify.com/embed/playlist/2RJLdQ20qLpHguzri0TtBu?utm_source=generator',
      height: 352,
    },
    {
      title: 'Gentle Energy',
      url: 'https://open.spotify.com/embed/playlist/2Al9G2jrWkwDlRFMZaw1GX?utm_source=generator',
      height: 352,
    },
    {
      title: 'Focus Album',
      url: 'https://open.spotify.com/embed/album/5h2wNDbQiXviPMlF7QPPlY?utm_source=generator',
      height: 352,
    },
    {
      title: 'Focus Track',
      url: 'https://open.spotify.com/embed/track/04boE4u1AupbrGlI62WvoO?utm_source=generator',
      height: 352,
    },
  ];

  useEffect(() => {
    addToStack('music');
    loadUserPlaylists();
    checkSpotifyAuth();
  }, [addToStack]);

  const checkSpotifyAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('spotify_access_token');
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
        initializeSpotifyPlayer();
      }
    } catch (error) {
      console.error('Error checking Spotify auth:', error);
    }
  };

  const initializeSpotifyPlayer = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Load Spotify Web Playback SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.Spotify) {
          window.Spotify.Player.create({
            name: 'KindFrame Web Player',
            getOAuthToken: (cb: (token: string) => void) => { cb(accessToken || ''); }
          }).then((player: any) => {
            playerRef.current = player;
            
            player.addListener('ready', ({ device_id }: { device_id: string }) => {
              console.log('Ready with Device ID', device_id);
            });

            player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
              console.log('Device ID has gone offline', device_id);
            });

            player.addListener('player_state_changed', (state: any) => {
              if (state) {
                setIsPlaying(!state.paused);
                setProgress(state.position);
                setDuration(state.duration);
                
                if (state.track_window?.current_track) {
                  const track = state.track_window.current_track;
                  setCurrentTrack({
                    id: track.id,
                    name: track.name,
                    artist: track.artists[0]?.name || '',
                    album: track.album?.name || '',
                    albumArt: track.album?.images[0]?.url || '',
                    duration: track.duration_ms,
                    uri: track.uri,
                  });
                }
              }
            });

            player.connect();
          });
        }
      };
    }
  };

  const authenticateSpotify = async () => {
    const clientId = 'fcb43a65798e487a875b9aea772ea978'; // Replace with your Spotify Client ID
    
    // Try multiple authentication methods
    const authMethods = [
      {
        name: 'Direct Auth (Recommended)',
        method: () => directSpotifyAuth(clientId),
      },
      {
        name: 'Popup Auth',
        method: () => popupSpotifyAuth(clientId),
      },
      {
        name: 'Manual Token Entry',
        method: () => manualTokenAuth(),
      },
    ];

    // Show authentication options
    Alert.alert(
      'Connect Spotify',
      'Choose an authentication method:',
      [
        {
          text: 'Direct Auth',
          onPress: () => authMethods[0].method(),
        },
        {
          text: 'Popup Auth',
          onPress: () => authMethods[1].method(),
        },
        {
          text: 'Manual Token',
          onPress: () => authMethods[2].method(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const directSpotifyAuth = (clientId: string) => {
    const redirectUri = Platform.OS === 'web' 
      ? window.location.origin 
      : 'kindframe://spotify-callback';
    
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'playlist-read-private',
      'playlist-read-collaborative',
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&show_dialog=true`;

    if (Platform.OS === 'web') {
      // Check for malformed URL before storing current location
      const malformedUrl = 'www.googleapis.com/auth/drive.readonly%20https://www.googleapis.com/auth/drive.metadata.readonly';
      if (window.location.href.includes(malformedUrl)) {
        console.error('🔍 MALFORMED URL DETECTED in Spotify auth:', window.location.href);
        alert('Malformed URL Detected: The OAuth URL is malformed. This indicates a scope encoding issue.');
        return;
      }
      
      // Store the current URL to return to after auth
      sessionStorage.setItem('spotify_auth_return_url', window.location.href);
      
      // Navigate to Spotify auth
      console.log('🔗 REDIRECTING TO SPOTIFY OAUTH:', authUrl);
      window.location.href = authUrl;
    } else {
      Alert.alert('Mobile Auth', 'Please implement mobile OAuth flow using WebView or deep linking.');
    }
  };

  const popupSpotifyAuth = (clientId: string) => {
    const redirectUri = Platform.OS === 'web' 
      ? window.location.origin 
      : 'kindframe://spotify-callback';
    
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'playlist-read-private',
      'playlist-read-collaborative',
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&show_dialog=true`;

    if (Platform.OS === 'web') {
      try {
        const popup = window.open(
          authUrl,
          'spotify-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (popup) {
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              const token = localStorage.getItem('spotify_token');
              if (token) {
                localStorage.removeItem('spotify_token');
                handleSpotifyCallback(token);
              } else {
                Alert.alert('Authentication Cancelled', 'Spotify authentication was cancelled or failed. Please try again.');
              }
            }
          }, 1000);

          window.addEventListener('message', (event) => {
            if (event.origin === window.location.origin && event.data.type === 'SPOTIFY_TOKEN') {
              clearInterval(checkClosed);
              popup.close();
              handleSpotifyCallback(event.data.token);
            }
          });
        } else {
          Alert.alert('Popup Blocked', 'Please allow popups for this site and try again, or use Direct Auth instead.');
        }
      } catch (error) {
        console.error('Popup auth error:', error);
        Alert.alert('Authentication Error', 'Failed to open authentication popup. Please try Direct Auth instead.');
      }
    } else {
      Alert.alert('Mobile Auth', 'Please implement mobile OAuth flow using WebView or deep linking.');
    }
  };

  const manualTokenAuth = () => {
    Alert.prompt(
      'Manual Token Entry',
      'Please enter your Spotify access token. You can get this from:\n\n1. Go to https://developer.spotify.com/console/get-playlist/\n2. Click "Get Token"\n3. Select the required scopes\n4. Copy the token and paste it here',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Connect',
          onPress: (token) => {
            if (token && token.trim()) {
              handleSpotifyCallback(token.trim());
            } else {
              Alert.alert('Invalid Token', 'Please enter a valid Spotify access token.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
    setIsAuthenticated(true);
    setShowPlayer(true);
    
          // Set demo track
      setCurrentTrack({
        id: 'demo-track',
        name: 'Demo Track - Focus Music',
        artist: 'KindFrame Demo',
        album: 'Demo Album',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 180000, // 3 minutes
        uri: 'spotify:track:demo',
      });
    
    setProgress(45000); // 45 seconds
    setDuration(180000);
    setIsPlaying(true);
    
    Alert.alert('Demo Mode Enabled', 'You can now test the music player interface. This is a demo with simulated playback.');
  };

  const handleSpotifyCallback = async (token: string) => {
    try {
      // Validate the token first
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      await AsyncStorage.setItem('spotify_access_token', token);
      setAccessToken(token);
      setIsAuthenticated(true);
      initializeSpotifyPlayer();
      Alert.alert('Success', 'Spotify account connected successfully!');
    } catch (error) {
      console.error('Error saving Spotify token:', error);
      Alert.alert('Error', 'Failed to validate or save authentication token. Please check your token and try again.');
    }
  };

  // Handle URL hash fragment for token extraction (for direct navigation fallback)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const token = hash.substring(1).split('&').find(param => param.startsWith('access_token='))?.split('=')[1];
        if (token) {
          // Clear the hash from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          handleSpotifyCallback(token);
        }
      }
    }
  }, []);

  // Handle return from Spotify auth
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const returnUrl = sessionStorage.getItem('spotify_auth_return_url');
              // Check for malformed URL before comparing
        const malformedUrl = 'www.googleapis.com/auth/drive.readonly%20https://www.googleapis.com/auth/drive.metadata.readonly';
        if (window.location.href.includes(malformedUrl)) {
          console.error('🔍 MALFORMED URL DETECTED in Spotify return check:', window.location.href);
          alert('Malformed URL Detected: The OAuth URL is malformed. This indicates a scope encoding issue.');
          return;
        }
        
        if (returnUrl && window.location.href !== returnUrl) {
        sessionStorage.removeItem('spotify_auth_return_url');
        // We're back from auth, check for token
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const token = hash.substring(1).split('&').find(param => param.startsWith('access_token='))?.split('=')[1];
          if (token) {
            window.history.replaceState({}, document.title, returnUrl);
            handleSpotifyCallback(token);
          }
        }
      }
    }
  }, []);

  const disconnectSpotify = async () => {
    try {
      await AsyncStorage.removeItem('spotify_access_token');
      setAccessToken(null);
      setIsAuthenticated(false);
      setCurrentTrack(null);
      setCurrentPlaylist(null);
      setShowPlayer(false);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      Alert.alert('Disconnected', 'Spotify account has been disconnected.');
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
    }
  };

  const fetchPlaylist = async (playlistId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Parse tracks from the Spotify API response structure
        const tracks: SpotifyTrack[] = data.tracks.items
          .filter((item: any) => item.track && !item.track.is_local) // Filter out local files
          .map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0]?.name || 'Unknown Artist',
            album: item.track.album?.name || 'Unknown Album',
            albumArt: item.track.album?.images[0]?.url || '',
            duration: item.track.duration_ms,
            uri: item.track.uri,
            popularity: item.track.popularity || 0,
            previewUrl: item.track.preview_url,
          }));

        setCurrentPlaylist({
          id: data.id,
          name: data.name,
          tracks,
        });
        setShowPlayer(true);
        
        // Set the first track as current if available
        if (tracks.length > 0) {
          setCurrentTrack(tracks[0]);
          setDuration(tracks[0].duration);
        }
        
        Alert.alert('Playlist Loaded', `Successfully loaded "${data.name}" with ${tracks.length} tracks.`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      Alert.alert('Error', 'Failed to load playlist. Please check your token and try again.');
    }
  };

  const loadSamplePlaylist = () => {
    // Load the lofi chill playlist data
    const lofiChillTracks: SpotifyTrack[] = [
      {
        id: '1',
        name: 'Ripple',
        artist: 'Indigo Songs',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 180000, // 3 minutes
        uri: 'spotify:track:1',
        popularity: 85,
        previewUrl: null,
      },
      {
        id: '2',
        name: 'coconut kisses',
        artist: 'Nice Gii',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 195000, // 3:15
        uri: 'spotify:track:2',
        popularity: 82,
        previewUrl: null,
      },
      {
        id: '3',
        name: 'Shadows',
        artist: 'Mellow Mirror',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 210000, // 3:30
        uri: 'spotify:track:3',
        popularity: 78,
        previewUrl: null,
      },
      {
        id: '4',
        name: 'serendipity',
        artist: 'haywrd',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 165000, // 2:45
        uri: 'spotify:track:4',
        popularity: 80,
        previewUrl: null,
      },
      {
        id: '5',
        name: 'a place both wonderful & strange',
        artist: 'olbejom',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 225000, // 3:45
        uri: 'spotify:track:5',
        popularity: 75,
        previewUrl: null,
      },
      {
        id: '6',
        name: 'Locked Out',
        artist: 'Nova Night',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 180000, // 3:00
        uri: 'spotify:track:6',
        popularity: 73,
        previewUrl: null,
      },
      {
        id: '7',
        name: 'Road 0679',
        artist: 'Mellow Melt',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 195000, // 3:15
        uri: 'spotify:track:7',
        popularity: 70,
        previewUrl: null,
      },
      {
        id: '8',
        name: 'Twilight',
        artist: 'Haku-San',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 210000, // 3:30
        uri: 'spotify:track:8',
        popularity: 68,
        previewUrl: null,
      },
      {
        id: '9',
        name: 'soaring summer',
        artist: 'Fya Playce',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 180000, // 3:00
        uri: 'spotify:track:9',
        popularity: 72,
        previewUrl: null,
      },
      {
        id: '10',
        name: 'Idle',
        artist: 'Moodal',
        album: 'lofi chill',
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        duration: 195000, // 3:15
        uri: 'spotify:track:10',
        popularity: 65,
        previewUrl: null,
      },
    ];

    setCurrentPlaylist({
      id: '37i9dQZF1DWYoYGBbGKurt',
      name: 'lofi chill',
      tracks: lofiChillTracks,
    });
    setShowPlayer(true);
    
    // Set the first track as current
    setCurrentTrack(lofiChillTracks[0]);
    setDuration(lofiChillTracks[0].duration);
    
    Alert.alert('Lofi Chill Playlist Loaded', 'Loaded the lofi chill playlist with 10 tracks for relaxing moments.');
  };

  const playTrack = async (trackUri: string) => {
    console.log('playTrack called with:', trackUri);
    
    // Find the track in the current playlist
    const track = currentPlaylist?.tracks.find(t => t.uri === trackUri);
    if (!track) {
      console.log('Track not found in playlist');
      Alert.alert('Error', 'Track not found in playlist.');
      return;
    }

    console.log('Playing track:', track.name);

    // Set as current track
    setCurrentTrack(track);
    setDuration(track.duration);
    setProgress(0);
    setIsPlaying(true);

    // Try to play the track using Spotify Web Playback SDK if available
    if (accessToken && playerRef.current && window.Spotify) {
      try {
        console.log('Attempting Spotify SDK playback');
        await playerRef.current.resume();
        await playerRef.current.play({
          uris: [trackUri]
        });
        
        // Start progress tracking
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        progressIntervalRef.current = setInterval(async () => {
          try {
            const state = await playerRef.current?.getCurrentState();
            if (state && state.track_window.current_track) {
              setProgress(state.position);
              setDuration(state.duration);
              setIsPlaying(!state.paused);
            }
          } catch (error) {
            console.error('Error updating progress:', error);
            // Continue with simulated progress if API fails
            setProgress(prev => Math.min(prev + 1000, track.duration));
          }
        }, 1000);
        
        Alert.alert('Playing', `Now playing: ${track.name} by ${track.artist}`);
      } catch (sdkError) {
        console.error('Spotify SDK error:', sdkError);
        // Fallback to simulated playback
        Alert.alert('Spotify Service Unavailable', 
          'Spotify services are currently unavailable. Using demo mode for this track.');
        startSimulatedPlayback(track);
      }
    } else {
      // Demo mode - use simulated playback
      console.log('Using simulated playback (demo mode)');
      startSimulatedPlayback(track);
    }
  };

  const startSimulatedPlayback = (track: SpotifyTrack) => {
    console.log('Starting simulated playback for:', track.name);
    // Simulate playback for demo mode or when Spotify is down
    setProgress(0);
    setIsPlaying(true);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1000;
        if (newProgress >= track.duration) {
          // Auto-advance to next track when current finishes
          if (currentPlaylist) {
            const currentIndex = currentPlaylist.tracks.findIndex(t => t.id === track.id);
            const nextIndex = (currentIndex + 1) % currentPlaylist.tracks.length;
            const nextTrack = currentPlaylist.tracks[nextIndex];
            setTimeout(() => playTrack(nextTrack.uri), 1000);
          }
          return 0;
        }
        return newProgress;
      });
    }, 1000);
    
    Alert.alert('Demo Mode', `Simulating playback of: ${track.name} by ${track.artist}`);
  };

  const togglePlayPause = async () => {
    console.log('togglePlayPause called, isPlaying:', isPlaying);
    
    // Check if we have a current track (either from Spotify or demo)
    if (!currentTrack) {
      console.log('No current track available');
      Alert.alert('No Track', 'Please load a playlist first.');
      return;
    }

    // If we have Spotify connection, try to use it
    if (accessToken && playerRef.current) {
      try {
        if (isPlaying) {
          // Pause
          console.log('Attempting to pause');
          try {
            await playerRef.current.pause();
            setIsPlaying(false);
            Alert.alert('Paused', 'Playback paused.');
          } catch (sdkError) {
            console.error('Spotify SDK pause error:', sdkError);
            setIsPlaying(false);
            Alert.alert('Paused', 'Playback paused (demo mode).');
          }
        } else {
          // Resume
          console.log('Attempting to resume');
          try {
            await playerRef.current.resume();
            setIsPlaying(true);
            Alert.alert('Playing', 'Playback resumed.');
          } catch (sdkError) {
            console.error('Spotify SDK resume error:', sdkError);
            setIsPlaying(true);
            Alert.alert('Playing', 'Playback resumed (demo mode).');
          }
        }
      } catch (error) {
        console.error('Error toggling play/pause:', error);
        Alert.alert('Playback Error', 'Failed to control playback. Please try again.');
      }
    } else {
      // Demo mode - just toggle the playing state
      console.log('Using demo mode for play/pause');
      setIsPlaying(!isPlaying);
      Alert.alert(
        isPlaying ? 'Paused' : 'Playing', 
        isPlaying ? 'Playback paused (demo mode).' : 'Playback resumed (demo mode).'
      );
    }
  };

  const skipToNext = async () => {
    console.log('skipToNext called');
    
    if (!currentPlaylist || !currentTrack) {
      console.log('No playlist or current track');
      Alert.alert('No Playlist', 'Please load a playlist first.');
      return;
    }

    const currentIndex = currentPlaylist.tracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % currentPlaylist.tracks.length;
    const nextTrack = currentPlaylist.tracks[nextIndex];
    
    console.log('Skipping to next track:', nextTrack.name);
    await playTrack(nextTrack.uri);
  };

  const skipToPrevious = async () => {
    console.log('skipToPrevious called');
    
    if (!currentPlaylist || !currentTrack) {
      console.log('No playlist or current track');
      Alert.alert('No Playlist', 'Please load a playlist first.');
      return;
    }

    const currentIndex = currentPlaylist.tracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? currentPlaylist.tracks.length - 1 : currentIndex - 1;
    const prevTrack = currentPlaylist.tracks[prevIndex];
    
    console.log('Skipping to previous track:', prevTrack.name);
    await playTrack(prevTrack.uri);
  };

  const toggleShuffle = async () => {
    console.log('toggleShuffle called, current state:', isShuffleOn);
    
    // Toggle shuffle state regardless of Spotify connection
    const newShuffleState = !isShuffleOn;
    setIsShuffleOn(newShuffleState);
    
    // Try Spotify SDK if available
    if (accessToken && playerRef.current) {
      try {
        await playerRef.current.setShuffle(newShuffleState);
        Alert.alert('Shuffle', newShuffleState ? 'Shuffle enabled.' : 'Shuffle disabled.');
      } catch (sdkError) {
        console.error('Spotify SDK shuffle error:', sdkError);
        Alert.alert('Shuffle', newShuffleState ? 'Shuffle enabled (demo mode).' : 'Shuffle disabled (demo mode).');
      }
    } else {
      Alert.alert('Shuffle', newShuffleState ? 'Shuffle enabled (demo mode).' : 'Shuffle disabled (demo mode).');
    }
  };

  const toggleRepeat = async () => {
    console.log('toggleRepeat called, current mode:', repeatMode);
    
    let newRepeatMode: 'off' | 'track' | 'context';
    
    switch (repeatMode) {
      case 'off':
        newRepeatMode = 'context';
        break;
      case 'context':
        newRepeatMode = 'track';
        break;
      case 'track':
        newRepeatMode = 'off';
        break;
      default:
        newRepeatMode = 'off';
    }
    
    setRepeatMode(newRepeatMode);
    
    // Try Spotify SDK if available
    if (accessToken && playerRef.current) {
      try {
        await playerRef.current.setRepeat(newRepeatMode);
        
        const modeText = newRepeatMode === 'off' ? 'Repeat disabled' : 
                        newRepeatMode === 'track' ? 'Repeat track' : 'Repeat playlist';
        Alert.alert('Repeat', modeText);
      } catch (sdkError) {
        console.error('Spotify SDK repeat error:', sdkError);
        
        const modeText = newRepeatMode === 'off' ? 'Repeat disabled (demo mode)' : 
                        newRepeatMode === 'track' ? 'Repeat track (demo mode)' : 'Repeat playlist (demo mode)';
        Alert.alert('Repeat', modeText);
      }
    } else {
      const modeText = newRepeatMode === 'off' ? 'Repeat disabled (demo mode)' : 
                      newRepeatMode === 'track' ? 'Repeat track (demo mode)' : 'Repeat playlist (demo mode)';
      Alert.alert('Repeat', modeText);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadUserPlaylists = async () => {
    try {
      const saved = await AsyncStorage.getItem('userPlaylists');
      if (saved) {
        setUserPlaylists(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading user playlists:', error);
    }
  };

  const saveUserPlaylists = async (playlists: UserPlaylist[]) => {
    try {
      await AsyncStorage.setItem('userPlaylists', JSON.stringify(playlists));
    } catch (error) {
      console.error('Error saving user playlists:', error);
    }
  };

  const extractSpotifyId = (url: string): { id: string; type: 'playlist' | 'album' | 'track' } | null => {
    const patterns = [
      /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /spotify\.com\/album\/([a-zA-Z0-9]+)/,
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = url.match(patterns[i]);
      if (match) {
        const types = ['playlist', 'album', 'track'] as const;
        return { id: match[1], type: types[i] };
      }
    }
    return null;
  };

  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl.trim() || !newPlaylistTitle.trim()) {
      Alert.alert('Error', 'Please enter both title and Spotify URL');
      return;
    }

    const spotifyData = extractSpotifyId(newPlaylistUrl);
    if (!spotifyData) {
      Alert.alert('Error', 'Please enter a valid Spotify playlist, album, or track URL');
      return;
    }

    const embedUrl = `https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator`;
    
    const newPlaylist: UserPlaylist = {
      id: Date.now().toString(),
      title: newPlaylistTitle.trim(),
      url: embedUrl,
      height: 352,
      type: spotifyData.type,
    };

    const updatedPlaylists = [...userPlaylists, newPlaylist];
    setUserPlaylists(updatedPlaylists);
    await saveUserPlaylists(updatedPlaylists);

    setNewPlaylistUrl('');
    setNewPlaylistTitle('');
    setShowAddForm(false);
    
    Alert.alert('Success', 'Your playlist has been added!');
  };

  const handleRemovePlaylist = async (id: string) => {
    Alert.alert(
      'Remove Playlist',
      'Are you sure you want to remove this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedPlaylists = userPlaylists.filter(p => p.id !== id);
            setUserPlaylists(updatedPlaylists);
            await saveUserPlaylists(updatedPlaylists);
          },
        },
      ]
    );
  };

  const renderPlaylist = (playlist: any, isUserPlaylist = false) => (
    <View key={playlist.id || playlist.url} style={styles.playlistSection}>
      <View style={styles.playlistHeader}>
        <Text style={[styles.header, { color: colors.text }]}>{playlist.title}</Text>
        {isUserPlaylist && (
          <TouchableOpacity
            onPress={() => handleRemovePlaylist(playlist.id)}
            style={[styles.removeButton, { backgroundColor: '#ef4444' }]}
          >
            <Text style={[styles.removeButtonText, { color: colors.buttonText }]}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      {Platform.OS === 'web' ? (
        <iframe
          title={playlist.title}
          style={{ borderRadius: 12, width: '100%', height: playlist.height, border: 0 }}
          src={playlist.url}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : (
        <View style={[styles.webviewContainer, { height: playlist.height }]}>
          <Text style={[styles.webviewPlaceholder, { color: colors.textSecondary }]}>
            Spotify embed not available on mobile
          </Text>
        </View>
      )}
    </View>
  );

  const renderMusicPlayer = () => (
    <View style={styles.musicPlayer}>
      {/* Now Playing Section */}
      <View style={[styles.nowPlayingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.nowPlayingHeader}>
          <Text style={[styles.nowPlayingTitle, { color: colors.text }]}>
            Now Playing
          </Text>
        </View>
        
        <View style={styles.nowPlayingContent}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: currentTrack?.albumArt || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center' }}
              style={styles.albumArt}
              resizeMode="cover"
            />
          </View>
          
          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, { color: colors.text }]} numberOfLines={1}>
              {currentTrack?.name || 'No track selected'}
            </Text>
            <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentTrack?.artist || 'Unknown Artist'}
            </Text>
            <Text style={[styles.albumName, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentTrack?.album || 'Unknown Album'}
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.timeInfo}>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(progress)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(duration)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: colors.primary,
                  width: `${(progress / duration) * 100}%` 
                }
              ]} 
            />
          </View>
        </View>
        
        {/* Playback Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isShuffleOn ? colors.primary : 'transparent' }]}
            onPress={() => {
              console.log('Shuffle button pressed');
              toggleShuffle();
            }}
          >
            <Text style={[styles.controlIcon, { color: isShuffleOn ? colors.buttonText : colors.textSecondary }]}>
              🔀
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              console.log('Previous button pressed');
              skipToPrevious();
            }}
          >
            <Text style={[styles.controlIcon, { color: colors.textSecondary }]}>
              ⏮️
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.playPauseButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              console.log('Play/Pause button pressed');
              togglePlayPause();
            }}
          >
            <Text style={[styles.playPauseIcon, { color: colors.buttonText }]}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              console.log('Next button pressed');
              skipToNext();
            }}
          >
            <Text style={[styles.controlIcon, { color: colors.textSecondary }]}>
              ⏭️
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: repeatMode !== 'off' ? colors.primary : 'transparent' }]}
            onPress={() => {
              console.log('Repeat button pressed');
              toggleRepeat();
            }}
          >
            <Text style={[styles.controlIcon, { color: repeatMode !== 'off' ? colors.buttonText : colors.textSecondary }]}>
              🔁
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Playlist Section */}
      {currentPlaylist && (
        <View style={styles.playlistSection}>
          <View style={styles.playlistHeader}>
            <Text style={[styles.playlistTitle, { color: colors.text }]}>
              {currentPlaylist.name}
            </Text>
            <Text style={[styles.trackCount, { color: colors.textSecondary }]}>
              {currentPlaylist.tracks.length} tracks
            </Text>
          </View>
          
          <ScrollView style={styles.trackList} showsVerticalScrollIndicator={false}>
            {currentPlaylist.tracks.map((track, index) => (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.trackItem,
                  { 
                    backgroundColor: currentTrack?.id === track.id ? colors.primary + '20' : 'transparent',
                    borderColor: colors.border 
                  }
                ]}
                onPress={() => {
                  console.log('Track clicked:', track.name);
                  playTrack(track.uri);
                }}
              >
                <Image
                  source={{ uri: track.albumArt }}
                  style={styles.trackAlbumArt}
                  resizeMode="cover"
                />
                <View style={styles.trackDetails}>
                  <Text style={[styles.trackItemName, { color: colors.text }]} numberOfLines={1}>
                    {track.name}
                  </Text>
                  <Text style={[styles.trackItemArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
                <Text style={[styles.trackDuration, { color: colors.textSecondary }]}>
                  {formatTime(track.duration)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>  
      <TopBar title="Music" onBack={() => handleBack()} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Spotify Authentication */}
        {!isAuthenticated ? (
          <View style={styles.authSection}>
            <Text style={[styles.authTitle, { color: colors.text }]}>
              Connect Your Spotify Account
            </Text>
            <Text style={[styles.authDescription, { color: colors.textSecondary }]}>
              Connect your Spotify account to stream music directly in the app with full playback controls.
            </Text>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.primary }]}
              onPress={authenticateSpotify}
            >
              <Text style={[styles.authButtonText, { color: colors.buttonText }]}>
                Connect Spotify
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={enableDemoMode}
            >
              <Text style={[styles.demoButtonText, { color: colors.textSecondary }]}>
                Try Demo Mode
              </Text>
            </TouchableOpacity>
            <Text style={[styles.authNote, { color: colors.textSecondary }]}>
              Note: If authentication fails due to browser restrictions, try allowing popups for this site or use Demo Mode.
            </Text>
          </View>
        ) : (
          <>
            {/* Spotify Connection Status */}
            <View style={[styles.connectionStatus, { backgroundColor: colors.surface }]}>
              <Text style={[styles.connectionText, { color: colors.text }]}>
                ✓ Connected to Spotify
              </Text>
              <View style={styles.connectionButtons}>
                <TouchableOpacity
                  style={[styles.loadSampleButton, { backgroundColor: colors.primary }]}
                  onPress={loadSamplePlaylist}
                >
                  <Text style={[styles.loadSampleButtonText, { color: colors.buttonText }]}>
                    Load Lofi Chill
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.disconnectButton, { backgroundColor: '#ef4444' }]}
                  onPress={disconnectSpotify}
                >
                  <Text style={[styles.disconnectButtonText, { color: colors.buttonText }]}>
                    Disconnect
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Music Player */}
            {showPlayer && renderMusicPlayer()}

            {/* Add Your Own Section */}
            <View style={styles.addSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Your Own</Text>
              {!showAddForm ? (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddForm(true)}
                >
                  <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ Add Playlist/Album/Track</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.addForm, { backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border 
                    }]}
                    placeholder="Enter playlist title"
                    placeholderTextColor={colors.textSecondary}
                    value={newPlaylistTitle}
                    onChangeText={setNewPlaylistTitle}
                  />
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border 
                    }]}
                    placeholder="Paste Spotify URL (playlist, album, or track)"
                    placeholderTextColor={colors.textSecondary}
                    value={newPlaylistUrl}
                    onChangeText={setNewPlaylistUrl}
                    multiline
                  />
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                      onPress={() => {
                        setShowAddForm(false);
                        setNewPlaylistUrl('');
                        setNewPlaylistTitle('');
                      }}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: colors.primary }]}
                      onPress={handleAddPlaylist}
                    >
                      <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* User Playlists */}
            {userPlaylists.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Playlists</Text>
                {userPlaylists.map(playlist => (
                  <View key={playlist.id}>
                    {renderPlaylist(playlist, true)}
                  </View>
                ))}
              </View>
            )}

            {/* Default Playlists */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Curated for You</Text>
                              {defaultPlaylists.map(playlist => (
                  <View key={playlist.id}>
                    {renderPlaylist(playlist)}
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  authSection: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  authDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  authButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  authNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  connectionStatus: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  connectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  loadSampleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  loadSampleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  musicPlayer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nowPlayingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  nowPlayingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nowPlayingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  albumArtContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    marginBottom: 2,
  },
  albumName: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeText: {
    fontSize: 12,
    minWidth: 35,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 24,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: {
    fontSize: 24,
  },
  trackList: {
    maxHeight: 300,
  },
  playlistSection: {
    marginBottom: 24,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  trackCount: {
    fontSize: 14,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  trackAlbumArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
  },
  trackItemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackItemArtist: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 12,
  },
  addSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  webviewContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  webviewPlaceholder: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 