import { MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width, height } = Dimensions.get('window');

function formatTime(ms: number | null | undefined) {
  if (!ms && ms !== 0) return '00:00';
  const total = Math.floor((ms ?? 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VideoPlayer({
  uri,
  poster,
  isActive,
}: {
  uri: string;
  poster?: string;
  isActive: boolean;
}) {
  // Инициализация плеера
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    if (isActive) {
      player.play();
    }
  });


  const [isPlaying, setIsPlaying] = useState<boolean>(isActive);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showPoster, setShowPoster] = useState<boolean>(!!poster);

  const [ended, setEnded] = useState(false);

  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<number | null>(null);
  const barWidthRef = useRef<number>(0);

  useEffect(() => {
    if (!player) return;

    const normalizePlaying = (e: any) =>
      typeof e === 'boolean' ? e : (e.playing ?? e.isPlaying ?? false);

    const getCurrentFromEvent = (e: any) =>
      e == null ? null : (e.currentTime ?? e.position ?? e.playbackTime ?? null);

    const maybeSetDurationFromPlayer = () => {
      try {
        if (player.duration && durationRef.current === 0) {
          const dur = typeof player.duration === 'number' ? player.duration * 1000 : 0;
          if (dur > 0) {
            setDuration(dur);
            durationRef.current = dur;
          }
        }
      } catch {}
    };

    const durationRef = { current: duration };

    const s1 = player.addListener('playingChange', (e: any) => {
      const playing = normalizePlaying(e);
      setIsPlaying(playing);
      if (playing) setShowPoster(false);
    });

    const s2 = player.addListener('timeUpdate', (e: any) => {
      const ct = getCurrentFromEvent(e);
      if (ct != null) {
        setPosition(Math.floor(ct * 1000));
      }
      maybeSetDurationFromPlayer();
    });

    const s3 = player.addListener('statusChange', (e: any) => {
      const durFromEvent = e?.duration ?? e?.durationMillis ?? null;
      if (durFromEvent) {
        const durMs = durFromEvent > 1000 ? durFromEvent : durFromEvent * 1000;
        setDuration(durMs);
        durationRef.current = durMs;
      } else {
        maybeSetDurationFromPlayer();
      }
    });

    const s4 = player.addListener('playToEnd', () => {
      setIsPlaying(false);
      setEnded(true); 
      showControls(true);
      if (player.duration) {
        try {
          const durMs = typeof player.duration === 'number' ? player.duration * 1000 : 0;
          if (durMs) setPosition(durMs);
        } catch {}
      }
    });

    let pollId: number | null = null;
    const startPolling = () => {
      if (pollId != null) return;
      pollId = setInterval(() => {
        try {
          const ct = (typeof (player as any).currentTime === 'number') ? (player as any).currentTime : null;
          if (ct != null) {
            setPosition(Math.floor(ct * 1000));
          }
          maybeSetDurationFromPlayer();
        } catch {}
      }, 500) as unknown as number;
    };
    const stopPolling = () => {
      if (pollId != null) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    try {
      if ((player as any).playing) startPolling();
    } catch { /* ignore */ }

    const s5 = player.addListener('playingChange', (e: any) => {
      const isP = normalizePlaying(e);
      if (isP) startPolling();
      else stopPolling();
    });

    return () => {
      s1?.remove?.();
      s2?.remove?.();
      s3?.remove?.();
      s4?.remove?.();
      s5?.remove?.();
      stopPolling();
    };
  }, [player]);

    useEffect(() => {
      if (isActive) {
        player.play();
        showControlsTemporarily();
      } else {
        player.pause();
        hideControlsImmediate();
      }
      return () => clearHideTimer();
  }, [isActive, player]);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const hideControls = (animated = true) => {
    clearHideTimer();
    setControlsVisible(false);
    if (animated) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  };

  const hideControlsImmediate = () => hideControls(false);

  const showControls = (withAutoHide = true) => {
    clearHideTimer();
    setControlsVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (withAutoHide) {
      hideTimer.current = setTimeout(() => {
        hideControls();
      }, 3000) as unknown as number;
    }
  };

  const showControlsTemporarily = () => showControls(true);

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls(true);
    }
  };

  const togglePlay = () => {
    if (ended) {
      player.currentTime = 0;
      setPosition(0);
      setEnded(false);
      player.play();
      setShowPoster(false);
      showControls(true);
      return;
    }
    if (player.playing) {
      player.pause();
    } else {
      player.play();
      setShowPoster(false);
      showControls(true);
    }
  };

  const seekTo = (percent: number) => {
    if (!duration) return;
    const ms = duration * percent;
    player.currentTime = ms / 1000; 
    setPosition(ms);
    setEnded(false);
    showControls(true);
  };

  const onBarPress = (evt: any) => {
    if (!barWidthRef.current) return;
    const x = evt.nativeEvent.locationX;
    const p = Math.max(0, Math.min(1, x / barWidthRef.current));
    seekTo(p);
  };


  return (
      <View style={styles.container}>
        
        <VideoView
          player={player}
          style={styles.fullscreenMedia}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={true} 
          allowsPictureInPicture={true}
        />

        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={toggleControls}
        >
          <View style={{flex: 1}} />
        </Pressable>

        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[
            styles.controlsOverlay,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.centerButtonContainer}>
              <TouchableOpacity activeOpacity={0.7} onPress={togglePlay}>
                  <MaterialIcons
                    name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
                    size={80}
                    color={isPlaying ? 'rgba(161, 247, 250, 0.78)' : '#ffffffcc'}

                  />
              </TouchableOpacity>
          </View>

          <View style={styles.bottomControlsContainer}>
            <View style={styles.controlsRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>

              <Pressable
                style={styles.progressContainer}
                onLayout={(e) => (barWidthRef.current = e.nativeEvent.layout.width)}
                onPress={onBarPress}
                hitSlop={{top: 10, bottom: 10}} 
              >
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width:
                          barWidthRef.current && duration
                            ? barWidthRef.current * (position / Math.max(duration, 1))
                            : 0,
                      },
                    ]}
                  />
                </View>
              </Pressable>

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fullscreenMedia: {
    width: width,
    height: height,
  },
  
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'space-between',
  },

  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#db0000ff',
  },

  bottomControlsContainer: {
    width: '100%',
    // paddingBottom: 40, 
    paddingHorizontal: 20,
    backgroundColor: 'transparent', 
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  timeText: {
    color: '#fff',
    width: 50,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 12,
    height: 30, 
    justifyContent: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(185, 172, 172, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ada89aff',
  },
});