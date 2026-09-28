import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack } from 'agora-rtc-sdk-ng';

const TOKEN_ENDPOINT = 'https://aletwend-render-backend.onrender.com/api/calls/token';
const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

interface CallTokenResponse {
  token: string;
  appId: string;
  expiresAt?: number;
}

export interface ActiveCall {
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

export type RemoteAudioListener = () => void;

export async function fetchCallToken(channelName: string, uid: string): Promise<CallTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, uid }),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch call token (${response.status})`);
  }

  return response.json() as Promise<CallTokenResponse>;
}

const DIAGNOSTIC_APP_ID = '658f442c574f46268983e329b6515626';
const DIAGNOSTIC_CHANNEL = 'diagnostic-test-1';
const DIAGNOSTIC_TOKEN = '007eJxTYHjQtb1rteabue9d15QcMXvmK2EZktopp/HJY9mhDJP7EroKDGamFmkmJkbJpuYmaSZmRmYWlhbGqcZGlklmpoamQP6kl7uyGgIZGV5J2jEyMkAgiC/EkJKZmJ6XX1ySmaxbklpcomuowMAAAC6eI74=';

export async function joinCall(
  channelName: string,
  uid: string,
  onRemoteAudio?: RemoteAudioListener,
): Promise<ActiveCall> {
  const tokenResponse = await fetchCallToken(channelName, uid);
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const localAudioTrack: ILocalAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  let left = false;

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
      onRemoteAudio?.();
    }
  });

  try {
    await client.join(tokenResponse.appId || appId || '', channelName, tokenResponse.token, uid);
    await client.publish([localAudioTrack]);
  } catch (error) {
    localAudioTrack.close();
    await client.leave();
    throw error;
  }

  return {
    setMuted: async (muted: boolean) => {
      await localAudioTrack.setEnabled(!muted);
    },
    leave: async () => {
      if (left) return;
      left = true;
      localAudioTrack.close();
      await client.leave();
    },
  };
}

export async function joinDiagnosticCall(
  onRemoteAudio?: RemoteAudioListener,
): Promise<ActiveCall> {
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const localAudioTrack: ILocalAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  let left = false;

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
      onRemoteAudio?.();
    }
  });

  try {
    await client.join(DIAGNOSTIC_APP_ID, DIAGNOSTIC_CHANNEL, DIAGNOSTIC_TOKEN, null);
    await client.publish([localAudioTrack]);
  } catch (error) {
    localAudioTrack.close();
    await client.leave();
    throw error;
  }

  return {
    setMuted: async (muted: boolean) => {
      await localAudioTrack.setEnabled(!muted);
    },
    leave: async () => {
      if (left) return;
      left = true;
      localAudioTrack.close();
      await client.leave();
    },
  };
}

export const AGORA_APP_ID = appId;

void AGORA_APP_ID;

export default joinCall;
