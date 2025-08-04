'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://next-videocall-backend.vercel.app');

export default function Receiver() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const remoteSocketId = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:your.turn.server:3478',
            username: 'user',
            credential: 'pass',
          },
        ],
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        });
      } catch (err) {
        console.error('Could not access camera/mic:', err);
      }

      socket.emit('join-room', { roomId: 'room1' });

      socket.on('offer', async ({ from, offer }) => {
        remoteSocketId.current = from;
        if (pc.current) {
          pc.current.onnegotiationneeded = async () => {
            try {
              const offer = await pc.current!.createOffer();
              await pc.current!.setLocalDescription(offer);
              socket.emit('offer', {
                to: remoteSocketId, // dynamically store this when user joins
                offer,
              });
              console.log('Sent offer via negotiationneeded');
            } catch (err) {
              console.error('Negotiation error:', err);
            }
          };
        }
      });

      socket.on('ice-candidate', async ({ candidate }) => {
        try {
          await pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ice candidate:', e);
        }
      });

      pc.current.onicecandidate = (event) => {
        if (event.candidate && remoteSocketId.current) {
          socket.emit('ice-candidate', {
            to: remoteSocketId.current,
            candidate: event.candidate,
          });
        }
      };

      pc.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
    };

    init();
  }, []);

  return (
    <div className="p-10">
      <h2>Receiver</h2>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        width={300}
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        width={300}
      />
    </div>
  );
}
